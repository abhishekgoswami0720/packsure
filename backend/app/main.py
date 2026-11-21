"""TruthLens FastAPI backend server."""
from __future__ import annotations

import json
from typing import Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .gemini_service import gemini_voice_assistant, gemini_parse_label_image
from . import voice_service
from .compliance.legal_metrology import check_letter_height, check_legal_metrology
from .compliance.packsure_service import (
    audit_letter_height,
    get_inspection_dossiers,
    get_dossier_by_id,
    create_field_inspection,
    apply_supervisor_determination,
    get_supervisor_metrics,
    get_consumer_petitions,
    create_consumer_petition,
    get_daily_consumption,
    add_daily_consumption_item,
    get_gut_biome_info,
)

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


# ------------------------------------------------------------------ Voice Lens: speak results, listen to questions
class VoiceSummaryInput(BaseModel):
    lang: str = "hi"
    product_id: Optional[str] = None
    result: Optional[dict] = None
    speak: bool = True


class VoiceSpeakInput(BaseModel):
    text: str = Field(min_length=1, max_length=1500)
    lang: str = "hi"


def _audio_url(text: str, lang: str) -> tuple[Optional[str], Optional[str]]:
    try:
        out = voice_service.synthesize(text, lang)
        return f"/api/voice/audio/{out['key']}", None
    except Exception as e:  # voice is optional; text still goes back
        return None, str(e)


@app.get("/api/voice/languages")
def voice_languages():
    """Languages the app can speak, plus the first-run guide lines (Hindi and English)."""
    return {
        "languages": [{"code": c, "native": n, "english": e} for c, (n, e) in voice_service.LANGUAGES.items()],
        "default": "hi",
        "guide": voice_service.GUIDE_LINES,
        "speech_provider": voice_service.provider(),
    }


@app.get("/api/voice/guide")
def voice_guide(lang: str = "hi"):
    """The four first-run guide lines in the user's language."""
    return voice_service.guide_lines(lang)


@app.post("/api/voice/summary")
def voice_summary(body: VoiceSummaryInput):
    """Short spoken verdict for a scanned product, in the user's language."""
    result = body.result
    if result is None and body.product_id:
        result = get_product(body.product_id)
    if not result:
        raise HTTPException(400, "Send a scan result or a product_id.")
    summary = voice_service.spoken_summary(result, body.lang)
    url, err = _audio_url(summary["text"], summary["lang"]) if body.speak else (None, None)
    return {**summary, "audio_url": url, "audio_error": err}


@app.post("/api/voice/speak")
def voice_speak(body: VoiceSpeakInput):
    """Any short text (guide lines, answers) as speech."""
    lang = voice_service.lang_or_default(body.lang)
    url, err = _audio_url(body.text, lang)
    if not url:
        raise HTTPException(503, err or "Speech unavailable")
    return {"audio_url": url}


@app.get("/api/voice/audio/{key}")
def voice_audio(key: str):
    if not key.isalnum():
        raise HTTPException(400, "Bad audio key")
    found = voice_service.cached_audio(key)
    if not found:
        raise HTTPException(404, "Audio not found")
    data, mime = found
    return Response(content=data, media_type=mime, headers={"Cache-Control": "public, max-age=86400"})


@app.post("/api/voice/ask")
async def voice_ask(audio: UploadFile = File(...), lang: str = Form("hi"), product_id: Optional[str] = Form(None)):
    """Spoken question in, spoken answer out."""
    data = await audio.read()
    if not data:
        raise HTTPException(400, "Empty recording")
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(413, "Recording too long")
    context = None
    if product_id:
        try:
            context = get_product(product_id)
        except HTTPException:
            context = None
    try:
        out = voice_service.ask_by_voice(data, audio.content_type or "audio/webm", lang, context)
    except Exception as e:
        raise HTTPException(503, f"Voice question failed: {e}")
    url, err = _audio_url(out["answer"], out["lang"]) if out["answer"] else (None, None)
    return {**out, "audio_url": url, "audio_error": err}


