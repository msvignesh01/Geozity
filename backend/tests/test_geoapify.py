from unittest.mock import Mock

import pytest
import requests

import app as server
from services.errors import ServiceUnavailable
from services.geoapify_client import CATEGORIES, GeoapifyClient


def feature(identity=1, lat=12.971, **values):
    return {'type': 'Feature', 'properties': {
        'name': 'Public Test Park', 'lat': lat, 'lon': 77.59,
        'formatted': 'Public Test Park, Bengaluru, India', 'categories': ['leisure.park'],
        'datasource': {'raw': {'osm_type': 'w', 'osm_id': identity}}, **values,
    }}


@pytest.fixture
def provider(monkeypatch):
    monkeypatch.setenv('GEOAPIFY_API_KEY', 'test-only-credential')
    monkeypatch.setattr('services.geoapify_client.time.sleep', lambda _: None)
    response = Mock(status_code=200)
    response.json.return_value = {'features': [feature()]}
    get = Mock(return_value=response)
    monkeypatch.setattr('services.geoapify_client.requests.get', get)
    return GeoapifyClient(), get, response


def test_geocoding_cache_coordinate_order_and_no_key_in_result(provider):
    client, get, _ = provider
    result = client.geocode('Bengaluru')
    assert result['lat'] == 12.971 and result['lon'] == 77.59
    assert result['source'] == 'Geoapify / OpenStreetMap'
    result['label'] = 'changed'
    assert client.geocode('Bengaluru')['label'] != 'changed'
    assert get.call_count == 1
    assert get.call_args.kwargs['params']['apiKey'] == 'test-only-credential'
    assert 'credential' not in str(result)
    assert get.call_args.kwargs['allow_redirects'] is False


def test_places_preserve_identity_sort_deduplicate_and_sanitize_links(provider):
    client, get, response = provider
    response.json.return_value = {'features': [feature(2, lat=12.972), feature(1), feature(1),
        feature(3, lat=13), feature(4, categories=['catering.cafe'])]}
    places = client.search_places('park', 12.97, 77.59, 'Bengaluru', radius_m=1000)
    assert [p['id'] for p in places] == ['way/1', 'way/2']
    assert [p['rank'] for p in places] == [1, 2]
    assert all(p['distance_km'] <= 1 for p in places)
    assert places[0]['osm_url'] == 'https://www.openstreetmap.org/way/1'
    assert get.call_args.kwargs['params']['filter'] == 'circle:77.59,12.97,1000'
    response.json.return_value = {'features': [feature(website='javascript:alert(1)')]}
    assert client.search_places('park', 12.97, 77.59, 'Bengaluru')[0]['website'] is None


@pytest.mark.parametrize('category', CATEGORIES)
def test_every_supported_category_has_a_real_provider_filter(provider, category):
    client, get, response = provider
    response.json.return_value = {'features': []}
    assert client.search_places(category, 12.97, 77.59, 'Bengaluru') == []
    assert get.call_args.kwargs['params']['categories'] == ','.join(CATEGORIES[category])


@pytest.mark.parametrize('status', [301, 400, 401, 403, 429, 500, 503])
def test_provider_errors_are_not_fake_empty_results(provider, status, caplog):
    client, _, response = provider
    response.status_code = status
    response.text = 'test-only-credential private query'
    with pytest.raises(ServiceUnavailable):
        client.geocode('private query')
    assert 'test-only-credential' not in caplog.text and 'private query' not in caplog.text


def test_transport_error_does_not_log_secret_or_query(provider, caplog):
    client, get, _ = provider
    get.side_effect = requests.ConnectionError('test-only-credential private query')
    with pytest.raises(ServiceUnavailable):
        client.geocode('private query')
    assert 'ConnectionError' in caplog.text
    assert 'test-only-credential' not in caplog.text and 'private query' not in caplog.text


@pytest.mark.parametrize('payload', [{}, [], {'features': None}, {'features': [None]},
    {'features': [feature(lat=True)]}, {'features': [feature(lat=91)]}])
def test_bad_geocoding_data_is_rejected(provider, payload):
    client, _, response = provider
    response.json.return_value = payload
    with pytest.raises(ServiceUnavailable):
        client.geocode('Bengaluru')


def test_app_uses_configured_provider_for_search_and_followup(monkeypatch, provider):
    service, get, _ = provider
    monkeypatch.setattr(server, 'geoapify_client', service)
    legacy = Mock(side_effect=AssertionError('Legacy service must not be called'))
    monkeypatch.setattr(server.nominatim_client, 'geocode', legacy)
    monkeypatch.setattr(server.overpass_client, 'search_places', legacy)
    monkeypatch.setattr(server.wiki_client, 'fetch_summary', Mock(return_value=(None, None)))
    client = server.app.test_client()
    first = client.post('/api/chat', json={'message': 'parks in Bengaluru'})
    assert first.status_code == 200 and first.json['status'] == 'ready'
    second = client.post('/api/chat', json={'message': 'parks instead', 'last_context': first.json['context']})
    assert second.status_code == 200 and second.json['status'] == 'ready'
    assert second.json['context']['lat'] == first.json['context']['lat']
    assert get.call_count == 2


def test_empty_places_remain_honest_and_quota_failure_is_explicit(monkeypatch, provider):
    service, _, response = provider
    monkeypatch.setattr(server, 'geoapify_client', service)
    client = server.app.test_client()
    response.json.return_value = {'features': []}
    payload = {'message': 'parks near me', 'user_location': {'lat': 12.97, 'lon': 77.59}}
    result = client.post('/api/chat', json=payload)
    assert result.status_code == 200 and result.json['status'] == 'no_results'
    response.status_code = 429
    payload['user_location']['lat'] = 12.98
    result = client.post('/api/chat', json=payload)
    assert result.status_code == 503 and 'usage limit' in result.json['reply']


def test_missing_configuration_fails_without_network(monkeypatch):
    monkeypatch.delenv('GEOAPIFY_API_KEY', raising=False)
    service = GeoapifyClient()
    assert not service.enabled
    with pytest.raises(ServiceUnavailable):
        service.geocode('Bengaluru')


def test_hospital_search_excludes_clinics_and_diagnostic_centres(provider):
    from services.place_categories import CATEGORY_TAGS
    client, get, response = provider
    response.json.return_value = {'features': [
        feature(1, name='Actual Hospital', categories=['healthcare', 'healthcare.hospital']),
        feature(2, name='Diagnostic Centre', categories=['healthcare', 'healthcare.clinic_or_praxis']),
    ]}
    places = client.search_places('hospital', 12.97, 77.59, 'Bengaluru')
    assert [p['name'] for p in places] == ['Actual Hospital']
    assert get.call_args.kwargs['params']['categories'] == 'healthcare.hospital'
    assert CATEGORY_TAGS['hospital'] == (('amenity', 'hospital'),)
