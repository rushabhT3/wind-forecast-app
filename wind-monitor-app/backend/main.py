"""
UK Wind Forecast Monitor - FastAPI Backend
Fetches and processes data from BMRS Elexon API (January 2024 only).
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="UK Wind Forecast Monitor API",
    description="Serves actual and forecasted UK wind generation data from BMRS Elexon.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── BMRS API constants ───────────────────────────────────────────────────────
BMRS_BASE = "https://data.elexon.co.uk/bmrs/api/v1"
FUELHH_URL = f"{BMRS_BASE}/datasets/FUELHH/stream"
WINDFOR_URL = f"{BMRS_BASE}/datasets/WINDFOR/stream"

HEADERS = {
    "Accept": "application/json",
    "User-Agent": "WindMonitorApp/1.0",
}

# January 2024 boundary (UTC)
JAN_2024_START = datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
JAN_2024_END   = datetime(2024, 1, 31, 23, 30, 0, tzinfo=timezone.utc)

# ─── Pydantic response models ─────────────────────────────────────────────────
class DataPoint(BaseModel):
    time: str       # ISO-8601 UTC string
    value: float    # MW


class ChartResponse(BaseModel):
    actuals: list[DataPoint]
    forecasts: list[DataPoint]


# ─── Helper: clamp timestamps to Jan 2024 ────────────────────────────────────
def clamp_to_jan2024(dt: datetime) -> datetime:
    if dt < JAN_2024_START:
        return JAN_2024_START
    if dt > JAN_2024_END:
        return JAN_2024_END
    return dt


def to_iso_z(dt: datetime) -> str:
    """Return ISO-8601 with Z suffix required by BMRS."""
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_dt(s: str) -> datetime:
    """Parse ISO-8601 string (with or without Z/offset) to UTC datetime."""
    from dateutil import parser as dtparser
    dt = dtparser.parse(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


# ─── Fetch helpers ────────────────────────────────────────────────────────────
async def fetch_actuals(start: datetime, end: datetime) -> list[DataPoint]:
    """
    Fetch FUELHH wind actuals from BMRS for the given UTC range.
    Returns list of DataPoint sorted by time.
    """
    params = {
        "settlementDateFrom": start.strftime("%Y-%m-%d"),
        "settlementDateTo":   end.strftime("%Y-%m-%d"),
        "fuelType":           "WIND",
        "format":             "json",
    }

    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        resp = await client.get(FUELHH_URL, params=params, headers=HEADERS)
        resp.raise_for_status()
        raw = resp.json()

    # The stream endpoint returns a JSON array directly
    if isinstance(raw, dict):
        items = raw.get("data", raw.get("items", []))
    else:
        items = raw

    points: list[DataPoint] = []
    for item in items:
        try:
            fuel = item.get("fuelType", "")
            if fuel.upper() != "WIND":
                continue
            st = parse_dt(item["startTime"])
            if st < start or st > end:
                continue
            gen = float(item["generation"])
            points.append(DataPoint(time=to_iso_z(st), value=gen))
        except (KeyError, ValueError, TypeError):
            continue

    points.sort(key=lambda p: p.time)
    return points


async def fetch_forecasts(
    start: datetime,
    end: datetime,
    horizon_hours: int,
) -> list[DataPoint]:
    """
    Fetch WINDFOR forecasts from BMRS for the given UTC range.

    For each target time T, picks the LATEST forecast whose publishTime <= T - horizon_hours.
    If no qualifying forecast exists for a target time, that point is omitted.
    """
    params = {
        "publishDateTimeFrom": to_iso_z(start - timedelta(hours=horizon_hours + 48)),
        "publishDateTimeTo":   to_iso_z(end),
        "format":              "json",
    }

    async with httpx.AsyncClient(timeout=90.0, follow_redirects=True) as client:
        resp = await client.get(WINDFOR_URL, params=params, headers=HEADERS)
        resp.raise_for_status()
        raw = resp.json()

    if isinstance(raw, dict):
        items = raw.get("data", raw.get("items", []))
    else:
        items = raw

    # Build: target_time -> list of (publishTime, generation)
    from collections import defaultdict
    target_map: dict[str, list[tuple[datetime, float]]] = defaultdict(list)

    for item in items:
        try:
            st = parse_dt(item["startTime"])
            pt = parse_dt(item["publishTime"])
            gen = float(item["generation"])

            # Only keep items whose target time falls in [start, end]
            if st < start or st > end:
                continue

            # Only keep items whose forecast horizon is 0-48 hrs
            horizon = (st - pt).total_seconds() / 3600.0
            if horizon < 0 or horizon > 48:
                continue

            key = to_iso_z(st)
            target_map[key].append((pt, gen))
        except (KeyError, ValueError, TypeError):
            continue

    # For each target time, pick latest forecast where publishTime <= target - horizon_hours
    cutoff_delta = timedelta(hours=horizon_hours)
    points: list[DataPoint] = []

    for key, entries in target_map.items():
        target_dt = parse_dt(key)
        cutoff_dt = target_dt - cutoff_delta

        qualifying = [(pt, gen) for pt, gen in entries if pt <= cutoff_dt]
        if not qualifying:
            continue  # No qualifying forecast → omit this point

        # Pick the latest (most recent) qualifying forecast
        latest = max(qualifying, key=lambda x: x[0])
        points.append(DataPoint(time=key, value=latest[1]))

    points.sort(key=lambda p: p.time)
    return points


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.get("/api/chart", response_model=ChartResponse)
async def get_chart_data(
    start_time: str = Query(..., description="ISO-8601 UTC start time, e.g. 2024-01-10T08:00:00Z"),
    end_time:   str = Query(..., description="ISO-8601 UTC end time,   e.g. 2024-01-11T08:00:00Z"),
    horizon_hours: int = Query(4, ge=0, le=48, description="Forecast horizon in hours (0-48)"),
):
    """
    Returns actual and forecasted UK wind generation for the given time window.
    Clamps both start and end to January 2024. Applies forecast-horizon filter.
    """
    try:
        start = parse_dt(start_time)
        end   = parse_dt(end_time)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid datetime format. Use ISO-8601 with Z suffix.")

    if start >= end:
        raise HTTPException(status_code=400, detail="start_time must be before end_time.")

    # Clamp to Jan 2024
    start = clamp_to_jan2024(start)
    end   = clamp_to_jan2024(end)

    if start >= end:
        raise HTTPException(
            status_code=400,
            detail="After clamping to January 2024, the date range is empty.",
        )

    try:
        actuals, forecasts = await asyncio.gather(
            fetch_actuals(start, end),
            fetch_forecasts(start, end, horizon_hours),
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"BMRS API error: {exc.response.status_code} - {exc.response.text[:200]}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Network error contacting BMRS: {exc}")

    return ChartResponse(actuals=actuals, forecasts=forecasts)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "wind-monitor-backend"}
