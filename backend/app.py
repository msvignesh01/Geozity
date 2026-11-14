import os
import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from flask import Flask, g, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.exceptions import HTTPException

from services.intent_parser import IntentParser, CATEGORY_PLURALS
from services.errors import ServiceUnavailable
from services.validation import parse_chat_request
from services.nominatim_client import NominatimClient
from services.overpass_client import OverpassClient
from services.wiki_client import WikiClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

FRONTEND_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"
app = Flask(__name__, static_folder=str(FRONTEND_DIST / "assets"), static_url_path="/assets")
app.logger.setLevel(logging.INFO)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024
# The hosted website and API share an origin. Extra browser origins must be explicit.
allowed_origins = [origin.strip() for origin in os.environ.get("ALLOWED_ORIGINS", "").split(",") if origin.strip()]
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

# Service instances with thread-safe rate-limiting and 15-minute caching
intent_parser = IntentParser()
nominatim_client = NominatimClient(cache_ttl_seconds=900)
overpass_client = OverpassClient(cache_ttl_seconds=900)
wiki_client = WikiClient(cache_ttl_seconds=900)
search_slots = threading.BoundedSemaphore(4)
article_workers = ThreadPoolExecutor(max_workers=3, thread_name_prefix="article")

EMERGENCY_NOTICE = (
    "Map data is community-maintained and may be incomplete. "
    "In a medical emergency, contact local emergency services immediately."
)

ATTRIBUTION_NOTICE = (
    "Map data © OpenStreetMap contributors (ODbL), Nominatim, Overpass API, Wikipedia/Wikidata."
)


@app.before_request
def start_request():
    g.started_at = time.monotonic()
    g.safety_notice = None


@app.after_request
def finish_request(response):
    # Never include message text, coordinates, provider query URLs, or bodies.
    app.logger.info("request method=%s status=%s duration_ms=%.0f",
                    request.method, response.status_code,
                    (time.monotonic() - g.started_at) * 1000)
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(self)"
    return response


@app.errorhandler(ServiceUnavailable)
def unavailable(error):
    return jsonify(status="error", reply=str(error), safety_notice=g.safety_notice,
                   attribution=ATTRIBUTION_NOTICE), 503


@app.errorhandler(HTTPException)
def http_error(error):
    reply = "The request is too large. Please send a shorter question." if error.code == 413 else error.description
    return jsonify(status="error", reply=reply, attribution=ATTRIBUTION_NOTICE), error.code


@app.errorhandler(Exception)
def unexpected_error(error):
    app.logger.exception("Unexpected search failure")
    return jsonify(status="error", reply="The search could not be completed. Please try again.",
                   attribution=ATTRIBUTION_NOTICE), 500

@app.route("/api/health", methods=["GET"])
def health_check():
    """Confirms the Flask server is running and ready."""
    return jsonify({
        "status": "ok",
        "product": "Geozity",
        "stack": "React + Flask + Nominatim + Overpass + Leaflet + Wikipedia",
        "ai_mode": "rule_based"
    }), 200


@app.route("/", methods=["GET"])
def website():
    index = FRONTEND_DIST / "index.html"
    if not index.is_file():
        return jsonify(status="error", reply="The website has not been built. Please run the local start command.",
                       attribution=ATTRIBUTION_NOTICE), 503
    return send_file(index, max_age=0)

@app.route("/api/chat", methods=["POST"])
def chat():
    if not search_slots.acquire(blocking=False):
        return unavailable(ServiceUnavailable("Search is busy. Please try again shortly."))
    try:
        return search_chat()
    finally:
        search_slots.release()