# ------------------------------------------------------------------ Rule 7 Numeral Height Calibration
class LetterHeightRequest(BaseModel):
    panel_area_cm2: float = Field(gt=0, description="Principal display panel area, Rule 7(4)")
    numeral_height_mm: Optional[float] = Field(default=None, description="Measured height of the smallest numeral in the declaration")
    actual_height_mm: Optional[float] = Field(default=None, description="Measured height alias")
    blown_or_moulded: bool = False
    is_blown_or_moulded: bool = False


@app.post("/api/compliance/letter-height")
def letter_height(req: LetterHeightRequest):
    """Rule 7 / Table I check for a measured numeral height."""
    measured = req.numeral_height_mm if req.numeral_height_mm is not None else req.actual_height_mm
    if measured is None:
        raise HTTPException(400, "Either 'numeral_height_mm' or 'actual_height_mm' is required.")
    blown = req.blown_or_moulded or req.is_blown_or_moulded

    res = check_letter_height(req.panel_area_cm2, measured, blown)
    audit = audit_letter_height(req.panel_area_cm2, measured, blown)
    combined = {**audit, **res}
    combined["verdict"] = audit.get("verdict", "PASS" if res.get("status") == "pass" else "NON-COMPLIANT")
    combined["actual_height_mm"] = measured
    combined["statutory_min_height_mm"] = audit.get("statutory_min_height_mm", res.get("required_mm"))
    combined["difference_mm"] = audit.get("difference_mm", round(measured - combined["statutory_min_height_mm"], 2))
    combined["statutory_penalty_inr"] = audit.get("statutory_penalty_inr", 0 if combined["verdict"] == "PASS" else 25000)
    combined["is_compliant"] = audit.get("is_compliant", res.get("status") == "pass")
    return combined


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


class ExtractDeclarationsInput(BaseModel):
    label_text: str


@app.post("/api/compliance/extract-declarations")
def api_extract_declarations(body: ExtractDeclarationsInput):
    """Extracts and verifies Rule 6 mandatory declarations from label text."""
    result = check_legal_metrology(body.label_text)
    # Extract specific detected values for human review & correction
    mrp_match = None
    net_match = None
    import re
    m_mrp = re.search(r"(?:₹|rs\.?|inr|m\.?r\.?p\.?)\s*(\d+(?:[.,]\d+)?)", body.label_text, re.IGNORECASE)
    if m_mrp:
        mrp_match = m_mrp.group(1)
    m_net = re.search(r"(\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|gms|gm|ltr|pcs|units))\b", body.label_text, re.IGNORECASE)
    if m_net:
        net_match = m_net.group(1)

    return {
        "verdict": result["verdict"],
        "checks": result["checks"],
        "n_pass": result["n_pass"],
        "n_warn": result["n_warn"],
        "n_fail": result["n_fail"],
        "extracted_values": {
            "mrp": mrp_match,
            "net_quantity": net_match,
            "raw_text": body.label_text
        }
    }


class FieldInspectionInput(BaseModel):
    product_name: str
    brand: str = ""
    category: str = "Packaged Commodity"
    batch_no: str = ""
    retailer: str = ""
    district: str = "South Hub"
    inspector_id: str = "INS-OFFICER"
    panel_area_cm2: float = 100.0
    detected_numeral_height_mm: float = 2.0
    is_blown_or_moulded: bool = False
    declared_net_quantity: str = ""
    inspector_notes: str = ""
    evidence_photos: list[str] = []


@app.get("/api/compliance/inspections")
def api_list_inspections(status: str = Query("", description="Status filter: all, under_review, notice_approved, compounded, dismissed")):
    """Lists field inspection dossiers."""
    return get_inspection_dossiers(status)


@app.post("/api/compliance/inspections")
def api_create_inspection(body: FieldInspectionInput):
    """Submits a new field inspection record."""
    return create_field_inspection(body.model_dump())


@app.get("/api/compliance/inspections/{dossier_id}")
def api_get_inspection(dossier_id: str):
    """Retrieves dossier detail by ID."""
    dossier = get_dossier_by_id(dossier_id)
    if not dossier:
        raise HTTPException(404, f"Inspection dossier '{dossier_id}' not found.")
    return dossier


class DeterminationInput(BaseModel):
    action: str  # approve_notice, dismiss, compound
    comments: str = ""
    compounding_fee: Optional[int] = None


