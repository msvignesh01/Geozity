import logging
import os
from typing import Any

import requests

from services.cache import TTLCache
from services.errors import ServiceUnavailable
from services.geo_utils import make_place, rank_places
from services.place_categories import CATEGORY_TAGS

logger = logging.getLogger(__name__)

CATEGORY_FILTERS: dict[str, list[str]] = {
    category: [f'["{key}"="{value}"]' for key, value in tags]
    for category, tags in CATEGORY_TAGS.items()
}


class OverpassClient:
    ENDPOINTS = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://lz4.overpass-api.de/api/interpreter",
    ]
    USER_AGENT = "Geozity/1.0 (+https://github.com/msvignesh01/Geozity)"

    def __init__(self, cache_ttl_seconds: int = 900):
        self._cache: TTLCache[list[dict[str, Any]]] = TTLCache(cache_ttl_seconds)
        configured = os.environ.get("OVERPASS_URLS")
        self.endpoints = configured.split(",") if configured else self.ENDPOINTS

    def _build_query(self, category: str, lat: float, lon: float, radius_m: int = 5000) -> str | None:
        filters = CATEGORY_FILTERS.get(category.strip().lower())
        if not filters:
            return None
        clauses = [f"nwr{tag}(around:{radius_m},{lat},{lon});" for tag in filters]
        # Bound server work and payload size. The nearest result is only the
        # nearest among returned records, never a guarantee of completeness.
        return '[out:json][timeout:6][maxsize:2097152];(' + ''.join(clauses) + ');out center tags 100;'

    def search_places(
        self, category: str, center_lat: float, center_lon: float,
        reference_label: str, radius_m: int = 5000, max_results: int = 10,
    ) -> list[dict[str, Any]]:
        category_key = category.strip().lower()
        key = (category_key, center_lat, center_lon, reference_label, radius_m, max_results)
        cached = self._cache.get(key)
        if cached is not None:
            return cached
        query = self._build_query(category_key, center_lat, center_lon, radius_m)
        if query is None:
            raise ValueError("Unsupported place category")
        raw_elements = None
        for endpoint in self.endpoints:
            try:
                response = requests.post(
                    endpoint.strip(), data={"data": query},
                    headers={"User-Agent": self.USER_AGENT}, timeout=6,
                )
                response.raise_for_status()
                payload = response.json()
                if (not isinstance(payload, dict) or payload.get("remark")
                        or not isinstance(payload.get("elements"), list)):
                    raise ValueError("Invalid or incomplete place response")
                raw_elements = payload["elements"]
                break  # An honest empty result is not an outage; do not query every mirror.
            except (requests.RequestException, ValueError) as exc:
                logger.warning("Overpass lookup failed (%s); trying remaining mirrors", type(exc).__name__)
        if raw_elements is None:
            raise ServiceUnavailable("Place search is temporarily unavailable. Please try again.")
        places = []
        for element in raw_elements:
            if not isinstance(element, dict):
                logger.warning("Overpass returned an invalid place record")
                continue
            tags = element.get("tags") or {}
            center = element.get("center") or element
            if not isinstance(tags, dict) or not isinstance(center, dict):
                logger.warning("Overpass returned invalid place details")
                continue
            place = make_place(
                element.get("type"), element.get("id"), tags.get("name:en") or tags.get("name"),
                center.get("lat"), center.get("lon"), tags, category_key,
                center_lat, center_lon, reference_label, radius_m / 1000,
            )
            if place:
                places.append(place)
        ranked = rank_places(places, max_results)
        self._cache.set(key, ranked)
        return ranked
