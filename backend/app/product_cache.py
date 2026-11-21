"""SQLite-backed multi-source product cache and provenance repository for TruthLens.

Implements thread-safe local caching, field-level provenance tracking,
conflict detection (no silent overwriting), and user review/correction workflows.
"""
from __future__ import annotations

import json
import sqlite3
import datetime as dt
from pathlib import Path
from typing import Any, Dict, List, Optional
from threading import RLock

from .schema import (
    DataSource,
    FieldConflict,
    FieldProvenance,
    StandardNutrition100g,
    TruthLensProductRecord,
)

CACHE_DIR = Path(__file__).parent / "knowledge"
DB_PATH = CACHE_DIR / "product_cache.sqlite"
_LOCK = RLock()


def get_db_connection() -> sqlite3.Connection:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn


def init_cache_db() -> None:
    """Initializes tables for cached products, provenance, conflicts, and audit log."""
    with _LOCK, get_db_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS product_cache (
                barcode TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                name TEXT NOT NULL,
                brand TEXT,
                category TEXT,
                ingredients_text TEXT,
                nutrition_json TEXT,
                serving_size_g REAL,
                net_quantity TEXT,
                mrp_inr REAL,
                image_url TEXT,
                claims_json TEXT,
                allergens_json TEXT,
                nova_group INTEGER,
                nutriscore_grade TEXT,
                primary_source TEXT NOT NULL,
                retrieved_at TEXT NOT NULL,
                provenance_json TEXT,
                conflicts_json TEXT,
                raw_payload_json TEXT,
                updated_at TEXT NOT NULL
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                barcode TEXT NOT NULL,
                action TEXT NOT NULL,
                actor TEXT NOT NULL,
                details_json TEXT NOT NULL,
                timestamp TEXT NOT NULL
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_cache_name ON product_cache(name);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_cache_source ON product_cache(primary_source);")
        conn.commit()


# Initialize on import
init_cache_db()


def _row_to_record(row: sqlite3.Row) -> TruthLensProductRecord:
    nutrition_dict = json.loads(row["nutrition_json"] or "{}")
    claims_list = json.loads(row["claims_json"] or "[]")
    allergens_list = json.loads(row["allergens_json"] or "[]")
    prov_raw = json.loads(row["provenance_json"] or "{}")
    conflicts_raw = json.loads(row["conflicts_json"] or "[]")
    raw_payload = json.loads(row["raw_payload_json"]) if row["raw_payload_json"] else None

    provenance = {}
    for k, v in prov_raw.items():
        provenance[k] = FieldProvenance(**v)

    conflicts = [FieldConflict(**c) for c in conflicts_raw]

    return TruthLensProductRecord(
        barcode=row["barcode"],
        id=row["product_id"],
        name=row["name"],
        brand=row["brand"] or "",
        category=row["category"] or "Packaged Commodity",
        ingredients_text=row["ingredients_text"] or "",
        nutrition_per_100g=StandardNutrition100g(**nutrition_dict),
        serving_size_g=row["serving_size_g"],
        net_quantity=row["net_quantity"] or "",
        mrp_inr=row["mrp_inr"],
        image_url=row["image_url"] or "",
        claims=claims_list,
        allergens=allergens_list,
        nova_group=row["nova_group"],
        nutriscore_grade=row["nutriscore_grade"],
        primary_source=DataSource(row["primary_source"]),
        retrieved_at=row["retrieved_at"],
        provenance=provenance,
        conflicts=conflicts,
        raw_payload=raw_payload,
    )


def get_cached_product(barcode: str, max_age_days: int = 14) -> Optional[TruthLensProductRecord]:
    """Retrieves normalized product from cache if available and not expired."""
    clean_barcode = barcode.strip()
    if not clean_barcode:
        return None

    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM product_cache WHERE barcode = ?", (clean_barcode,)).fetchone()
        if not row:
            return None

        # Expiry logic: verified_local and user_corrected never expire; 3rd party expires after max_age_days
        src = row["primary_source"]
        if src in (DataSource.OPENFOODFACTS_V3.value, DataSource.OPENFOODFACTS_V2.value):
            try:
                retrieved_dt = dt.datetime.fromisoformat(row["retrieved_at"].replace("Z", "+00:00"))
                age_days = (dt.datetime.now(dt.timezone.utc) - retrieved_dt).total_seconds() / 86400.0
                if age_days > max_age_days:
                    return None  # Stale, needs refresh
            except Exception:
                pass

        return _row_to_record(row)


def save_product_to_cache(record: TruthLensProductRecord) -> None:
    """Inserts or updates a product record in the cache, preserving conflicts without silent overwrites."""
    now_iso = dt.datetime.now(dt.timezone.utc).isoformat()
    clean_barcode = record.barcode.strip()

    with _LOCK, get_db_connection() as conn:
        existing_row = conn.execute("SELECT * FROM product_cache WHERE barcode = ?", (clean_barcode,)).fetchone()

        conflicts = list(record.conflicts)
        provenance = dict(record.provenance)

        if existing_row:
            existing = _row_to_record(existing_row)

            # Never overwrite a user_corrected or verified_local record with an automated third-party record!
            if existing.primary_source in (DataSource.USER_CORRECTED, DataSource.VERIFIED_LOCAL) and record.primary_source != DataSource.USER_CORRECTED:
                # Keep existing verified record, but log that external data arrived
                conn.execute("""
                    INSERT INTO audit_log (barcode, action, actor, details_json, timestamp)
                    VALUES (?, 'EXTERNAL_UPDATE_SKIPPED', ?, ?, ?)
                """, (clean_barcode, record.primary_source.value, json.dumps({"reason": "Local verified/user-corrected data takes precedence"}), now_iso))
                conn.commit()
                return

            # Check for conflicting field values and record without silent overwriting
            for field in ["name", "ingredients_text", "brand"]:
                old_val = getattr(existing, field, "")
                new_val = getattr(record, field, "")
                if old_val and new_val and old_val.strip().lower() != new_val.strip().lower():
                    conflicts.append(FieldConflict(
                        field_name=field,
                        previous_value=old_val,
                        incoming_value=new_val,
                        previous_source=existing.primary_source.value,
                        incoming_source=record.primary_source.value,
                        recorded_at=now_iso,
                    ))

            # Inherit existing conflicts
            for ec in existing.conflicts:
                if not any(c.field_name == ec.field_name and c.recorded_at == ec.recorded_at for c in conflicts):
                    conflicts.append(ec)

        nutr_json = json.dumps(record.nutrition_per_100g.model_dump())
        claims_json = json.dumps(record.claims)
        allergens_json = json.dumps(record.allergens)
        prov_json = json.dumps({k: v.model_dump() for k, v in provenance.items()})
        conflicts_json = json.dumps([c.model_dump() for c in conflicts])
        raw_json = json.dumps(record.raw_payload) if record.raw_payload else None

        conn.execute("""
            INSERT INTO product_cache (
                barcode, product_id, name, brand, category, ingredients_text,
                nutrition_json, serving_size_g, net_quantity, mrp_inr, image_url,
                claims_json, allergens_json, nova_group, nutriscore_grade,
                primary_source, retrieved_at, provenance_json, conflicts_json,
                raw_payload_json, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(barcode) DO UPDATE SET
                product_id = excluded.product_id,
                name = excluded.name,
                brand = excluded.brand,
                category = excluded.category,
                ingredients_text = excluded.ingredients_text,
                nutrition_json = excluded.nutrition_json,
                serving_size_g = excluded.serving_size_g,
                net_quantity = excluded.net_quantity,
                mrp_inr = excluded.mrp_inr,
                image_url = excluded.image_url,
                claims_json = excluded.claims_json,
                allergens_json = excluded.allergens_json,
                nova_group = excluded.nova_group,
                nutriscore_grade = excluded.nutriscore_grade,
                primary_source = excluded.primary_source,
                retrieved_at = excluded.retrieved_at,
                provenance_json = excluded.provenance_json,
                conflicts_json = excluded.conflicts_json,
                raw_payload_json = excluded.raw_payload_json,
                updated_at = excluded.updated_at;
        """, (
            clean_barcode, record.id, record.name, record.brand, record.category,
            record.ingredients_text, nutr_json, record.serving_size_g, record.net_quantity,
            record.mrp_inr, record.image_url, claims_json, allergens_json,
            record.nova_group, record.nutriscore_grade, record.primary_source.value,
            record.retrieved_at, prov_json, conflicts_json, raw_json, now_iso
        ))

        conn.commit()


def apply_user_correction_to_cache(barcode: str, corrections: Dict[str, Any], actor: str = "consumer") -> TruthLensProductRecord:
    """Applies human review and correction, storing provenance and audit history."""
    clean_barcode = barcode.strip()
    now_iso = dt.datetime.now(dt.timezone.utc).isoformat()

    with _LOCK, get_db_connection() as conn:
        existing_row = conn.execute("SELECT * FROM product_cache WHERE barcode = ?", (clean_barcode,)).fetchone()
        if not existing_row:
            # Create fresh record from user corrections
            record = TruthLensProductRecord(
                barcode=clean_barcode,
                id=corrections.get("id", clean_barcode),
                name=corrections.get("name", f"Product #{clean_barcode}"),
                brand=corrections.get("brand", ""),
                category=corrections.get("category", "Packaged Commodity"),
                ingredients_text=corrections.get("ingredients_text", ""),
                nutrition_per_100g=StandardNutrition100g(**corrections.get("nutrition_per_100g", {})),
                serving_size_g=corrections.get("serving_size_g"),
                net_quantity=corrections.get("net_quantity", ""),
                mrp_inr=corrections.get("mrp_inr"),
                image_url=corrections.get("image_url", ""),
                primary_source=DataSource.USER_CORRECTED,
                retrieved_at=now_iso,
                provenance={k: FieldProvenance(source=DataSource.USER_CORRECTED, retrieved_at=now_iso, notes=f"Edited by {actor}") for k in corrections.keys()}
            )
            save_product_to_cache(record)
            return record

        existing = _row_to_record(existing_row)
        provenance = dict(existing.provenance)
        conflicts = list(existing.conflicts)

        # Record changes and update provenance
        for k, v in corrections.items():
            if k == "nutrition_per_100g" and isinstance(v, dict):
                old_nutr = existing.nutrition_per_100g.model_dump()
                conflicts.append(FieldConflict(
                    field_name="nutrition_per_100g",
                    previous_value=old_nutr,
                    incoming_value=v,
                    previous_source=existing.primary_source.value,
                    incoming_source=DataSource.USER_CORRECTED.value,
                    recorded_at=now_iso,
                    resolved=True,
                    resolution_notes=f"Overridden by {actor}"
                ))
                existing.nutrition_per_100g = StandardNutrition100g(**v)
                provenance["nutrition_per_100g"] = FieldProvenance(
                    source=DataSource.USER_CORRECTED,
                    retrieved_at=now_iso,
                    confidence=1.0,
                    notes=f"Corrected by {actor}"
                )
            elif hasattr(existing, k) and v is not None:
                old_val = getattr(existing, k)
                if str(old_val).strip() != str(v).strip():
                    conflicts.append(FieldConflict(
                        field_name=k,
                        previous_value=old_val,
                        incoming_value=v,
                        previous_source=existing.primary_source.value,
                        incoming_source=DataSource.USER_CORRECTED.value,
                        recorded_at=now_iso,
                        resolved=True,
                        resolution_notes=f"Overridden by {actor}"
                    ))
                    setattr(existing, k, v)
                    provenance[k] = FieldProvenance(
                        source=DataSource.USER_CORRECTED,
                        retrieved_at=now_iso,
                        confidence=1.0,
                        notes=f"Corrected by {actor}"
                    )

        existing.primary_source = DataSource.USER_CORRECTED
        existing.retrieved_at = now_iso
        existing.provenance = provenance
        existing.conflicts = conflicts

        save_product_to_cache(existing)

        # Audit log entry
        conn.execute("""
            INSERT INTO audit_log (barcode, action, actor, details_json, timestamp)
            VALUES (?, 'USER_CORRECTION_APPLIED', ?, ?, ?)
        """, (clean_barcode, actor, json.dumps(corrections), now_iso))
        conn.commit()

        return existing


def get_cache_coverage_report() -> Dict[str, Any]:
    """Computes transparent data coverage, source breakdown, and completeness rates."""
    with get_db_connection() as conn:
        total = conn.execute("SELECT COUNT(*) as cnt FROM product_cache").fetchone()["cnt"]

        # Sources breakdown
        sources_rows = conn.execute("SELECT primary_source, COUNT(*) as cnt FROM product_cache GROUP BY primary_source").fetchall()
        sources_breakdown = {r["primary_source"]: r["cnt"] for r in sources_rows}

        # Field completeness
        with_ing = conn.execute("SELECT COUNT(*) as cnt FROM product_cache WHERE ingredients_text IS NOT NULL AND length(ingredients_text) > 5").fetchone()["cnt"]
        with_nutr = conn.execute("SELECT COUNT(*) as cnt FROM product_cache WHERE nutrition_json IS NOT NULL AND length(nutrition_json) > 10").fetchone()["cnt"]
        with_serving = conn.execute("SELECT COUNT(*) as cnt FROM product_cache WHERE serving_size_g IS NOT NULL AND serving_size_g > 0").fetchone()["cnt"]
        with_img = conn.execute("SELECT COUNT(*) as cnt FROM product_cache WHERE image_url IS NOT NULL AND length(image_url) > 5").fetchone()["cnt"]
        conflicts_cnt = conn.execute("SELECT COUNT(*) as cnt FROM product_cache WHERE conflicts_json IS NOT NULL AND conflicts_json != '[]'").fetchone()["cnt"]

        # Audit log count
        audits_cnt = conn.execute("SELECT COUNT(*) as cnt FROM audit_log").fetchone()["cnt"]

    calc_pct = lambda c: round((c / total * 100.0), 1) if total > 0 else 0.0

    return {
        "status": "operational",
        "cache_database": str(DB_PATH.name),
        "total_cached_products": total,
        "sources_breakdown": sources_breakdown,
        "completeness_rates": {
            "ingredients_declared_pct": calc_pct(with_ing),
            "nutrition_table_pct": calc_pct(with_nutr),
            "serving_size_declared_pct": calc_pct(with_serving),
            "front_image_pct": calc_pct(with_img),
        },
        "records_with_logged_conflicts": conflicts_cnt,
        "audit_log_entries": audits_cnt,
        "audit_timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
        "disclaimer": "TruthLens never fabricates missing nutritional data. Products with incomplete labels display explicit declaration gaps.",
        "official_citation_registry": [
            {"authority": "Codex Alimentarius", "standard": "CODEX STAN 192-1995 (GSFA)", "scope": "Global additive provisions & INS numbers"},
            {"authority": "FAO/WHO JECFA", "standard": "Joint FAO/WHO Expert Committee on Food Additives", "scope": "Toxicological monographs & ADI evaluations"},
            {"authority": "FSSAI", "standard": "Food Safety and Standards (Labelling and Display) Regulations, 2020", "scope": "Indian packaged food labelling & allergen declarations"},
            {"authority": "FSSAI", "standard": "Food Safety and Standards (Advertising and Claims) Regulations, 2018", "scope": "Nutritional and health claim criteria"},
            {"authority": "Ministry of Consumer Affairs", "standard": "Legal Metrology (Packaged Commodities) Rules, 2011", "scope": "Mandatory declarations, font height, Unit Sale Price"},
            {"authority": "Open Food Facts", "standard": "Open Food Facts API v3", "scope": "Crowdsourced and open product barcode database"}
        ]
    }
