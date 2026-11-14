"""Explicitly isolated synthetic provider data for manual browser regression checks.

Run: backend/.venv/Scripts/python backend/tests/browser_server.py --fixtures
This is NOT the normal application entrypoint and must never be deployed.
"""

import argparse
import sys
import time
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app as server
from services.errors import ServiceUnavailable
from services.geo_utils import make_place, rank_places


def geocode(query):
    if query == "Offline":
        raise ServiceUnavailable("Fixture provider unavailable. Please try again.")
    if query == "Slow":
        time.sleep(3)
    coordinates = {
        "London": (51.5, -0.12), "Paris": (48.85, 2.35),
        "Empty": (0, 0), "Slow": (51.5, -0.12),
    }
    if query not in coordinates:
        return None
    lat, lon = coordinates[query]
    return {"label": query, "lat": lat, "lon": lon, "source": "Synthetic browser fixture"}


def search_places(category, center_lat, center_lon, reference_label, **kwargs):
    if center_lat == 0 and center_lon == 0:
        return []
    places = []
    for rank in (1, 2):
        place = make_place(
            "node", rank, f"Fixture {category} {rank} in {reference_label}",
            center_lat + rank * 0.001, center_lon,
            {"addr:street": '<img src=x onerror="alert(1)"> Test Street', "opening_hours": "24/7",
             "wikipedia": "en:Fixture", "website": "javascript:alert(1)"},
            category, center_lat, center_lon, reference_label, 5,
        )
        if place:
            places.append(place)
    return rank_places(places, 10)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixtures", action="store_true", required=True)
    parser.parse_args()
    print("SYNTHETIC BROWSER FIXTURES ONLY — loopback port 5000", flush=True)
    with patch.object(server.nominatim_client, "geocode", side_effect=geocode), \
            patch.object(server.nominatim_client, "search_pois", return_value=[]), \
            patch.object(server.overpass_client, "search_places", side_effect=search_places), \
            patch.object(server.wiki_client, "fetch_summary", return_value=("Synthetic linked summary.", "https://en.wikipedia.org/wiki/Fixture")):
        server.app.run(host="127.0.0.1", port=5000, debug=False)
