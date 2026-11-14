import math
from typing import Dict, Any, Optional
from urllib.parse import urlsplit

from services.validation import valid_coordinates

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes straight-line distance in kilometers between two coordinates
    using the spherical Haversine formula with mean Earth radius = 6371.0 km.
    """
    # Earth radius in kilometers
    r = 6371.0

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    
    # Clamp value within [0.0, 1.0] to prevent floating point inaccuracies causing domain errors
    a = max(0.0, min(1.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    
    return r * c

def format_distance_label(distance_km: float, reference_point: str) -> str:
    """
    Generates human-friendly straight-line distance label.
    """
    if distance_km < 1.0:
        meters = int(round(distance_km * 1000))
        return f"Approx. {meters} m straight-line from {reference_point}"
    return f"Approx. {distance_km:.1f} km straight-line from {reference_point}"

def format_address(tags: Dict[str, Any]) -> str:
    """
    Formats human-readable street address from OpenStreetMap tags.
    """
    parts = []
    
    house_num = tags.get("addr:housenumber") or tags.get("house_number")
    street = tags.get("addr:street") or tags.get("road") or tags.get("pedestrian")
    if house_num and street:
        parts.append(f"{house_num} {street}")
    elif street:
        parts.append(street)
    elif house_num:
        parts.append(f"No. {house_num}")
        
    suburb = (tags.get("addr:suburb") or tags.get("addr:neighbourhood") or tags.get("addr:district")
              or tags.get("suburb") or tags.get("neighbourhood"))
    if suburb:
        parts.append(suburb)
        
    city = (tags.get("addr:city") or tags.get("addr:town") or tags.get("addr:village")
            or tags.get("city") or tags.get("town") or tags.get("village"))
    if city:
        parts.append(city)
        
    postcode = tags.get("addr:postcode") or tags.get("postcode")
    if postcode:
        parts.append(postcode)
        
    if parts:
        return ", ".join(str(part) for part in parts)
    
    # Fallback if specific addr tags are absent
    if "address" in tags:
        return str(tags["address"])
        
    return "Street address not registered in OpenStreetMap"

def format_opening_hours(tags: Dict[str, Any]) -> str:
    """
    Returns opening hours if present, or explicit status if missing.
    """
    hours = tags.get("opening_hours")
    if hours and str(hours).strip():
        return str(hours).strip()
    return "Opening hours not listed in OpenStreetMap"


def safe_http_url(value: object) -> Optional[str]:
    if not isinstance(value, str):
        return None
    value = value.strip()
    try:
        parsed = urlsplit(value)
        if (parsed.scheme in ("https", "http") and parsed.hostname
                and not parsed.username and not parsed.password
                and not any(ord(char) < 32 for char in value)):
            return value
    except ValueError:
        return None
    return None


def make_place(
    osm_type: object, osm_id: object, name: object, lat: object, lon: object,
    tags: Dict[str, Any], category: str, center_lat: float, center_lon: float,
    reference_label: str, radius_km: float,
) -> Optional[Dict[str, Any]]:
    """Normalize both OSM providers with the same distance and identity rules."""
    if isinstance(osm_id, str) and osm_id.isascii() and osm_id.isdigit() and len(osm_id) <= 20:
        osm_id = int(osm_id)
    if (osm_type not in ("node", "way", "relation") or type(osm_id) is not int or osm_id <= 0
            or not isinstance(name, str) or not name.strip()):
        return None
    try:
        if isinstance(lat, bool) or isinstance(lon, bool):
            return None
        point = {"lat": float(lat), "lon": float(lon)}
    except (TypeError, ValueError, OverflowError):
        return None
    if not valid_coordinates(point):
        return None
    distance = haversine_distance_km(center_lat, center_lon, point["lat"], point["lon"])
    if distance > radius_km:
        return None
    phone = tags.get("phone") or tags.get("contact:phone")
    return {
        "id": f"{osm_type}/{osm_id}", "name": name.strip(), "category": category,
        **point, "distance_km": distance,
        "distance_label": format_distance_label(distance, reference_label),
        "address": format_address(tags), "opening_hours": format_opening_hours(tags),
        "phone": phone.strip() if isinstance(phone, str) and phone.strip() else None,
        "website": safe_http_url(tags.get("website") or tags.get("contact:website")),
        "wikipedia_tag": tags.get("wikipedia"), "wikidata_tag": tags.get("wikidata"),
        "osm_url": f"https://www.openstreetmap.org/{osm_type}/{osm_id}",
    }


def rank_places(places: list[Dict[str, Any]], max_results: int) -> list[Dict[str, Any]]:
    # OSM IDs identify branches; equal names do not imply equal places.
    unique = {place["id"]: place for place in places}
    ranked = sorted(unique.values(), key=lambda place: (place["distance_km"], place["id"]))[:max_results]
    for rank, place in enumerate(ranked, 1):
        place["rank"] = rank
    return ranked
