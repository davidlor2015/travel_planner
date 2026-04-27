# Path: app/api/middleware/request_metrics.py
# Summary: Implements request metrics functionality.

from __future__ import annotations

import logging
import time
import uuid

from fastapi import Request

logger = logging.getLogger("waypoint.request")

# Product health counters — incremented in-process and written to the log so
# any log aggregator can derive rates without a separate metrics backend.
# These are the counters that answer "is the product working?", not business
# or funnel questions.
_counters: dict[str, int] = {
    "route_error_4xx": 0,
    "route_error_5xx": 0,
}


def increment(counter: str) -> None:
    """Increment a named product health counter from anywhere in the stack."""
    if counter in _counters:
        _counters[counter] += 1
    else:
        _counters[counter] = 1


def get_counters() -> dict[str, int]:
    """Return a snapshot of all counters. Values are cumulative since process start."""
    return dict(_counters)


async def request_metrics_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]

    # Make the request_id available to downstream code via request.state so
    # service-layer loggers can include it in structured log records without
    # being threaded through every function signature.
    request.state.request_id = request_id

    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000

    response.headers["x-request-id"] = request_id

    status = response.status_code
    if 400 <= status < 500:
        increment("route_error_4xx")
    elif status >= 500:
        increment("route_error_5xx")

    logger.info(
        "method=%s path=%s status=%s duration_ms=%.1f request_id=%s",
        request.method,
        request.url.path,
        status,
        duration_ms,
        request_id,
    )
    return response