def search_chat():
    """
    Main conversational endpoint:
    Parses natural language queries, resolves locations, queries live Overpass OSM data,
    enriches with Wikipedia summaries, and formats grounded results.
    """
    try:
        data = parse_chat_request(request.get_json(silent=True))
    except ValueError as error:
        return jsonify(status="error", reply=str(error), attribution=ATTRIBUTION_NOTICE), 400
    raw_message = data.message
    user_location = data.user_location
    last_context = data.last_context

    # Step 1: Parse intent & entities
    parsed = intent_parser.parse_query(raw_message, user_location, last_context, data.pending_category)
    status = parsed["status"]
    category = parsed.get("category")
    plural = CATEGORY_PLURALS.get(category, "places")
    safety_notice = EMERGENCY_NOTICE if category in ("hospital", "pharmacy") else None
    g.safety_notice = safety_notice

    if status == "unsupported_category":
        return jsonify({
            "status": "unsupported_category",
            "reply": (
                "I can help you find 9 types of places: hospitals, parks, cafes, restaurants, "
                "pharmacies, museums, landmarks/attractions, libraries, and supermarkets. "
                "Try asking something like 'nearest hospital to MG Road' or 'parks near me'."
            ),
            "suggested_categories": [
                "hospital", "park", "cafe", "restaurant", "pharmacy", "museum", "attraction", "library", "supermarket"
            ],
            "attribution": ATTRIBUTION_NOTICE
        }), 200

    if status == "needs_location":
        return jsonify({
            "status": "needs_location",
            "reply": (
                f"I'm ready to find nearby {plural}! Please click 'Use my GPS' to search around "
                "your current position, or mention a city or neighborhood (e.g. 'in Bengaluru' or 'near London')."
            ),
            "category": category,
            "safety_notice": safety_notice,
            "attribution": ATTRIBUTION_NOTICE
        }), 200

    # Step 2: Resolve reference coordinates
    resolved_lat = None
    resolved_lon = None
    resolved_label = None
    location_name = parsed.get("location_name")

    if parsed["is_near_me"] and user_location:
        resolved_lat = float(user_location["lat"])
        resolved_lon = float(user_location["lon"])
        resolved_label = "Your current GPS location"
    elif location_name:
        # Check if coordinates were already stored in last_context for the exact location
        if (last_context and 
            last_context.get("location_name", "").strip().lower() == location_name.strip().lower() and
            "lat" in last_context and "lon" in last_context):
            resolved_lat = float(last_context["lat"])
            resolved_lon = float(last_context["lon"])
            resolved_label = location_name
        else:
            geo_res = nominatim_client.geocode(location_name)
            if geo_res:
                resolved_lat = geo_res["lat"]
                resolved_lon = geo_res["lon"]
                resolved_label = geo_res["label"]
            else:
                return jsonify({
                    "status": "location_not_found",
                    "category": category,
                    "safety_notice": safety_notice,
                    "reply": f"I couldn't locate '{location_name}' on OpenStreetMap. Please check the spelling or specify a nearby city.",
                    "attribution": ATTRIBUTION_NOTICE
                }), 200
    elif user_location:
        resolved_lat = float(user_location["lat"])
        resolved_lon = float(user_location["lon"])
        resolved_label = "Your current GPS location"

    if resolved_lat is None or resolved_lon is None:
        return jsonify({
            "status": "needs_location",
            "category": category,
            "safety_notice": safety_notice,
            "reply": "Please specify a neighborhood or city, or enable your GPS location.",
            "attribution": ATTRIBUTION_NOTICE
        }), 200

    # Step 3: Query live Overpass API with automatic Nominatim POI failover
    overpass_failed = False
    try:
        places = overpass_client.search_places(
            category=category, center_lat=resolved_lat, center_lon=resolved_lon,
            reference_label=resolved_label, radius_m=5000, max_results=10,
        )
    except ServiceUnavailable:
        overpass_failed = True
        places = []

    # If Overpass servers are congested or returning empty, failover to Nominatim POI search
    if not places:
        try:
            places = nominatim_client.search_pois(
                category=category, center_lat=resolved_lat, center_lon=resolved_lon,
                reference_label=resolved_label, radius_km=5.0, max_results=10,
            )
        except ServiceUnavailable:
            if overpass_failed:
                raise
            app.logger.warning("Supplementary place lookup unavailable; primary search completed")
        if not places and overpass_failed:
            raise ServiceUnavailable("Place search is temporarily unavailable. Please try again.")

    if not places:
        return jsonify({
            "status": "no_results",
            "reply": f"No {plural} were returned within 5 km of {resolved_label}. Try a nearby neighborhood or a different category.",
            "safety_notice": safety_notice,
            "resolved_location": {
                "label": resolved_label,
                "lat": resolved_lat,
                "lon": resolved_lon,
                "source": "OpenStreetMap"
            },
            "context": {
                "location_name": resolved_label,
                "lat": resolved_lat,
                "lon": resolved_lon,
                "category": category
            },
            "places": [],
            "attribution": ATTRIBUTION_NOTICE
        }), 200

    # Step 4: Wikipedia enrichment for top returned places
    articles = [article_workers.submit(
        wiki_client.fetch_summary, wikipedia_tag=p.get("wikipedia_tag"),
        wikidata_tag=p.get("wikidata_tag"), place_name=p["name"],
    ) for p in places[:5]]
    for p, article in zip(places[:5], articles):
        summary, url = article.result()
        p["wiki_summary"] = summary
        p["wiki_url"] = url

    # Clean internal tags from final JSON
    for p in places:
        p.pop("wikipedia_tag", None)
        p.pop("wikidata_tag", None)

    # Step 5: Formulate honest summary reply
    top_place = places[0]
    total = len(places)
    reply_text = (
        f"I found {total} {plural if total != 1 else category} near {resolved_label}. "
        f"The closest returned result is {top_place['name']} ({top_place['distance_label']})."
    )

    return jsonify({
        "status": "ready",
        "reply": reply_text,
        "safety_notice": safety_notice,
        "resolved_location": {
            "label": resolved_label,
            "lat": resolved_lat,
            "lon": resolved_lon,
            "source": "Nominatim / OpenStreetMap"
        },
        "context": {
            "location_name": resolved_label,
            "lat": resolved_lat,
            "lon": resolved_lon,
            "category": category
        },
        "places": places,
        "attribution": ATTRIBUTION_NOTICE
    }), 200

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    port = int(os.environ.get("PORT", 5000))
    app.run(host="127.0.0.1", port=port, debug=False)
