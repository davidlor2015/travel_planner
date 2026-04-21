from __future__ import annotations

import re


_WHITESPACE_RE = re.compile(r"\s+")
_COMMA_RE = re.compile(r"\s*,\s*")


def normalize_trip_destination(value: str) -> str:
    normalized = _WHITESPACE_RE.sub(" ", value).strip()
    normalized = _COMMA_RE.sub(", ", normalized).strip(" ,")
    if len(normalized) < 2:
        raise ValueError("destination must be at least 2 characters long")
    if not any(char.isalpha() for char in normalized):
        raise ValueError("destination must include letters")
    return normalized
