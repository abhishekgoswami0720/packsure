"""TruthLens FastAPI backend server."""
from __future__ import annotations

import json
from typing import Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .gemini_service import gemini_voice_assistant, gemini_parse_label_image

from .truth_service import (
    INS_DB,
    LOCAL_PRODUCTS,
    SUGARS_DB,
    analyze_product_data,
    compare_products_data,
    get_clean_alternatives,
    lookup_barcode,
    search_catalogue,
)

app = FastAPI(
    title="TruthLens API",
    description="Food intelligence and consumer transparency platform under TruthLens (TruthIn 2.0).",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).parent / "static"
STITCH_DIR = Path(__file__).resolve().parent.parent.parent / "stitch_platform" / "stitch_packsure_ai_mobile_platform"
if STITCH_DIR.exists():
    app.mount("/stitch", StaticFiles(directory=str(STITCH_DIR), html=True), name="stitch")


@app.get("/")
def home():
    idx = STATIC_DIR / "index.html"
    if idx.exists():
        return FileResponse(idx)
    return {"service": "TruthLens API v2.0.0"}


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "TruthLens API",
        "version": "2.0.0",
        "catalog_size": len(LOCAL_PRODUCTS),
        "additives_count": len(INS_DB),
        "hidden_sugars_count": len(SUGARS_DB),
    }


# ------------------------------------------------------------------ Barcode & Search
@app.get("/api/truth/barcode/{code}")
def get_by_barcode(code: str):
    """Looks up a product by barcode (local verified DB first, then Open Food Facts)."""
    clean_code = code.strip()
    if not clean_code:
        raise HTTPException(400, "Barcode cannot be empty.")
    result = lookup_barcode(clean_code)
    if not result:
        raise HTTPException(404, f"Product with barcode '{clean_code}' not found in catalogue. Please scan or photograph the label.")
    return result


@app.get("/api/truth/search")
def search(q: str = Query("", description="Product name, brand, or barcode"),
           category: str = Query("", description="Food category filter")):
    """Searches products across local catalogue."""
    return search_catalogue(q, category)


@app.get("/api/truth/popular")
def popular_products():
    """Returns top popular Indian packaged foods with pre-verified food intelligence."""
    return search_catalogue("")


@app.get("/api/truth/products/{product_id}")
def get_product(product_id: str):
    """Retrieves product by ID."""
    prods = search_catalogue(product_id)
    if prods:
        return prods[0]
    # Check by barcode
    b_prod = lookup_barcode(product_id)
    if b_prod:
        return b_prod
    raise HTTPException(404, f"Product '{product_id}' not found.")


# ------------------------------------------------------------------ Ingredient & Additives Lookup
@app.get("/api/truth/ingredients/lookup")
def lookup_ingredient(q: str = Query(..., description="INS number (e.g. 211) or chemical name (e.g. Sodium Benzoate)")):
    """Explains any additive or hidden sugar in plain English with safety and regulatory status."""
    clean_q = q.strip().lower()
    matches = []

    # Check INS DB
    for a in INS_DB:
        if clean_q == a["ins"].lower() or clean_q in a["name"].lower() or any(clean_q in al.lower() for al in a.get("aliases", [])):
            matches.append({
                "type": "additive",
                "ins": a["ins"],
                "name": a["name"],
                "class": a["class"],
                "safety_rating": a["safety_rating"],
                "description": a["description"],
                "fssai_status": a["fssai_status"],
                "abroad_status": a.get("abroad_status", {}),
                "health_considerations": a["health_considerations"],
            })

    # Check Hidden Sugars DB
    for s in SUGARS_DB:
        if clean_q in s["name"].lower():
            matches.append({
                "type": "hidden_sugar",
                "name": s["name"],
                "gi": s["gi"],
                "sugar_type": s["type"],
                "risk": s["risk"],
            })

    return {
        "query": q,
        "count": len(matches),
        "results": matches,
    }


# ------------------------------------------------------------------ Scan & Image Analysis
class ManualScanInput(BaseModel):
    name: str = "Scanned Food Product"
    brand: str = ""
    category: str = "Packaged Food"
    ingredients_text: str = ""
    nutrition: dict = {}
    claims: list[str] = []
    serving_size_g: Optional[float] = None
    barcode: str = ""
    raw_label_text: str = ""


@app.post("/api/truth/scan/manual")
def scan_manual(body: ManualScanInput):
    """Analyzes user-entered or manually corrected ingredient & nutrition information."""
    return analyze_product_data(
        name=body.name,
        brand=body.brand,
        category=body.category,
        ingredients_text=body.ingredients_text,
        nutrition=body.nutrition,
        claims=body.claims,
        raw_label_text=body.raw_label_text or body.ingredients_text,
        serving_size_g=body.serving_size_g,
        product_id=body.barcode,
    )


