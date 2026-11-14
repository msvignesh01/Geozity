import re
from typing import Dict, Any, Optional

# Supported category synonyms and keywords mapped to primary category key
CATEGORY_KEYWORDS = {
    "hospital": ["hospital", "hospitals", "clinic", "clinics", "emergency room", "medical center", "healthcare"],
    "park": ["park", "parks", "garden", "gardens", "green space", "botanical garden"],
    "cafe": ["cafe", "cafes", "coffee shop", "coffee shops", "coffee", "espresso", "bakery"],
    "restaurant": ["restaurant", "restaurants", "food", "places to eat", "dinner", "lunch", "fast food", "eatery", "dining"],
    "pharmacy": ["pharmacy", "pharmacies", "chemist", "drugstore", "medical store", "apothecary"],
    "museum": ["museum", "museums", "art gallery", "galleries", "gallery", "exhibition"],
    "attraction": ["tourist attraction", "tourist attractions", "attraction", "attractions", "landmark", "landmarks", "monument", "monuments", "sight", "sights"],
    "library": ["library", "libraries", "reading room", "public library"],
    "supermarket": ["supermarket", "supermarkets", "grocery store", "grocery", "groceries", "mart", "hypermarket"]
}

CATEGORY_PLURALS = {
    "hospital": "hospitals", "park": "parks", "cafe": "cafes",
    "restaurant": "restaurants", "pharmacy": "pharmacies", "museum": "museums",
    "attraction": "attractions", "library": "libraries", "supermarket": "supermarkets",
}

FOLLOWUP_PATTERNS = [
    r"^(?:what about|how about|show me|any)?\s*([a-z\s]+)\s+instead\??$",
    r"^(?:what about|how about|and)\s+([a-z\s]+)\??$",
    r"^(?:switch to|change to)\s+([a-z\s]+)$"
]

class IntentParser:
    """
    Robust rule-based query parser that extracts place categories and location targets,
    handles follow-up queries using conversation context, and flags near-me triggers.
    """

    def parse_category(self, text: str) -> Optional[str]:
        lower = text.lower()
        matches = []
        for cat, synonyms in CATEGORY_KEYWORDS.items():
            for syn in synonyms:
                pattern = r"\b" + re.escape(syn) + r"\b"
                match = re.search(pattern, lower)
                if match:
                    matches.append((match.start(), -len(syn), cat))
        # Category words in a later street or park name must not override the
        # requested category: "cafes near Hyde Park" still means cafes.
        return min(matches)[2] if matches else None

    def parse_query(
        self,
        message: str,
        user_location: Optional[Dict[str, float]] = None,
        last_context: Optional[Dict[str, Any]] = None,
        pending_category: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Parses user intent from text and context.
        Returns a dictionary:
        {
            "category": Optional[str],
            "location_name": Optional[str],
            "is_near_me": bool,
            "is_followup": bool,
            "status": "ready" | "needs_location" | "unsupported_category"
        }
        """
        clean_text = message.strip()
        lower = clean_text.lower()

        # Determine explicit location first so "what about parks in Paris"
        # cannot silently reuse the previous city.
        location_name = None
        prep_pattern = r"\b(?:in|near|to|around|at)\s+(.+?)\s*[?!.]*$"
        location_text = re.sub(r"\bplaces to eat\b", "restaurants", clean_text, flags=re.IGNORECASE)
        location_match = re.search(prep_pattern, location_text, re.IGNORECASE)
        if location_match:
            extracted = location_match.group(1).strip().rstrip("?!.").strip()
            if extracted and extracted.casefold() not in ("me", "here", "my location", "current location"):
                # "switch to cafes" is a category follow-up, not a city.
                if not re.match(r"^(?:switch|change)\s+to\b", lower):
                    location_name = extracted

        # Check for follow-up pattern like "cafes instead" or "what about parks"
        is_followup = False
        category = None

        for pat in FOLLOWUP_PATTERNS:
            m = re.match(pat, lower)
            if m:
                extracted_phrase = m.group(1).strip()
                cat_match = self.parse_category(extracted_phrase)
                if cat_match:
                    category = cat_match
                    is_followup = True
                    break

        if not category:
            category = self.parse_category(clean_text)

        if not category and pending_category in CATEGORY_KEYWORDS:
            category = pending_category
            if not location_name and not re.search(r"\b(?:near me|near here|nearby|around me|in my area|my location|current location)\b", lower):
                location_name = clean_text.rstrip("?!.").strip()

        # Check for near me indicators
        near_me_pattern = r"\b(near me|near here|nearby|closest to me|around me|in my area|my location|current location)\b"
        is_near_me = bool(re.search(near_me_pattern, lower))
        if is_near_me and location_name:
            # "nearby parks in London" names an explicit search area.
            is_near_me = False

        if location_name and not category and last_context:
            category = last_context.get("category")
            is_followup = True

        if is_near_me:
            location_name = None

        # Fallback location from context if user only mentioned a category (e.g. "cafes", "hospitals")
        if not is_near_me and not location_name and last_context and last_context.get("location_name") and category:
            location_name = last_context["location_name"]
            is_followup = True

        # Validation of intent
        if not category:
            return {
                "category": None,
                "location_name": location_name,
                "is_near_me": is_near_me,
                "is_followup": is_followup,
                "status": "unsupported_category"
            }

        if is_near_me and (not user_location or "lat" not in user_location or "lon" not in user_location):
            return {
                "category": category,
                "location_name": None,
                "is_near_me": True,
                "is_followup": is_followup,
                "status": "needs_location"
            }

        if not location_name and (not user_location or "lat" not in user_location):
            return {
                "category": category,
                "location_name": None,
                "is_near_me": False,
                "is_followup": is_followup,
                "status": "needs_location"
            }

        return {
            "category": category,
            "location_name": location_name,
            "is_near_me": is_near_me,
            "is_followup": is_followup,
            "status": "ready"
        }
