from concurrent.futures import ThreadPoolExecutor
from unittest.mock import Mock

import pytest
import requests

import app as server
from services.cache import TTLCache
from services.errors import ServiceUnavailable
from services.geo_utils import format_address, haversine_distance_km, safe_http_url
from services.intent_parser import CATEGORY_KEYWORDS, CATEGORY_PLURALS, IntentParser
from services.nominatim_client import NominatimClient
from services.overpass_client import CATEGORY_FILTERS, OverpassClient
from services.wiki_client import WikiClient


def response(payload, status=200):
    result = Mock(status_code=status)
    result.json.return_value = payload
    if status >= 400:
        result.raise_for_status.side_effect = requests.HTTPError()
    return result


def element(identity=1, name="Sample Park", lat=51.501, lon=-0.12, osm_type="node", **tags):
    item = {"id": identity, "type": osm_type, "tags": {"name": name, "leisure": "park", **tags}}
    point = {"lat": lat, "lon": lon}
    item.update(point if osm_type == "node" else {"center": point})
    return item


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(server.photon_client, 'geocode', Mock(side_effect=ServiceUnavailable('fallback unavailable')))
    monkeypatch.setattr(server.photon_client, 'search_places', Mock(side_effect=ServiceUnavailable('fallback unavailable')))
    return server.app.test_client()


@pytest.fixture
def search(monkeypatch):
    geocoder = Mock(return_value={"label": "London", "lat": 51.5, "lon": -0.12})
    places = OverpassClient()
    monkeypatch.setattr("services.overpass_client.requests.post", lambda *a, **k: response({"elements": [element(wikipedia="en:Sample Park")]}))
    monkeypatch.setattr(server.nominatim_client, "geocode", geocoder)
    monkeypatch.setattr(server.nominatim_client, "search_pois", Mock(return_value=[]))
    monkeypatch.setattr(server, "overpass_client", places)
    monkeypatch.setattr(server.wiki_client, "fetch_summary", Mock(return_value=("Linked article", "https://en.wikipedia.org/wiki/Sample_Park")))
    return geocoder


@pytest.mark.parametrize("payload", [None, [], "hello", 4, {}, {"message": " "}, {"message": []}, {"message": "a" * 1001}])
def test_reject_invalid_messages(client, payload):
    result = client.post("/api/chat", json=payload)
    assert result.status_code == 400
    assert result.json["status"] == "error"
    assert result.json["attribution"]


@pytest.mark.parametrize("point", [False, [], {}, {"lat": "51", "lon": 0}, {"lat": True, "lon": 0},
    {"lat": 91, "lon": 0}, {"lat": 0, "lon": -181}, {"lat": float("nan"), "lon": 0},
    {"lat": float("inf"), "lon": 0}, {"lat": None, "lon": 0}, {"lat": 10 ** 1000, "lon": 0}])
def test_reject_invalid_device_coordinates(client, point):
    result = client.post("/api/chat", json={"message": "parks near me", "user_location": point})
    assert result.status_code == 400


@pytest.mark.parametrize("context", [False, [], {}, {"lat": 0, "lon": 0},
    {"lat": 0, "lon": 0, "location_name": [], "category": "park"},
    {"lat": 0, "lon": 0, "location_name": "London", "category": []},
    {"lat": 0, "lon": 0, "location_name": "London", "category": "spaceship"}])
def test_reject_invalid_context(client, context):
    result = client.post("/api/chat", json={"message": "cafes instead", "last_context": context})
    assert result.status_code == 400


@pytest.mark.parametrize("pending", [[], False, "spaceship", {}])
def test_reject_invalid_pending_category(client, pending):
    assert client.post("/api/chat", json={"message": "London", "pending_category": pending}).status_code == 400


