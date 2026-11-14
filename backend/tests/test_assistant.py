import pytest
import math
from services.geo_utils import haversine_distance_km, format_distance_label, format_address, format_opening_hours
from services.intent_parser import IntentParser
from app import app

def test_haversine_distance_known_points():
    # London (51.5074, -0.1278) to Paris (48.8566, 2.3522) ~ 343.5 km
    dist = haversine_distance_km(51.5074, -0.1278, 48.8566, 2.3522)
    assert 340.0 <= dist <= 347.0

def test_haversine_distance_zero():
    # Distance from point to itself is 0
    dist = haversine_distance_km(12.9716, 77.5946, 12.9716, 77.5946)
    assert dist == 0.0

def test_distance_label_formatting():
    label_km = format_distance_label(2.4, "MG Road")
    assert label_km == "Approx. 2.4 km straight-line from MG Road"

    label_m = format_distance_label(0.45, "Indiranagar")
    assert label_m == "Approx. 450 m straight-line from Indiranagar"

def test_address_formatting():
    # Complete tags
    tags = {
        "addr:housenumber": "42",
        "addr:street": "Main Street",
        "addr:suburb": "Shanthala Nagar",
        "addr:city": "Bengaluru",
        "addr:postcode": "560001"
    }
    addr = format_address(tags)
    assert "42 Main Street" in addr
    assert "Bengaluru" in addr
    assert "560001" in addr

    # Empty tags
    empty_addr = format_address({})
    assert empty_addr == "Street address not registered in OpenStreetMap"

def test_opening_hours_formatting():
    assert format_opening_hours({"opening_hours": "Mo-Fr 09:00-18:00"}) == "Mo-Fr 09:00-18:00"
    assert format_opening_hours({}) == "Opening hours not listed in OpenStreetMap"

def test_intent_parser_basic_queries():
    parser = IntentParser()
    
    # Hospital search
    res = parser.parse_query("nearest hospital to MG Road, Bengaluru")
    assert res["status"] == "ready"
    assert res["category"] == "hospital"
    assert "MG Road" in res["location_name"]

    # Parks near me without GPS
    res_no_gps = parser.parse_query("parks near me")
    assert res_no_gps["status"] == "needs_location"
    assert res_no_gps["category"] == "park"

    # Parks near me with GPS
    res_gps = parser.parse_query("parks near me", user_location={"lat": 12.97, "lon": 77.59})
    assert res_gps["status"] == "ready"
    assert res_gps["category"] == "park"
    assert res_gps["is_near_me"] is True

def test_intent_parser_followup():
    parser = IntentParser()
    last_context = {
        "location_name": "MG Road, Bengaluru",
        "lat": 12.9756,
        "lon": 77.6066,
        "category": "hospital"
    }
    
    res = parser.parse_query("cafes instead", last_context=last_context)
    assert res["status"] == "ready"
    assert res["category"] == "cafe"
    assert res["is_followup"] is True
    assert res["location_name"] == "MG Road, Bengaluru"

def test_intent_parser_unsupported_category():
    parser = IntentParser()
    res = parser.parse_query("buy a used car in Seattle")
    assert res["status"] == "unsupported_category"

def test_flask_health_endpoint():
    client = app.test_client()
    resp = client.get("/api/health")
    assert resp.status_code == 200
    json_data = resp.get_json()
    assert json_data["status"] == "ok"
    assert "Leaflet" in json_data["stack"]

def test_flask_chat_invalid_payload():
    client = app.test_client()
    resp = client.post("/api/chat", json={})
    assert resp.status_code == 400
    json_data = resp.get_json()
    assert json_data["status"] == "error"

def test_flask_chat_unsupported_category():
    client = app.test_client()
    resp = client.post("/api/chat", json={"message": "where can I buy bowling balls"})
    assert resp.status_code == 200
    json_data = resp.get_json()
    assert json_data["status"] == "unsupported_category"
    assert "hospital" in json_data["suggested_categories"]

def test_flask_chat_needs_location():
    client = app.test_client()
    resp = client.post("/api/chat", json={"message": "parks near me"})
    assert resp.status_code == 200
    json_data = resp.get_json()
    assert json_data["status"] == "needs_location"
    assert json_data["category"] == "park"
