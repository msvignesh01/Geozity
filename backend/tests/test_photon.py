from unittest.mock import Mock

import pytest
import requests

from services.errors import ServiceUnavailable
from services.photon_client import PhotonClient


def feature(name='Park', lat=12.97, lon=77.59, osm_type='W', osm_id=1, **properties):
    return {
        'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [lon, lat]},
        'properties': {'name': name, 'osm_type': osm_type, 'osm_id': osm_id,
                       'osm_key': 'leisure', 'osm_value': 'park', **properties},
    }


@pytest.fixture
def http(monkeypatch):
    response = Mock()
    response.json.return_value = {'features': [feature(city='Bengaluru', state='Karnataka', country='India')]}
    get = Mock(return_value=response)
    monkeypatch.setattr('services.photon_client.requests.get', get)
    monkeypatch.setattr('services.photon_client.time.sleep', lambda _: None)
    return get, response


def test_geocoding_coordinate_order_and_copy_safe_cache(http):
    get, response = http
    client = PhotonClient()
    location = client.geocode('Bengaluru')
    assert location['lat'] == 12.97 and location['lon'] == 77.59
    assert location['label'] == 'Park, Bengaluru, Karnataka, India'
    location['label'] = 'Changed'
    assert client.geocode('Bengaluru')['label'] != 'Changed'
    assert get.call_count == 1


def test_empty_geocode_is_cached(http):
    get, response = http
    response.json.return_value = {'features': []}
    client = PhotonClient()
    assert client.geocode('Unknown') is None
    assert client.geocode('Unknown') is None
    assert get.call_count == 1


@pytest.mark.parametrize('payload', [[], {}, {'features': None}, {'features': [None]},
    {'features': [{'geometry': {'type': 'Polygon'}, 'properties': {}}]},
    {'features': [feature(lat=91)]}, {'features': [feature(lat=True)]},
    {'features': [feature(lon=float('nan'))]},
])
def test_invalid_geocoding_never_returns_invented_coordinates(http, payload):
    _, response = http
    response.json.return_value = payload
    with pytest.raises(ServiceUnavailable):
        PhotonClient().geocode('Bengaluru')


def test_network_failure_is_logged_without_query(http, caplog):
    get, _ = http
    get.side_effect = requests.Timeout('private location text')
    with pytest.raises(ServiceUnavailable):
        PhotonClient().geocode('Private location')
    assert 'Photon lookup failed' in caplog.text
    assert 'private location text' not in caplog.text and 'Private location' not in caplog.text


def test_places_obey_osm_identity_category_radius_and_missing_details(http):
    get, response = http
    response.json.return_value = {'features': [
        feature('Same branch name', lat=12.971),
        feature('Same branch name', lat=12.972, osm_type='R', osm_id=2,
                housenumber='42', street='Main Street', city='Bengaluru',
                extra={'opening_hours': '24/7', 'website': 'javascript:bad()'}),
        feature('Wrong category', osm_id=3, osm_key='highway', osm_value='residential'),
        feature('Outside radius', lat=13.5, osm_id=4),
        feature('Invalid type', osm_type=[], osm_id=5),
    ]}
    client = PhotonClient()
    places = client.search_places('park', 12.97, 77.59, 'Bengaluru')
    assert [place['id'] for place in places] == ['way/1', 'relation/2']
    assert [place['rank'] for place in places] == [1, 2]
    assert places[0]['opening_hours'] == 'Opening hours not listed in OpenStreetMap'
    assert places[1]['address'] == '42 Main Street, Bengaluru'
    assert places[1]['website'] is None
    assert places[1]['opening_hours'] == '24/7'
    assert ('osm_tag', 'leisure:park') in get.call_args.kwargs['params']
    places[0]['name'] = 'Changed'
    assert client.search_places('park', 12.97, 77.59, 'New label')[0]['name'] == 'Same branch name'
    assert 'New label' in client.search_places('park', 12.97, 77.59, 'New label')[0]['distance_label']
    assert get.call_count == 1


def test_photon_requests_are_spaced(monkeypatch, http):
    monkeypatch.setattr(PhotonClient, '_last_request', 10)
    monkeypatch.setattr('services.photon_client.time.monotonic', Mock(return_value=10.2))
    sleep = Mock()
    monkeypatch.setattr('services.photon_client.time.sleep', sleep)
    PhotonClient().geocode('Bengaluru')
    assert sleep.call_args.args[0] == pytest.approx(0.9)