def test_http_errors_are_json_and_not_cached(client):
    assert client.post("/api/chat", data="{", content_type="application/json").status_code == 400
    large = client.post("/api/chat", json={"message": "x" * 20000})
    assert large.status_code == 413
    assert large.json["status"] == "error"
    assert large.headers["Cache-Control"] == "no-store"
    assert client.get("/api/chat").status_code == 405
    assert client.get("/api/missing").json["status"] == "error"


def test_ready_followup_and_cache_do_not_lose_article_tags(client, search):
    first = client.post("/api/chat", json={"message": "parks in London"}).json
    assert first["status"] == "ready"
    assert first["places"][0]["rank"] == 1
    assert first["places"][0]["wiki_summary"] == "Linked article"
    assert "wikipedia_tag" not in first["places"][0]
    second = client.post("/api/chat", json={"message": "parks instead", "last_context": first["context"]}).json
    assert second['places'] == first['places']
    assert second['context'] == first['context']
    assert second['status'] == first['status']
    assert search.call_count == 1
    assert server.wiki_client.fetch_summary.call_args.kwargs["wikipedia_tag"] == "en:Sample Park"


@pytest.mark.parametrize("category", CATEGORY_KEYWORDS)
def test_all_supported_categories_complete(client, search, category):
    result = client.post("/api/chat", json={"message": f"{CATEGORY_PLURALS[category]} in London"})
    assert result.status_code == 200
    assert result.json["status"] == "ready"
    assert result.json["context"]["category"] == category
    assert bool(result.json["safety_notice"]) == (category in ("hospital", "pharmacy"))


def test_location_clarification_remembers_category(client, search):
    pending = client.post("/api/chat", json={"message": "pharmacies near me"}).json
    assert pending["status"] == "needs_location"
    assert pending["safety_notice"]
    result = client.post("/api/chat", json={"message": "in London", "pending_category": pending["category"]}).json
    assert result["status"] == "ready"
    assert result["context"]["category"] == "pharmacy"


def test_device_search_does_not_geocode(client, search):
    data = client.post("/api/chat", json={"message": "parks near me", "user_location": {"lat": 51.5, "lon": -0.12}}).json
    assert data["status"] == "ready"
    assert data["resolved_location"]["lat"] == 51.5
    search.assert_not_called()


def test_unknown_location_is_distinct_from_provider_failure(client, monkeypatch):
    monkeypatch.setattr(server.nominatim_client, "geocode", Mock(return_value=None))
    assert client.post("/api/chat", json={"message": "parks in Unknown"}).json["status"] == "location_not_found"
    monkeypatch.setattr(server.nominatim_client, "geocode", Mock(side_effect=ServiceUnavailable("Please retry")))
    result = client.post("/api/chat", json={"message": "hospitals in London"})
    assert result.status_code == 503
    assert result.json["status"] == "error"
    assert result.json["safety_notice"]


def test_no_results_and_outage_are_distinct(client, search, monkeypatch):
    monkeypatch.setattr(server.overpass_client, "search_places", Mock(return_value=[]))
    empty = client.post("/api/chat", json={"message": "parks in London"}).json
    assert empty["status"] == "no_results" and empty["places"] == []
    monkeypatch.setattr(server.overpass_client, "search_places", Mock(side_effect=ServiceUnavailable("busy")))
    assert client.post("/api/chat", json={"message": "parks in London"}).status_code == 503
    monkeypatch.setattr(server.nominatim_client, "search_pois", Mock(side_effect=ServiceUnavailable("busy")))
    assert client.post("/api/chat", json={"message": "parks in London"}).status_code == 503


def test_fallback_can_recover_primary_outage(client, search, monkeypatch):
    places = server.overpass_client.search_places("park", 51.5, -0.12, "London")
    monkeypatch.setattr(server.overpass_client, "search_places", Mock(side_effect=ServiceUnavailable("busy")))
    monkeypatch.setattr(server.nominatim_client, "search_pois", Mock(return_value=places))
    assert client.post("/api/chat", json={"message": "parks in London"}).json["status"] == "ready"


