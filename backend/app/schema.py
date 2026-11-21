"""TruthLens Canonical Product Record and Data Provenance Schema.

Preserves origin source, retrieval timestamp, field-level lineage,
and conflict history without silent overwriting.
"""
from __future__ import annotations

import datetime as dt
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DataSource(str, Enum):
    VERIFIED_LOCAL = "verified_local"       # Hand-curated / officially audited Indian product
    OPENFOODFACTS_V3 = "openfoodfacts_v3"   # Open Food Facts API v3
    OPENFOODFACTS_V2 = "openfoodfacts_v2"   # Open Food Facts API v2 (fallback)
    OCR_EXTRACTED = "ocr_extracted"         # Multi-modal OCR / Gemini Vision from packaging image
    USER_CORRECTED = "user_corrected"       # Consumer or inspector reviewed & corrected
    USDA_FDC = "usda_fdc"                   # USDA FoodData Central (generic composition baseline)
    AI_SYNTHESIZED = "ai_synthesized"       # PackSure AI / Gemini synthesis for unindexed barcodes


class FieldProvenance(BaseModel):
    """Tracks origin and timestamp for individual product fields."""
    source: DataSource
    retrieved_at: str = Field(default_factory=lambda: dt.datetime.now(dt.timezone.utc).isoformat())
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    notes: Optional[str] = None


class FieldConflict(BaseModel):
    """Preserves conflicting historical values without silent overwriting."""
    field_name: str
    previous_value: Any
    incoming_value: Any
    previous_source: str
    incoming_source: str
    recorded_at: str = Field(default_factory=lambda: dt.datetime.now(dt.timezone.utc).isoformat())
    resolved: bool = False
    resolution_notes: Optional[str] = None


class StandardNutrition100g(BaseModel):
    """Standardized nutrition facts per 100g or 100ml according to FSSAI & Codex guidelines."""
    energy_kcal: Optional[float] = None
    protein_g: Optional[float] = None
    carbohydrates_g: Optional[float] = None
    total_sugars_g: Optional[float] = None
    added_sugars_g: Optional[float] = None
    fat_g: Optional[float] = None
    saturated_fat_g: Optional[float] = None
    trans_fat_g: Optional[float] = None
    sodium_mg: Optional[float] = None
    fiber_g: Optional[float] = None
    cholesterol_mg: Optional[float] = None


class TruthLensProductRecord(BaseModel):
    """Canonical normalized product record across all data sources."""
    barcode: str
    id: str
    name: str
    brand: str = ""
    category: str = "Packaged Commodity"
    ingredients_text: str = ""
    nutrition_per_100g: StandardNutrition100g = Field(default_factory=StandardNutrition100g)
    serving_size_g: Optional[float] = None
    net_quantity: str = ""
    mrp_inr: Optional[float] = None
    image_url: str = ""
    claims: List[str] = Field(default_factory=list)
    allergens: List[str] = Field(default_factory=list)
    nova_group: Optional[int] = None
    nutriscore_grade: Optional[str] = None
    primary_source: DataSource = DataSource.VERIFIED_LOCAL
    retrieved_at: str = Field(default_factory=lambda: dt.datetime.now(dt.timezone.utc).isoformat())
    provenance: Dict[str, FieldProvenance] = Field(default_factory=dict)
    conflicts: List[FieldConflict] = Field(default_factory=list)
    raw_payload: Optional[Dict[str, Any]] = None

    def get_source_label(self) -> str:
        labels = {
            DataSource.VERIFIED_LOCAL: "Verified Indian Catalogue (PackSure Audited)",
            DataSource.OPENFOODFACTS_V3: "Open Food Facts API v3 (Third-Party Database)",
            DataSource.OPENFOODFACTS_V2: "Open Food Facts API v2 (Third-Party Database)",
            DataSource.OCR_EXTRACTED: "Packaging Label OCR (Auto-Extracted)",
            DataSource.USER_CORRECTED: "Consumer / Inspector Verified & Corrected",
            DataSource.USDA_FDC: "USDA FoodData Central Reference",
            DataSource.AI_SYNTHESIZED: "PackSure AI Analysis (Synthesized for Unindexed Barcode)",
        }
        return labels.get(self.primary_source, self.primary_source.value)

    def to_analysis_input(self) -> dict:
        """Converts normalized record into the input dictionary expected by analysis engines."""
        nutr_dict = {k: v for k, v in self.nutrition_per_100g.model_dump().items() if v is not None}
        return {
            "barcode": self.barcode,
            "product_id": self.id,
            "name": self.name,
            "brand": self.brand,
            "category": self.category,
            "ingredients_text": self.ingredients_text,
            "nutrition": nutr_dict,
            "serving_size_g": self.serving_size_g,
            "net_quantity": self.net_quantity,
            "claims": self.claims,
            "allergens": self.allergens,
            "image_url": self.image_url,
            "primary_source": self.primary_source.value,
            "source_label": self.get_source_label(),
            "retrieved_at": self.retrieved_at,
            "provenance": {k: v.model_dump() for k, v in self.provenance.items()},
            "conflicts": [c.model_dump() for c in self.conflicts],
        }
