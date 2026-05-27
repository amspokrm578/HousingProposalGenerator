import hashlib
import os

import requests
from django.core.cache import cache

PLUTO_JSON_URL = "https://data.cityofnewyork.us/resource/64uk-42ks.json"
CACHE_TTL = 60 * 20
MAX_PARCELS = 500

_SELECT = (
    "latitude,longitude,address,ownername,lotarea,landuse,bldgclass,"
    "residfar,builtfar,numfloors,zonedist1,yearbuilt,borough,block,lot,bbl"
)


def _build_where(north: float, south: float, east: float, west: float) -> str:
    bbox = (
        f"latitude >= {south} AND latitude <= {north} "
        f"AND longitude >= {west} AND longitude <= {east}"
    )
    criteria = (
        "landuse = '11'"
        " OR landuse = '16'"
        " OR (residfar IS NOT NULL AND builtfar IS NOT NULL"
        "     AND residfar > 0 AND builtfar < residfar * 0.5)"
        " OR (numfloors IS NOT NULL AND numfloors > 0 AND numfloors <= 2"
        "     AND residfar IS NOT NULL AND residfar >= 4)"
    )
    return f"{bbox} AND lotarea >= 2500 AND ({criteria})"


def _to_geojson(rows: list) -> dict:
    features = []
    for row in rows:
        lat = row.get("latitude")
        lon = row.get("longitude")
        if not lat or not lon:
            continue
        props = {k: v for k, v in row.items() if k not in ("latitude", "longitude")}
        props["_lat"] = float(lat)
        props["_lng"] = float(lon)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(lon), float(lat)]},
            "properties": props,
        })
    return {"type": "FeatureCollection", "features": features}


def fetch_opportunity_parcels(north: float, south: float, east: float, west: float) -> dict:
    cache_key = "parcels:" + hashlib.md5(
        f"{north:.5f},{south:.5f},{east:.5f},{west:.5f}".encode()
    ).hexdigest()

    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    params: dict = {
        "$where": _build_where(north, south, east, west),
        "$limit": MAX_PARCELS,
        "$select": _SELECT,
    }
    token = os.environ.get("NYC_OPEN_DATA_APP_TOKEN")
    if token:
        params["$$app_token"] = token

    resp = requests.get(PLUTO_JSON_URL, params=params, timeout=15)
    resp.raise_for_status()
    geojson = _to_geojson(resp.json())

    cache.set(cache_key, geojson, CACHE_TTL)
    return geojson