def test_completed_primary_empty_search_survives_optional_fallback_outage(client, search, monkeypatch):
    monkeypatch.setattr(server.overpass_client, "search_places", Mock(return_value=[]))
    monkeypatch.setattr(server.nominatim_client, "search_pois", Mock(side_effect=ServiceUnavailable("busy")))
    assert client.post("/api/chat", json={"message": "parks in London"}).json["status"] == "no_results"


def test_busy_searches_are_rejected_without_provider_work(client):
    for _ in range(4):
        server.search_slots.acquire()
    try:
        result = client.post("/api/chat", json={"message": "parks in London"})
        assert result.status_code == 503
        assert "busy" in result.json["reply"]
    finally:
        for _ in range(4):
            server.search_slots.release()


@pytest.mark.parametrize("message,expected", [
    ("museums in São Paulo?", "São Paulo"), ("cafes near 東京", "東京"),
    ("parks in St. John's, Canada", "St. John's, Canada"),
    ("places to eat in London", "London"), ("what about parks in Paris", "Paris"),
    ("nearby parks in London", "London"), ("in Paris", "Paris"),
])
def test_explicit_locations_override_context(message, expected):
    context = {"category": "park", "location_name": "Old city", "lat": 0, "lon": 0}
    parsed = IntentParser().parse_query(message, last_context=context)
    assert parsed["location_name"] == expected
    assert parsed["status"] == "ready"
    assert not parsed["is_near_me"]


@pytest.mark.parametrize("message", ["switch to cafes", "change to pharmacies", "parks instead", "libraries"])
def test_category_followups_preserve_location(message):
    parsed = IntentParser().parse_query(message, last_context={"location_name": "London", "category": "park"})
    assert parsed["location_name"] == "London"
    assert parsed["is_followup"]


def test_explicit_device_search_does_not_fall_back_to_old_city():
    parsed = IntentParser().parse_query("parks near me", last_context={"location_name": "London", "category": "park"})
    assert parsed["status"] == "needs_location"


@pytest.mark.parametrize("message", ["in London", "London"])
def test_pending_category_accepts_location(message):
    parsed = IntentParser().parse_query(message, pending_category="pharmacy")
    assert parsed["location_name"] == "London" and parsed["category"] == "pharmacy"


def test_category_mappings_match():
    assert CATEGORY_KEYWORDS.keys() == CATEGORY_FILTERS.keys() == CATEGORY_PLURALS.keys()


def test_cache_is_bounded_expires_and_does_not_share_mutable_objects(monkeypatch):
    clock = Mock(return_value=10.0)
    monkeypatch.setattr("services.cache.time.monotonic", clock)
    cache = TTLCache(ttl_seconds=10, max_entries=2)
    original = {"tags": ["article"]}
    cache.set("a", original)
    original["tags"].clear()
    cached = cache.get("a")
    cached["tags"].clear()
    assert cache.get("a")["tags"] == ["article"]
    cache.set("b", [])
    cache.set("c", [])
    assert cache.get("a") is None
    clock.return_value = 21.0
    assert cache.get("b") is None


def test_concurrent_cache_readers_are_isolated():
    cache = TTLCache()
    cache.set("places", [{"name": "Original"}])

    def reader(_):
        value = cache.get("places")
        value[0]["name"] = "Changed"

    with ThreadPoolExecutor(max_workers=4) as workers:
        list(workers.map(reader, range(100)))
    assert cache.get("places") == [{"name": "Original"}]


def test_overpass_preserves_branches_relations_radius_and_exact_cache_keys(monkeypatch):
    post = Mock(return_value=response({"elements": [
        element(1, "Same name"), element(2, "Same name", lat=51.502),
        element(3, osm_type="relation"), element(4, lat=52),
        element(5, lat="invalid"), element(6, lat=float("nan")),
    ]}))
    monkeypatch.setattr("services.overpass_client.requests.post", post)
    service = OverpassClient()
    first = service.search_places("park", 51.5, -0.12, "One", max_results=2)
    assert len(first) == 2
    assert first[0]["distance_km"] <= first[1]["distance_km"]
    second = service.search_places("park", 51.5, -0.12, "Two", max_results=10)
    assert len(second) == 3
    assert any(place["id"] == "relation/3" for place in second)
    assert "Two" in second[0]["distance_label"]
    service.search_places("park", 51.50001, -0.12, "Two")
    assert post.call_count == 3
    assert 'nwr[' in post.call_args.kwargs["data"]["data"]


