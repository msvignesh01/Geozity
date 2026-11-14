"""Validate the anonymous search boundary without coercing invalid values."""

from dataclasses import dataclass
from typing import Any

from services.intent_parser import CATEGORY_KEYWORDS

MAX_MESSAGE_LENGTH = 1000


def valid_coordinates(value: object) -> bool:
    if not isinstance(value, dict):
        return False
    for key, limit in (("lat", 90), ("lon", 180)):
        number = value.get(key)
        if isinstance(number, bool) or not isinstance(number, (float, int)):
            return False
        if not -limit <= number <= limit:
            return False
    return True


@dataclass(frozen=True)
class ChatRequest:
    message: str
    user_location: dict[str, Any] | None
    last_context: dict[str, Any] | None
    pending_category: str | None


def parse_chat_request(data: object) -> ChatRequest:
    if not isinstance(data, dict):
        raise ValueError("Please send a JSON object with a message field.")
    message = data.get("message")
    if not isinstance(message, str) or not message.strip():
        raise ValueError("Please enter a question or location to search.")
    if len(message) > MAX_MESSAGE_LENGTH:
        raise ValueError(f"Please keep your question within {MAX_MESSAGE_LENGTH} characters.")

    user_location = data.get("user_location")
    if user_location is not None and not valid_coordinates(user_location):
        raise ValueError("Device location must contain valid numeric latitude and longitude.")

    context = data.get("last_context")
    if context is not None:
        if not valid_coordinates(context):
            raise ValueError("Previous search location is invalid. Clear memory and try again.")
        label = context.get("location_name")
        if not isinstance(label, str) or not label.strip() or len(label) > 1000:
            raise ValueError("Previous search location is invalid. Clear memory and try again.")
        if not isinstance(context.get("category"), str) or context["category"] not in CATEGORY_KEYWORDS:
            raise ValueError("Previous search category is invalid. Clear memory and try again.")
    pending = data.get("pending_category")
    if pending is not None and (not isinstance(pending, str) or pending not in CATEGORY_KEYWORDS):
        raise ValueError("Pending search category is invalid. Please choose a place category.")
    return ChatRequest(message.strip(), user_location, context, pending)
