"""Small, process-local caches; callers never receive mutable cache-owned objects."""

import copy
import threading
import time
from collections import OrderedDict
from typing import Generic, Hashable, TypeVar

T = TypeVar("T")


class TTLCache(Generic[T]):
    def __init__(self, ttl_seconds: int = 900, max_entries: int = 256):
        self._ttl = ttl_seconds
        self._max_entries = max_entries
        self._entries: OrderedDict[Hashable, tuple[float, T]] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: Hashable) -> T | None:
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None
            expires, value = entry
            if expires <= time.monotonic():
                del self._entries[key]
                return None
            self._entries.move_to_end(key)
            return copy.deepcopy(value)

    def set(self, key: Hashable, value: T) -> None:
        with self._lock:
            now = time.monotonic()
            for expired in [k for k, (expires, _) in self._entries.items() if expires <= now]:
                del self._entries[expired]
            self._entries[key] = (now + self._ttl, copy.deepcopy(value))
            self._entries.move_to_end(key)
            while len(self._entries) > self._max_entries:
                self._entries.popitem(last=False)