@app.post("/api/truth/scan")
async def scan_product(
    barcode: str = Form(""),
    name: str = Form(""),
    brand: str = Form(""),
    category: str = Form(""),
    ingredients_text: str = Form(""),
    nutrition_json: str = Form("{}"),
    claims_json: str = Form("[]"),
    serving_size_g: Optional[float] = Form(None),
    image: Optional[UploadFile] = File(None),
):
    """Multi-modal scan endpoint supporting barcode, images, and text."""
    # 1. If barcode provided and found, return immediately
    if barcode.strip():
        hit = lookup_barcode(barcode.strip())
        if hit:
            return hit

    parsed_nutrition = {}
    try:
        if nutrition_json:
            parsed_nutrition = json.loads(nutrition_json)
    except Exception:
        pass

    parsed_claims = []
    try:
        if claims_json:
            parsed_claims = json.loads(claims_json)
    except Exception:
        pass

    extracted_text = ingredients_text

    # If an image was uploaded, process with Gemini Vision or OCR if text not provided
    if image and not extracted_text:
        img_bytes = await image.read()
        if img_bytes:
            # 1. Try Gemini Vision multi-modal transcription
            try:
                gemini_res = gemini_parse_label_image(img_bytes)
                if gemini_res:
                    if not name and gemini_res.get("product_name"):
                        name = gemini_res["product_name"]
                    if not brand and gemini_res.get("brand"):
                        brand = gemini_res["brand"]
                    if not parsed_claims and gemini_res.get("claims"):
                        parsed_claims = gemini_res["claims"]
                    if not parsed_nutrition and gemini_res.get("nutrition_per_100g"):
                        parsed_nutrition = gemini_res["nutrition_per_100g"]
                    if gemini_res.get("ingredients_text"):
                        extracted_text = gemini_res["ingredients_text"]
            except Exception:
                pass

            # 2. Fallback to local OCR if still empty
            if not extracted_text:
                try:
                    import cv2
                    import numpy as np
                    import pytesseract
                    arr = np.frombuffer(img_bytes, np.uint8)
                    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                    if img is not None:
                        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                        extracted_text = pytesseract.image_to_string(gray)
                except Exception:
                    pass

    prod_name = name.strip() or ("Scanned Product" + (f" ({barcode})" if barcode else ""))
    return analyze_product_data(
        name=prod_name,
        brand=brand.strip(),
        category=category.strip() or "Packaged Food",
        ingredients_text=extracted_text,
        nutrition=parsed_nutrition,
        claims=parsed_claims,
        serving_size_g=serving_size_g,
        product_id=barcode.strip(),
        raw_label_text=extracted_text,
    )


# ------------------------------------------------------------------ Comparison & Alternatives
class CompareInput(BaseModel):
    product_id_1: str
    product_id_2: str


@app.post("/api/truth/compare")
def compare_products(body: CompareInput):
    """Compares two products on nutrition, ingredients, NOVA, and clean score with goal advice."""
    p1 = None
    p2 = None

    for p in LOCAL_PRODUCTS:
        if p["id"] == body.product_id_1 or p.get("barcode") == body.product_id_1:
            p1 = analyze_product_data(
                name=p["name"], brand=p.get("brand", ""), category=p.get("category", ""),
                ingredients_text=p.get("ingredients_text", ""), nutrition=p.get("nutrition_per_100g", {}),
                claims=p.get("claims", []), serving_size_g=p.get("serving_size_g"),
                product_id=p.get("id", ""), image_url=p.get("image_url", ""),
            )
        if p["id"] == body.product_id_2 or p.get("barcode") == body.product_id_2:
            p2 = analyze_product_data(
                name=p["name"], brand=p.get("brand", ""), category=p.get("category", ""),
                ingredients_text=p.get("ingredients_text", ""), nutrition=p.get("nutrition_per_100g", {}),
                claims=p.get("claims", []), serving_size_g=p.get("serving_size_g"),
                product_id=p.get("id", ""), image_url=p.get("image_url", ""),
            )

    # Fallback to barcode lookup if not in local array
    if not p1:
        p1 = lookup_barcode(body.product_id_1)
    if not p2:
        p2 = lookup_barcode(body.product_id_2)

    if not p1:
        raise HTTPException(404, f"Product 1 '{body.product_id_1}' could not be resolved.")
    if not p2:
        raise HTTPException(404, f"Product 2 '{body.product_id_2}' could not be resolved.")

    return compare_products_data(p1, p2)


class AlternativeInput(BaseModel):
    product_id: str
    category: str = ""


@app.post("/api/truth/alternatives")
def recommend_alternatives(body: AlternativeInput):
    """Returns recommended clean alternatives for a given product or category."""
    recs = get_clean_alternatives(body.product_id, body.category)
    return {
        "product_id": body.product_id,
        "category": body.category,
        "count": len(recs),
        "recommendations": recs,
    }