def test_empty_overpass_is_cached_without_mirror_spam(monkeypatch):
    post = Mock(return_value=response({"elements": []}))
    monkeypatch.setattr("services.overpass_client.requests.post", post)
    service = OverpassClient()
    for _ in range(2):
        assert service.search_places("park", 0, 0, "Origin") == []
    assert post.call_count == 1


@pytest.mark.parametrize("payload", [[], {}, {"remark": "runtime error", "elements": []}, {"elements": None}])
def test_overpass_invalid_payload_is_an_outage(monkeypatch, payload):
    monkeypatch.setattr("services.overpass_client.requests.post", Mock(return_value=response(payload)))
    with pytest.raises(ServiceUnavailable):
        OverpassClient().search_places("park", 0, 0, "Origin")


def test_overpass_retries_failed_mirror(monkeypatch):
    post = Mock(side_effect=[requests.Timeout(), response({"elements": [element()]})])
    monkeypatch.setattr("services.overpass_client.requests.post", post)
    assert OverpassClient().search_places("park", 51.5, -0.12, "London")
    assert post.call_count == 2


def test_nominatim_address_extras_and_radial_filter(monkeypatch):
    get = Mock(return_value=response([
        {"osm_type": "node", "osm_id": "1", "category": "leisure", "type": "park", "name": "Park", "lat": "51.501", "lon": "-0.12",
         "address": {"house_number": "42", "road": "Main Street", "city": "London"},
         "extratags": {"opening_hours": "24/7", "wikipedia": "en:Park", "website": "javascript:bad()"}},
        {"osm_type": "node", "osm_id": 2, "category": "leisure", "type": "park", "name": "Far away", "lat": "52", "lon": "-0.12"},
        {"osm_type": "way", "osm_id": 3, "category": "highway", "type": "residential", "name": "Park Road", "lat": "51.501", "lon": "-0.12"},
    ]))
    monkeypatch.setattr("services.nominatim_client.requests.get", get)
    monkeypatch.setattr(NominatimClient, "_throttle", lambda self: None)
    service = NominatimClient()
    places = service.search_pois("park", 51.5, -0.12, "London")
    assert len(places) == 1
    assert "42 Main Street" in places[0]["address"]
    assert places[0]["opening_hours"] == "24/7"
    assert places[0]["website"] is None
    assert get.call_args.kwargs["params"]["extratags"] == 1
    places[0].pop("wikipedia_tag")
    assert service.search_pois("park", 51.5, -0.12, "London")[0]["wikipedia_tag"] == "en:Park"
    assert get.call_count == 1
    service.search_pois("park", 51.5, -0.12, "Elsewhere", radius_km=1, max_results=1)
    assert get.call_count == 2


@pytest.mark.parametrize("payload", [[], [{"lat": "51.5", "lon": "-0.1", "display_name": "London"}]])
def test_nominatim_geocode_and_negative_cache(monkeypatch, payload):
    get = Mock(return_value=response(payload))
    monkeypatch.setattr("services.nominatim_client.requests.get", get)
    monkeypatch.setattr(NominatimClient, "_throttle", lambda self: None)
    service = NominatimClient()
    first = service.geocode("London")
    assert first == service.geocode(" LONDON ")
    assert get.call_count == 1


@pytest.mark.parametrize("payload", [{}, [None], [{"lat": "bad", "lon": 0}], [{"lat": 91, "lon": 0}]])
def test_nominatim_invalid_data_is_not_location_not_found(monkeypatch, payload):
    monkeypatch.setattr("services.nominatim_client.requests.get", Mock(return_value=response(payload)))
    monkeypatch.setattr(NominatimClient, "_throttle", lambda self: None)
    with pytest.raises(ServiceUnavailable):
        NominatimClient().geocode("London")


