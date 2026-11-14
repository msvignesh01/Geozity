"""Shared OSM classification for primary and fallback place searches."""

CATEGORY_TAGS: dict[str, tuple[tuple[str, str], ...]] = {
    "hospital": (("amenity", "hospital"), ("amenity", "clinic")),
    "park": (("leisure", "park"), ("leisure", "garden")),
    "cafe": (("amenity", "cafe"),),
    "restaurant": (("amenity", "restaurant"), ("amenity", "fast_food")),
    "pharmacy": (("amenity", "pharmacy"),),
    "museum": (("tourism", "museum"), ("tourism", "gallery")),
    "attraction": (("tourism", "attraction"), ("historic", "monument")),
    "library": (("amenity", "library"),),
    "supermarket": (("shop", "supermarket"),),
}
