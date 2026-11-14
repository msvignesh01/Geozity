import logging
import math
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


class NominatimClient:
    """One process-wide request gate shared by geocoding and fallback searches."""

    BASE_URL = "https://nominatim.openstreetmap.org/search"
    USER_AGENT = "Geozity/1.0 (+https://github.com/msvignesh01/Geozity)"
    _request_lock = threading.Lock()
    _last_request_time = 0.0
    _min_interval = 1.1

    def __init__(self, cache_ttl_seconds: int = 900):
        self._cache: TTLCache[Any] = TTLCache(cache_ttl_seconds)
        self.base_url = os.environ.get("NOMINATIM_URL", self.BASE_URL)

    def _throttle(self) -> None:
        elapsed = time.monotonic() - NominatimClient._last_request_time
        if elapsed < self._min_interval:
            time.sleep(self._min_interval - elapsed)
        NominatimClient._last_request_time = time.monotonic()

    def _search(self, params: dict[str, Any]) -> list[dict[str, Any]]:
        # Hold the gate through the HTTP call: queued requests cannot overtake
        # each other after throttling or overlap a slow provider request.
        with self._request_lock:
            self._throttle()
            try:
                response = requests.get(
                    self.base_url, params=params,
                    headers={"User-Agent": self.USER_AGENT, "Accept-Language": "en"},
                    timeout=8,
                )
                response.raise_for_status()
                results = response.json()
                if not isinstance(results, list) or any(not isinstance(item, dict) for item in results):
                    raise ValueError("Invalid geocoder response")
                return results
            except (requests.RequestException, ValueError) as exc:
                logger.warning("Nominatim lookup failed (%s)", type(exc).__name__)
                raise ServiceUnavailable("Location lookup is temporarily unavailable. Please try again.") from exc

    def geocode(self, query: str) -> dict[str, Any] | None:
        normalized = query.strip().casefold()
        if not normalized:
            return None
        key = ("geocode", normalized)
        cached = self._cache.get(key)
        if cached is not None:
            return cached[0] if cached else None
        results = self._search({"q": query.strip(), "format": "jsonv2", "addressdetails": 1, "limit": 1})
        if not results:
            self._cache.set(key, [])
            return None
        first = results[0]
        try:
            point = {"lat": float(first["lat"]), "lon": float(first["lon"])}
            if not valid_coordinates(point):
                raise ValueError("Invalid provider coordinates")
        except (KeyError, TypeError, ValueError, OverflowError) as exc:
            logger.warning("Nominatim returned invalid location coordinates")
            raise ServiceUnavailable("Location lookup returned unusable data. Please try again.") from exc
        label = first.get("display_name")
        resolved = {
            **point, "label": label[:1000] if isinstance(label, str) and label else query.strip(),
            "source": "Nominatim / OpenStreetMap",
        }
        self._cache.set(key, [resolved])
        return resolved

    def search_pois(
        self, category: str, center_lat: float, center_lon: float,
        reference_label: str, radius_km: float = 5.0, max_results: int = 10,
    ) -> list[dict[str, Any]]:
        key = ("poi", category, center_lat, center_lon, reference_label, radius_km, max_results)
        cached = self._cache.get(key)
        if cached is not None:
            return cached
        lat_delta = radius_km / 111.0
        lon_delta = radius_km / (111.0 * max(0.01, math.cos(math.radians(center_lat))))
        # A wrapped dateline box cannot be expressed as one viewbox. Widen it
        # and apply the same radial filter to every returned point below.
        left, right = center_lon - lon_delta, center_lon + lon_delta
        if left < -180 or right > 180:
            left, right = -180, 180
        results = self._search({
            "q": category, "viewbox": f"{left},{min(90, center_lat + lat_delta)},{right},{max(-90, center_lat - lat_delta)}",
            "bounded": 1, "format": "jsonv2", "limit": 20,
            "addressdetails": 1, "extratags": 1,
        })
        places = []
        for item in results:
            if (item.get("category"), item.get("type")) not in CATEGORY_TAGS.get(category, ()):
                continue
            tags = item.get("extratags") or {}
            address = item.get("address") or {}
            if not isinstance(tags, dict) or not isinstance(address, dict):
                logger.warning("Nominatim place with invalid details was omitted")
                continue
            name = item.get("name") or str(item.get("display_name", "")).split(",")[0]
            place = make_place(
                item.get("osm_type"), item.get("osm_id"), name, item.get("lat"), item.get("lon"),
                {**address, **tags}, category, center_lat, center_lon, reference_label, radius_km,
            )
            if place:
                places.append(place)
        ranked = rank_places(places, max_results)
        self._cache.set(key, ranked)
        return ranked