@pytest.mark.parametrize("failure", [requests.Timeout(), requests.ConnectionError(), requests.HTTPError()])
def test_nominatim_network_errors_are_not_empty_results(monkeypatch, failure):
    monkeypatch.setattr("services.nominatim_client.requests.get", Mock(side_effect=failure))
    monkeypatch.setattr(NominatimClient, "_throttle", lambda self: None)
    with pytest.raises(ServiceUnavailable):
        NominatimClient().geocode("London")


def test_nominatim_request_spacing_uses_monotonic_clock(monkeypatch):
    monkeypatch.setattr(NominatimClient, "_last_request_time", 10)
    monkeypatch.setattr("services.nominatim_client.time.monotonic", Mock(side_effect=[10.2, 11.1]))
    sleep = Mock()
    monkeypatch.setattr("services.nominatim_client.time.sleep", sleep)
    NominatimClient()._throttle()
    assert sleep.call_args.args[0] == pytest.approx(0.9)


def test_unlinked_names_never_get_unrelated_wikipedia_articles(monkeypatch):
    get = Mock()
    monkeypatch.setattr("services.wiki_client.requests.get", get)
    assert WikiClient().fetch_summary(place_name="Common business name") == (None, None)
    get.assert_not_called()


def test_wikipedia_summary_is_linked_cached_and_escaped(monkeypatch):
    get = Mock(return_value=response({"extract": "A linked park. " * 40, "content_urls": {"desktop": {"page": "javascript:bad()"}}}))
    monkeypatch.setattr("services.wiki_client.requests.get", get)
    service = WikiClient()
    summary, url = service.fetch_summary(wikipedia_tag="zh-min-nan:Park / Garden")
    assert len(summary) <= 300
    assert url == "https://zh-min-nan.wikipedia.org/wiki/Park%20%2F%20Garden"
    assert service.fetch_summary(wikipedia_tag="zh-min-nan:Park / Garden") == (summary, url)
    assert get.call_count == 1
    assert not get.call_args.kwargs["allow_redirects"]


def test_wikidata_sitelink_is_actually_used(monkeypatch):
    get = Mock(side_effect=[
        response({"entities": {"Q42": {"sitelinks": {"enwiki": {"title": "Specific place"}}}}}),
        response({"extract": "This is a linked article."}),
    ])
    monkeypatch.setattr("services.wiki_client.requests.get", get)
    summary, url = WikiClient().fetch_summary(wikidata_tag="Q42")
    assert summary == "This is a linked article."
    assert url.endswith("Specific%20place")
    assert get.call_args_list[0].kwargs["params"]["ids"] == "Q42"


@pytest.mark.parametrize("payload", [{"type": "disambiguation", "extract": "Unrelated"}, [], {"extract": []}, {}])
def test_optional_article_bad_data_never_breaks_search(monkeypatch, payload):
    monkeypatch.setattr("services.wiki_client.requests.get", Mock(return_value=response(payload)))
    assert WikiClient().fetch_summary(wikipedia_tag="en:Park") == (None, None)


def test_optional_article_failure_is_logged_without_private_query(monkeypatch, caplog):
    monkeypatch.setattr("services.wiki_client.requests.get", Mock(side_effect=requests.Timeout("private query")))
    assert WikiClient().fetch_summary(wikipedia_tag="en:Private label") == (None, None)
    assert "Optional article lookup failed" in caplog.text
    assert "private query" not in caplog.text and "Private label" not in caplog.text


@pytest.mark.parametrize("value", ["javascript:alert(1)", "data:text/html,bad", "//evil.test", "https://u:p@example.com", "https://example.com/\nunsafe", None])
def test_reject_unsafe_external_links(value):
    assert safe_http_url(value) is None


