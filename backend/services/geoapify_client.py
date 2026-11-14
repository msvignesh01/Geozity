"""Account-based map search with bounded requests and no credentials in responses."""

import logging
import os
import threading
import time
from typing import Any

import requests

from services.cache import TTLCache
from services.errors import ServiceUnavailable
from services.geo_utils import make_place, rank_places
from services.validation import valid_coordinates

logger = logging.getLogger(__name__)

CATEGORIES = {
    'hospital': ('healthcare.hospital', 'healthcare.clinic_or_praxis'),
    'park': ('leisure.park',),
    'cafe': ('catering.cafe',),
    'restaurant': ('catering.restaurant', 'catering.fast_food'),
    'pharmacy': ('healthcare.pharmacy',),
    'museum': ('entertainment.museum', 'entertainment.culture.gallery'),
    'attraction': ('tourism.attraction', 'tourism.sights'),
    'library': ('education.library',),
    'supermarket': ('commercial.supermarket',),
}


class GeoapifyClient:
    def __init__(self, cache_ttl_seconds: int = 900):
        self._api_key = os.environ.get('GEOAPIFY_API_KEY', '').strip()
        self._cache: TTLCache[list[dict[str, Any]]] = TTLCache(cache_ttl_seconds)
        self._lock = threading.Lock()
        self._last_request = 0.0

    @property
    def enabled(self) -> bool:
        return bool(self._api_key)

    def _features(self, path: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        if not self.enabled:
            raise ServiceUnavailable('Map search is not configured. Please contact the site owner.')
        key = (path, tuple(params.items()))
        with self._lock:
            cached = self._cache.get(key)
            if cached is not None:
                return cached
            wait = 0.25 - (time.monotonic() - self._last_request)
            if wait > 0:
                time.sleep(wait)
            self._last_request = time.monotonic()
            try:
                response = requests.get(
                    'https://api.geoapify.com' + path,
                    params={**params, 'apiKey': self._api_key},
                    headers={'User-Agent': 'Geozity/1.0 (+https://github.com/msvignesh01/Geozity)'},
                    timeout=8, allow_redirects=False,
                )
                if response.status_code != 200:
                    logger.warning('Geoapify lookup failed (HTTP %s)', response.status_code)
                    if response.status_code == 429:
                        raise ServiceUnavailable('Map search has reached its usage limit. Please try again later.')
                    raise ServiceUnavailable('Map search is temporarily unavailable. Please try again.')
                payload = response.json()
                features = payload.get('features') if isinstance(payload, dict) else None
                if (not isinstance(features, list) or len(features) > 20
                        or any(not isinstance(feature, dict) for feature in features)):
                    raise ValueError('Invalid map response')
            except (requests.RequestException, ValueError) as error:
                # URL and exception messages can contain both the key and location.
                logger.warning('Geoapify lookup failed (%s)', type(error).__name__)
                raise ServiceUnavailable('Map search is temporarily unavailable. Please try again.') from error
            self._cache.set(key, features)
            return features

    def geocode(self, query: str) -> dict[str, Any] | None:
        features = self._features('/v1/geocode/search', {'text': query.strip(), 'limit': 1, 'lang': 'en'})
        if not features:
            return None
        props = features[0].get('properties')
        if not isinstance(props, dict) or not valid_coordinates(props):
            raise ServiceUnavailable('Location lookup returned unusable data. Please try again.')
        label = props.get('formatted')
        if not isinstance(label, str) or not label.strip():
            raise ServiceUnavailable('Location lookup returned unusable data. Please try again.')
        return {'lat': props['lat'], 'lon': props['lon'], 'label': label[:1000],
                'source': 'Geoapify / OpenStreetMap'}

    def search_places(self, category: str, center_lat: float, center_lon: float,
                      reference_label: str, radius_m: int = 5000, max_results: int = 10) -> list[dict[str, Any]]:
        filters = CATEGORIES.get(category)
        if not filters:
            raise ValueError('Unsupported place category')
        features = self._features('/v2/places', {
            'categories': ','.join(filters), 'filter': f'circle:{center_lon},{center_lat},{radius_m}',
            'bias': f'proximity:{center_lon},{center_lat}', 'limit': 20, 'lang': 'en',
        })
        places = []
        for feature in features:
            props = feature.get('properties')
            if not isinstance(props, dict) or not valid_coordinates(props):
                raise ServiceUnavailable('Place search returned unusable data. Please try again.')
            categories = props.get('categories')
            if not isinstance(categories, list) or not all(isinstance(c, str) for c in categories):
                raise ServiceUnavailable('Place search returned unusable data. Please try again.')
            if not any(c == f or c.startswith(f + '.') for c in categories for f in filters):
                continue
            source = props.get('datasource')
            raw = source.get('raw') if isinstance(source, dict) else None
            if not isinstance(raw, dict):
                raise ServiceUnavailable('Place search returned unusable data. Please try again.')
            tags = {**raw}
            for field, tag in (('housenumber', 'addr:housenumber'), ('street', 'addr:street'),
                               ('city', 'addr:city'), ('suburb', 'addr:suburb'), ('postcode', 'addr:postcode'),
                               ('opening_hours', 'opening_hours'), ('website', 'website')):
                if props.get(field) is not None:
                    tags[tag] = props[field]
            contact = props.get('contact')
            if isinstance(contact, dict) and isinstance(contact.get('phone'), str):
                tags['phone'] = contact['phone']
            place = make_place(
                {'n': 'node', 'w': 'way', 'r': 'relation'}.get(raw.get('osm_type')) if isinstance(raw.get('osm_type'), str) else None,
                raw.get('osm_id'), props.get('name'), props['lat'], props['lon'], tags,
                category, center_lat, center_lon, reference_label, radius_m / 1000,
            )
            if place:
                places.append(place)
        if features and not places:
            raise ServiceUnavailable('No usable places were returned by the map service. Please try another area.')
        return rank_places(places, max_results)
