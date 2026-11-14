"""Bounded OSM-based fallback when the primary public providers are unavailable."""

import logging
import os
import threading
import time
from typing import Any

import requests

from services.cache import TTLCache
from services.errors import ServiceUnavailable
from services.geo_utils import make_place, rank_places
from services.place_categories import CATEGORY_TAGS
from services.validation import valid_coordinates

logger = logging.getLogger(__name__)


class PhotonClient:
    USER_AGENT = 'Geozity/1.0 (+https://github.com/msvignesh01/Geozity)'
    _lock = threading.Lock()
    _last_request = 0.0

    def __init__(self, cache_ttl_seconds: int = 900):
        self.base_url = os.environ.get('PHOTON_URL', 'https://photon.komoot.io').rstrip('/')
        self._cache: TTLCache[list[dict[str, Any]]] = TTLCache(cache_ttl_seconds)

    def _features(self, path: str, params: list[tuple[str, Any]]) -> list[dict[str, Any]]:
        key = (path, tuple(params))
        cached = self._cache.get(key)
        if cached is not None:
            return cached
        with self._lock:
            cached = self._cache.get(key)
            if cached is not None:
                return cached
            wait = 1.1 - (time.monotonic() - PhotonClient._last_request)
            if wait > 0:
                time.sleep(wait)
            PhotonClient._last_request = time.monotonic()
            try:
                response = requests.get(
                    self.base_url + path, params=params,
                    headers={'User-Agent': self.USER_AGENT}, timeout=8,
                )
                response.raise_for_status()
                payload = response.json()
                features = payload.get('features') if isinstance(payload, dict) else None
                if not isinstance(features, list) or any(not isinstance(feature, dict) for feature in features):
                    raise ValueError('Invalid location response')
                self._cache.set(key, features)
                return features
            except (requests.RequestException, ValueError) as error:
                status = getattr(getattr(error, 'response', None), 'status_code', None)
                # Exception messages may contain a person's search area. Record
                # only exception class names, including the underlying transport.
                transport = error.args[0] if error.args and isinstance(error.args[0], Exception) else error
                reason = getattr(transport, 'reason', None)
                logger.warning('Photon lookup failed (%s, HTTP %s, transport %s, reason %s)',
                               type(error).__name__, status, type(transport).__name__, type(reason).__name__)
                raise ServiceUnavailable('Map search is temporarily unavailable. Please try again.') from error

    @staticmethod
    def _point(feature: dict[str, Any]) -> dict[str, float] | None:
        geometry = feature.get('geometry')
        if not isinstance(geometry, dict) or geometry.get('type') != 'Point':
            return None
        coordinates = geometry.get('coordinates')
        if not isinstance(coordinates, list) or len(coordinates) != 2:
            return None
        point = {'lat': coordinates[1], 'lon': coordinates[0]}
        return point if valid_coordinates(point) else None

    def geocode(self, query: str) -> dict[str, Any] | None:
        features = self._features('/api/', [('q', query.strip()), ('limit', 1), ('lang', 'en')])
        if not features:
            return None
        feature = features[0]
        point = self._point(feature)
        properties = feature.get('properties')
        if point is None or not isinstance(properties, dict):
            raise ServiceUnavailable('Location lookup returned unusable data. Please try again.')
        parts = []
        for key in ('name', 'district', 'city', 'state', 'country'):
            value = properties.get(key)
            if isinstance(value, str) and value.strip() and value.strip() not in parts:
                parts.append(value.strip())
        return {**point, 'label': ', '.join(parts)[:1000] or query.strip(), 'source': 'Photon / OpenStreetMap'}

    def search_places(
        self, category: str, center_lat: float, center_lon: float,
        reference_label: str, radius_m: int = 5000, max_results: int = 10,
    ) -> list[dict[str, Any]]:
        filters = CATEGORY_TAGS.get(category)
        if not filters:
            raise ValueError('Unsupported place category')
        params: list[tuple[str, Any]] = [
            ('lat', center_lat), ('lon', center_lon), ('radius', radius_m / 1000),
            ('limit', 20), ('lang', 'en'), ('dedupe', 0),
        ]
        params.extend(('osm_tag', f'{key}:{value}') for key, value in filters)
        places = []
        for feature in self._features('/reverse', params):
            point = self._point(feature)
            properties = feature.get('properties')
            if point is None or not isinstance(properties, dict):
                logger.warning('Photon returned an unusable place record')
                continue
            if (properties.get('osm_key'), properties.get('osm_value')) not in filters:
                continue
            extra = properties.get('extra') or {}
            if not isinstance(extra, dict):
                logger.warning('Photon returned invalid extra place details')
                continue
            tags = {
                **extra, 'addr:housenumber': properties.get('housenumber'),
                'addr:street': properties.get('street'), 'addr:city': properties.get('city'),
                'addr:postcode': properties.get('postcode'), 'addr:suburb': properties.get('district'),
            }
            place = make_place(
                {'N': 'node', 'W': 'way', 'R': 'relation'}.get(str(properties.get('osm_type'))),
                properties.get('osm_id'), properties.get('name'), point['lat'], point['lon'],
                tags, category, center_lat, center_lon, reference_label, radius_m / 1000,
            )
            if place:
                places.append(place)
        return rank_places(places, max_results)
