import logging
import re
from typing import Any
from urllib.parse import quote

import requests

from services.cache import TTLCache

logger = logging.getLogger(__name__)


class WikiClient:
    """Only enrich an OSM-linked article; a business name alone is ambiguous."""

    USER_AGENT = "Geozity/1.0 (+https://github.com/msvignesh01/Geozity)"

    def __init__(self, cache_ttl_seconds: int = 900):
        self._cache: TTLCache[tuple[str | None, str | None]] = TTLCache(cache_ttl_seconds)

    def _parse_wikipedia_tag(self, tag_val: str) -> tuple[str, str]:
        language, separator, title = tag_val.strip().partition(":")
        if separator and re.fullmatch(r"[a-z]{2,3}(?:-[a-z0-9]+)*", language):
            return language, title.strip()
        return "en", tag_val.strip()

    def _get_json(self, url: str, params: dict[str, str] | None = None) -> dict[str, Any] | None:
        try:
            response = requests.get(
                url, params=params, headers={"User-Agent": self.USER_AGENT},
                timeout=4, allow_redirects=False,
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, dict) or "error" in data:
                raise ValueError("Invalid article response")
            return data
        except (requests.RequestException, ValueError) as exc:
            logger.warning("Optional article lookup failed (%s)", type(exc).__name__)
            return None

    def _article(self, language: str, title: str) -> tuple[str | None, str | None]:
        title = title.replace("_", " ").strip()
        if not title:
            return None, None
        encoded = quote(title, safe="")
        data = self._get_json(f"https://{language}.wikipedia.org/api/rest_v1/page/summary/{encoded}")
        if data is None or data.get("type") == "disambiguation":
            return None, None
        extract = data.get("extract")
        if not isinstance(extract, str) or not extract.strip():
            return None, None
        summary = extract.strip()
        if len(summary) > 300:
            period = summary[:300].rfind(".")
            summary = summary[:period + 1] if period > 100 else summary[:297] + "..."
        # Construct the canonical link from the verified article identity rather
        # than trusting an arbitrary URL supplied in a remote response.
        return summary, f"https://{language}.wikipedia.org/wiki/{encoded}"

    def fetch_summary(
        self, wikipedia_tag: str | None = None, wikidata_tag: str | None = None,
        place_name: str | None = None,
    ) -> tuple[str | None, str | None]:
        wiki = wikipedia_tag.strip() if isinstance(wikipedia_tag, str) else ""
        entity = wikidata_tag.strip() if isinstance(wikidata_tag, str) else ""
        if not wiki and not re.fullmatch(r"Q[1-9][0-9]*", entity):
            return None, None
        key = (wiki, entity)
        cached = self._cache.get(key)
        if cached is not None:
            return cached
        result: tuple[str | None, str | None] = (None, None)
        if wiki:
            language, title = self._parse_wikipedia_tag(wiki)
            result = self._article(language, title)
        if result[0] is None and re.fullmatch(r"Q[1-9][0-9]*", entity):
            data = self._get_json("https://www.wikidata.org/w/api.php", {
                "action": "wbgetentities", "ids": entity, "props": "sitelinks",
                "sitefilter": "enwiki", "format": "json",
            })
            if data:
                entities = data.get("entities")
                item = entities.get(entity) if isinstance(entities, dict) else None
                sitelinks = item.get("sitelinks") if isinstance(item, dict) else None
                enwiki = sitelinks.get("enwiki") if isinstance(sitelinks, dict) else None
                title = enwiki.get("title") if isinstance(enwiki, dict) else None
                if isinstance(title, str):
                    result = self._article("en", title)
        if result[0] is not None:
            self._cache.set(key, result)
        return result