# ------------------------------------------------------------------ Voice Lens Assistant (Gemini)
class VoiceAssistantInput(BaseModel):
    query: str
    product_context: Optional[dict] = None


@app.post("/api/truth/voice-assistant")
def voice_assistant(body: VoiceAssistantInput):
    """Conversational food intelligence assistant powered by Gemini API."""
    if not body.query.strip():
        raise HTTPException(400, "Query cannot be empty.")
    answer = gemini_voice_assistant(user_query=body.query, product_context=body.product_context)
    return {
        "query": body.query,
        "answer": answer,
        "status": "success",
    }


# ------------------------------------------------------------------ Google Stitch UI Screen Gallery
@app.get("/api/stitch/screens")
def list_stitch_screens():
    """Returns catalog of the 15 UI screens designed in Google Stitch with direct launch URLs."""
    screens = [
        {"id": "packsure_ai_consumer_home_dashboard", "title": "Consumer Home Dashboard", "desc": "Editorial dashboard with scan buttons, popular Indian staples & food metrics", "url": "/stitch/packsure_ai_consumer_home_dashboard/code.html"},
        {"id": "packsure_ai_triple_input_scanner", "title": "Triple Input Scanner", "desc": "Multi-modal input: Barcode, Live OCR Label Camera, Voice Lens", "url": "/stitch/packsure_ai_triple_input_scanner/code.html"},
        {"id": "packsure_ai_product_intelligence_overview", "title": "Product Intelligence Overview", "desc": "0-100 TruthScore, NOVA 4 UPF badge, FSSAI traffic lights, Claim Buster", "url": "/stitch/packsure_ai_product_intelligence_overview/code.html"},
        {"id": "packsure_ai_voice_lens_assistant", "title": "Voice & Lens Multimodal Assistant", "desc": "Gemini-powered acoustic assistant with AR label overlays & live voice prompts", "url": "/stitch/packsure_ai_voice_lens_assistant/code.html"},
        {"id": "packsure_ai_hidden_sugar_breakdown", "title": "Hidden Sugar Breakdown", "desc": "Visual breakdown of 50+ aliases (maltodextrin, invert syrup) and Glycemic Index impact", "url": "/stitch/packsure_ai_hidden_sugar_breakdown/code.html"},
        {"id": "packsure_ai_ins_additive_decoder", "title": "INS Additive Decoder", "desc": "Complete INS lookup, EU/US abroad bans, FSSAI limits, and health risks", "url": "/stitch/packsure_ai_ins_additive_decoder/code.html"},
        {"id": "packsure_ai_ins_330_detail_gut_biome", "title": "INS 330 Detail & Gut Biome", "desc": "Microbiome impact, synthetic vs natural citric acid, and clinical advisory", "url": "/stitch/packsure_ai_ins_330_detail_gut_biome/code.html"},
        {"id": "packsure_ai_letter_height_audit", "title": "Legal Metrology Letter Height Audit", "desc": "Rule 7 optical calibration measuring declaration font height in mm", "url": "/stitch/packsure_ai_letter_height_audit/code.html"},
        {"id": "packsure_ai_declaration_ocr_extraction", "title": "Declaration OCR Extraction", "desc": "Rule 6 mandatory field validation (MRP, Net Qty, Mfg Date, Packer)", "url": "/stitch/packsure_ai_declaration_ocr_extraction/code.html"},
        {"id": "packsure_ai_daily_product_log", "title": "Daily Product Log", "desc": "Track scanned packaged foods, cumulative hidden sugar & UPF intake", "url": "/stitch/packsure_ai_daily_product_log/code.html"},
        {"id": "packsure_ai_consumer_complaints", "title": "Consumer Complaints", "desc": "1-click lodging of deceptive claim and Legal Metrology violations to authorities", "url": "/stitch/packsure_ai_consumer_complaints/code.html"},
        {"id": "packsure_ai_inspector_dashboard", "title": "Field Inspector Dashboard", "desc": "Enforcement portal for field officers scanning retail shelves", "url": "/stitch/packsure_ai_inspector_dashboard/code.html"},
        {"id": "packsure_ai_supervisory_review_queue", "title": "Supervisory Review Queue", "desc": "Queue of flagged violations awaiting enforcement approval", "url": "/stitch/packsure_ai_supervisory_review_queue/code.html"},
        {"id": "packsure_ai_supervisor_dashboard", "title": "Supervisor Enforcement Dashboard", "desc": "City and state-level compliance metrics, seizure orders, and fine summaries", "url": "/stitch/packsure_ai_supervisor_dashboard/code.html"},
        {"id": "packsure_ai_supervisor_review_approval", "title": "Supervisor Review & Notice Approval", "desc": "Legal notice generation under Legal Metrology Act 2009 Section 36", "url": "/stitch/packsure_ai_supervisor_review_approval/code.html"},
    ]
    return {"total": len(screens), "screens": screens}
