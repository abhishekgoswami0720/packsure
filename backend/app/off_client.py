"""Open Food Facts API v3 Client for PackSure.

Implements official Open Food Facts Product-Opener API v3 querying,
polite User-Agent identification, rate-limit awareness, and schema normalization
into TruthLensProductRecord with field-level provenance tracking.
"""
from __future__ import annotations

import json
import urllib.request
import urllib.error
import datetime as dt
from typing import Any, Dict, Optional

from .schema import (
    DataSource,
    FieldProvenance,
    StandardNutrition100g,
    TruthLensProductRecord,
)

OFF_USER_AGENT = "PackSure/2.0 (support@packsure.in; https://truthlens-packsure.onrender.com; Open Source Food Intelligence)"
OFF_V3_ENDPOINT = "https://world.openfoodfacts.org/api/v3/product/{barcode}.json"
OFF_V2_ENDPOINT = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"


def fetch_open_food_facts_v3(barcode: str, timeout_sec: int = 6) -> Optional[TruthLensProductRecord]:
    """Queries Open Food Facts API v3 (falling back to v2) and normalizes into canonical record."""
    clean_barcode = barcode.strip()
    if not clean_barcode:
        return None

    raw_data = None
    source_used = DataSource.OPENFOODFACTS_V3

    # 1. Try v3 endpoint
    try:
        url_v3 = OFF_V3_ENDPOINT.format(barcode=clean_barcode)
        req_v3 = urllib.request.Request(url_v3, headers={
            "User-Agent": OFF_USER_AGENT,
            "Accept": "application/json"
        })
        with urllib.request.urlopen(req_v3, timeout=timeout_sec) as resp:
            if resp.status == 200:
                body = json.loads(resp.read().decode("utf-8"))
                if body.get("status") in ("success", 1) and "product" in body:
                    raw_data = body["product"]
    except Exception:
        # Fall back to v2
        raw_data = None

    # 2. Fallback to v2 endpoint if v3 didn't yield a product
    if not raw_data:
        try:
            url_v2 = OFF_V2_ENDPOINT.format(barcode=clean_barcode)
            req_v2 = urllib.request.Request(url_v2, headers={
                "User-Agent": OFF_USER_AGENT,
                "Accept": "application/json"
            })
            with urllib.request.urlopen(req_v2, timeout=timeout_sec) as resp:
                if resp.status == 200:
                    body = json.loads(resp.read().decode("utf-8"))
                    if body.get("status") == 1 and "product" in body:
                        raw_data = body["product"]
                        source_used = DataSource.OPENFOODFACTS_V2
        except Exception:
            return None

    if not raw_data:
        return None

    return normalize_off_product(clean_barcode, raw_data, source_used)


def normalize_off_product(barcode: str, p: Dict[str, Any], source: DataSource) -> TruthLensProductRecord:
    """Normalizes raw Open Food Facts payload into canonical TruthLens schema with field provenance."""
    now_iso = dt.datetime.now(dt.timezone.utc).isoformat()
    nutr_raw = p.get("nutriments", {})

    # Extract nutrition per 100g/ml
    get_val = lambda key: nutr_raw.get(f"{key}_100g", nutr_raw.get(key))
    sodium_val = get_val("sodium")
    if sodium_val is not None:
        try:
            sodium_mg = round(float(sodium_val) * 1000.0, 1)
        except (ValueError, TypeError):
            sodium_mg = None
    else:
        # Check salt
        salt_val = get_val("salt")
        sodium_mg = round(float(salt_val) * 400.0, 1) if salt_val is not None else None

    nutrition = StandardNutrition100g(
        energy_kcal=get_val("energy-kcal"),
        protein_g=get_val("proteins"),
        carbohydrates_g=get_val("carbohydrates"),
        total_sugars_g=get_val("sugars"),
        added_sugars_g=get_val("added-sugars"),
        fat_g=get_val("fat"),
        saturated_fat_g=get_val("saturated-fat"),
        trans_fat_g=get_val("trans-fat"),
        sodium_mg=sodium_mg,
        fiber_g=get_val("fiber"),
    )

    # Serving size extraction
    serving_g = None
    serving_raw = p.get("serving_size") or p.get("serving_quantity")
    if serving_raw:
        try:
            import re
            m = re.search(r"(\d+(?:\.\d+)?)", str(serving_raw))
            if m:
                serving_g = float(m.group(1))
        except Exception:
            pass

    # Allergens
    allergens = []
    allergens_tags = p.get("allergens_tags", [])
    for tag in allergens_tags:
        cleaned = tag.replace("en:", "").replace("-", " ").title()
        if cleaned and cleaned not in allergens:
            allergens.append(cleaned)

    # Field-level provenance tracking
    provenance = {
        "name": FieldProvenance(source=source, retrieved_at=now_iso, confidence=0.9),
        "ingredients_text": FieldProvenance(source=source, retrieved_at=now_iso, confidence=0.85),
        "nutrition_per_100g": FieldProvenance(source=source, retrieved_at=now_iso, confidence=0.85),
        "image_url": FieldProvenance(source=source, retrieved_at=now_iso, confidence=0.95),
    }

    # Nova group
    nova_group = None
    if p.get("nova_group"):
        try:
            nova_group = int(p["nova_group"])
        except (ValueError, TypeError):
            pass

    return TruthLensProductRecord(
        barcode=barcode,
        id=barcode,
        name=p.get("product_name") or p.get("product_name_en") or f"Product #{barcode}",
        brand=p.get("brands") or "",
        category=p.get("categories") or p.get("categories_tags", ["Packaged Food"])[0].replace("en:", "").title(),
        ingredients_text=p.get("ingredients_text") or p.get("ingredients_text_en") or "",
        nutrition_per_100g=nutrition,
        serving_size_g=serving_g,
        net_quantity=p.get("quantity") or "",
        mrp_inr=None,
        image_url=p.get("image_front_url") or p.get("image_url") or "",
        claims=p.get("labels_tags", []),
        allergens=allergens,
        nova_group=nova_group,
        nutriscore_grade=p.get("nutriscore_grade"),
        primary_source=source,
        retrieved_at=now_iso,
        provenance=provenance,
        raw_payload=p,
    )