def test_geographic_edge_cases_and_address_sources():
    assert haversine_distance_km(0, 0, 0, 180) == pytest.approx(20015.09, abs=0.1)
    assert haversine_distance_km(0, 179.99, 0, -179.99) < 3
    assert format_address({"house_number": "42", "road": "Main Street", "city": "London"}) == "42 Main Street, London"
    assert safe_http_url("https://example.com") == "https://example.com"


@pytest.mark.parametrize("message,category", [
    ("cafes near Hyde Park, London", "cafe"), ("restaurants near Hospital Road", "restaurant"),
    ("museums in Garden City", "museum"), ("pharmacies near Library Road", "pharmacy"),
])
def test_location_names_do_not_override_requested_category(message, category):
    assert IntentParser().parse_query(message)["category"] == category


def test_pending_category_can_use_device_location():
    result = IntentParser().parse_query("near me", user_location={"lat": 0, "lon": 0}, pending_category="pharmacy")
    assert result["is_near_me"] and result["location_name"] is None and result["status"] == "ready"


def test_radius_boundary_is_not_rounded_inward():
    from services.geo_utils import make_place
    import math

    latitude = math.degrees(5.004 / 6371)
    assert make_place("node", 1, "Outside", latitude, 0, {}, "park", 0, 0, "Origin", 5) is None


def test_website_entrypoint_is_real_html_and_missing_build_is_explicit(client, monkeypatch, tmp_path):
    monkeypatch.setattr(server, "FRONTEND_DIST", tmp_path)
    assert client.get("/").status_code == 503
    (tmp_path / "index.html").write_text('<!doctype html><html><body>Website</body></html>', encoding="utf-8")
    page = client.get("/")
    assert page.status_code == 200 and page.mimetype == "text/html"
    assert b'Website' in page.data


def test_static_assets_cannot_expose_project_files(client):
    for path in ("/assets/../../.env", "/assets/../../backend/app.py", "/.env", "/backend/app.py"):
        assert client.get(path).status_code == 404


def test_hosted_product_identity_and_browser_protection(client):
    response = client.get('/api/health', headers={'Origin': 'https://unrelated.example'})
    assert response.json['product'] == 'Geozity'
    assert response.headers['X-Content-Type-Options'] == 'nosniff'
    assert response.headers['Permissions-Policy'] == 'geolocation=(self)'
    assert 'Access-Control-Allow-Origin' not in response.headers


def test_hosted_search_recovers_when_primary_providers_reject_requests(client, search, monkeypatch):
    places = server.overpass_client.search_places('park', 51.5, -0.12, 'London')
    monkeypatch.setattr(server.nominatim_client, 'geocode', Mock(side_effect=ServiceUnavailable('primary down')))
    monkeypatch.setattr(server.nominatim_client, 'search_pois', Mock(side_effect=ServiceUnavailable('primary down')))
    monkeypatch.setattr(server.overpass_client, 'search_places', Mock(side_effect=ServiceUnavailable('primary down')))
    monkeypatch.setattr(server.photon_client, 'geocode', Mock(return_value={
        'label': 'London', 'lat': 51.5, 'lon': -0.12, 'source': 'Photon / OpenStreetMap',
    }))
    monkeypatch.setattr(server.photon_client, 'search_places', Mock(return_value=places))
    response = client.post('/api/chat', json={'message': 'parks in London'})
    assert response.status_code == 200
    assert response.json['status'] == 'ready'
    assert response.json['resolved_location']['source'] == 'Photon / OpenStreetMap'
    assert len(response.json['places']) == 1


def test_unknown_location_does_not_trigger_unnecessary_fallback(client, monkeypatch):
    monkeypatch.setattr(server.nominatim_client, 'geocode', Mock(return_value=None))
    result = client.post('/api/chat', json={'message': 'parks in Unknown'})
    assert result.json['status'] == 'location_not_found'
    server.photon_client.geocode.assert_not_called()
