import pytest
from app import app
from services.wiki_client import WikiClient

pytestmark = pytest.mark.live

def test_live_hospital_query_bengaluru():
    client = app.test_client()
    resp = client.post("/api/chat", json={
        "message": "nearest hospital to MG Road, Bengaluru"
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "ready"
    assert "safety_notice" in data and data["safety_notice"] is not None
    assert len(data["places"]) > 0
    first = data["places"][0]
    assert "distance_label" in first
    assert "address" in first
    assert "lat" in first and "lon" in first
    print(f"\n[Verified Bengaluru] Found {len(data['places'])} hospitals. Top: {first['name']} - {first['distance_label']}")

def test_live_parks_london():
    client = app.test_client()
    resp = client.post("/api/chat", json={
        "message": "parks in London"
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "ready"
    assert len(data["places"]) > 0
    print(f"\n[Verified London] Found {len(data['places'])} parks. Top: {data['places'][0]['name']}")

def test_live_museums_tokyo():
    client = app.test_client()
    resp = client.post("/api/chat", json={
        "message": "museums in Tokyo"
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "ready"
    assert len(data["places"]) > 0
    print(f"\n[Verified Tokyo] Found {len(data['places'])} museums. Top: {data['places'][0]['name']}")


def test_live_linked_wikipedia_summary():
    summary, url = WikiClient().fetch_summary(wikipedia_tag="en:Cubbon Park")
    assert summary and len(summary) <= 300
    assert url == "https://en.wikipedia.org/wiki/Cubbon%20Park"