@app.post("/api/compliance/dossiers/{dossier_id}/determination")
def api_apply_determination(dossier_id: str, body: DeterminationInput):
    """Applies supervisor determination (approves formal notice or dismisses)."""
    try:
        return apply_supervisor_determination(
            dossier_id=dossier_id,
            action=body.action,
            comments=body.comments,
            compounding_fee=body.compounding_fee
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.get("/api/compliance/supervisor/metrics")
def api_supervisor_metrics():
    """Retrieves supervisory clearance velocity and district metrics."""
    return get_supervisor_metrics()


# ------------------------------------------------------------------ Consumer Complaints & Daily Food Log

class ConsumerPetitionInput(BaseModel):
    title: str = ""
    product_name: str
    brand: str = ""
    category: str = "Misleading Marketing"
    issue: str
    evidence_text: str = ""
    claimant: str = "Consumer"


@app.get("/api/consumer/complaints")
def api_list_complaints():
    """Lists consumer violation and infraction petitions."""
    return get_consumer_petitions()


@app.post("/api/consumer/complaints")
def api_create_complaint(body: ConsumerPetitionInput):
    """Files a consumer violation petition."""
    if not body.product_name.strip() or not body.issue.strip():
        raise HTTPException(400, "Product name and issue description are required.")
    return create_consumer_petition(body.model_dump())


class DailyLogItemInput(BaseModel):
    product_name: str
    brand: str = ""
    meal: str = "Snack"
    serving_g: float = 100.0
    energy_kcal: float = 0.0
    sugars_g: float = 0.0
    sat_fat_g: float = 0.0
    sodium_mg: float = 0.0
    nova_group: int = 4
    truth_score: int = 50
    date: Optional[str] = None


@app.get("/api/consumer/daily-log")
def api_get_daily_log(date: Optional[str] = Query(None, description="ISO date YYYY-MM-DD")):
    """Retrieves today's consumption log and nutritional guideline limits."""
    return get_daily_consumption(date)


@app.post("/api/consumer/daily-log")
def api_add_daily_log(body: DailyLogItemInput):
    """Logs a food item into today's consumption diary."""
    return add_daily_consumption_item(body.model_dump())


# ------------------------------------------------------------------ Additives & Gut Biome Intelligence

@app.get("/api/truth/additives")
def api_list_additives(
    class_filter: str = Query("", description="Filter by functional class"),
    abroad_bans_only: bool = Query(False, description="Filter only additives with EU/US abroad bans")
):
    """Catalog of all 30+ INS additives with functional classes and abroad warnings."""
    results = []
    cf = class_filter.strip().lower()
    for a in INS_DB:
        if cf and cf not in a.get("class", "").lower():
            continue
        if abroad_bans_only and not a.get("abroad_status"):
            continue
        results.append(a)
    return {"total": len(results), "additives": results}


@app.get("/api/truth/additives/{ins}/biome")
def api_additive_biome(ins: str):
    """Retrieves clinical evidence explorer and gut biome findings for an additive."""
    info = get_gut_biome_info(ins)
    if not info:
        # Fallback to general INS DB entry if available
        matched = None
        for a in INS_DB:
            if a["ins"].lower() == ins.lower().replace("ins", "").replace("e", "").strip():
                matched = a
                break
        if matched:
            return {
                "ins": matched["ins"],
                "name": matched["name"],
                "common_source": matched.get("description", ""),
                "natural_vs_synthetic": {
                    "synthetic_share": "Synthesized or purified for industrial food applications.",
                    "natural_source": "Isolated from natural minerals, plant extract, or microbial synthesis."
                },
                "gut_biome_findings": [
                    {
                        "claim": matched.get("health_considerations", "Evaluated by FSSAI & EFSA"),
                        "evidence_strength": "Regulatory Standard",
                        "detail": matched.get("safety_rating", "Permitted under statutory limits"),
                        "status": "safe" if "Safe" in matched.get("safety_rating", "") else "caution"
                    }
                ],
                "international_status": {
                    "fssai": matched.get("fssai_status", "Permitted"),
                    "eu_efsa": matched.get("abroad_status", {}).get("eu", "Approved"),
                    "us_fda": matched.get("abroad_status", {}).get("us", "Approved")
                }
            }
        raise HTTPException(404, f"Gut biome profile for additive INS '{ins}' not found.")
    return info
