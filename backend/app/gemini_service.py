"""Gemini API Integration powering multi-modal vision parsing and the Voice Lens AI Assistant."""
from __future__ import annotations

import base64
import json
import os
from typing import Optional

# Load environment variables from local .env if present
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(env_path):
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                stripped = line.strip()
                if stripped.startswith("GEMINI_API_KEY=") and not os.environ.get("GEMINI_API_KEY"):
                    os.environ["GEMINI_API_KEY"] = stripped.split("=", 1)[1].strip().strip('"').strip("'")
                elif stripped.startswith("GEMINI_MODEL=") and not os.environ.get("GEMINI_MODEL"):
                    os.environ["GEMINI_MODEL"] = stripped.split("=", 1)[1].strip().strip('"').strip("'")
    except Exception:
        pass

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")


def get_genai_client():
    try:
        from google import genai
        return genai.Client(api_key=GEMINI_KEY)
    except Exception:
        return None


def gemini_voice_assistant(user_query: str, product_context: dict | None = None) -> str:
    """Answers conversational questions about food labels, additives, and metrology using Gemini."""
    client = get_genai_client()
    if not client:
        return "Gemini client not initialized. Please ensure google-genai is configured with a valid API key."

    context_str = ""
    if product_context:
        context_str = f"""
Current Scanned Product: {product_context.get('name', 'Unknown')}
Brand: {product_context.get('brand', 'Unknown')}
Category: {product_context.get('category', 'Unknown')}
Ingredients: {product_context.get('ingredients_text', 'Not available')}
Nutrition per 100g: {json.dumps(product_context.get('nutrition_per_100g', {}))}
NOVA Group: {product_context.get('nova', {}).get('group')} ({product_context.get('nova', {}).get('title')})
TruthScore: {product_context.get('truth_score', {}).get('score')} ({product_context.get('truth_score', {}).get('grade')})
Additives Detected: {[a.get('name') for a in product_context.get('additives', [])]}
Hidden Sugars: {[s.get('name') for s in product_context.get('hidden_sugars', [])]}
Industrial Fats: {[f.get('name') for f in product_context.get('industrial_fats', [])]}
Deceptive Claim Inconsistencies: {[c.get('claim') for c in product_context.get('claim_verdicts', []) if 'inconsistency' in c.get('status', '')]}
Legal Metrology Compliance: {product_context.get('compliance', {}).get('verdict')}
"""

    system_instruction = (
        "You are PackSure Voice & AI Assistant, an expert in Indian packaged foods, FSSAI regulations, "
        "the Legal Metrology (Packaged Commodities) Rules 2011, and clean label transparency. "
        "Answer the user's question clearly, warmly, and concisely in 2-3 brief paragraphs. "
        "Highlight hidden sugars, palm oils, cosmetic additives, and deceptive claims when relevant. "
        "Maintain high accuracy without being alarmist; cite specific facts."
    )

    prompt = f"{system_instruction}\n\nProduct Context:\n{context_str}\n\nUser Question:\n{user_query}"

    for model_name in [DEFAULT_MODEL, "gemini-3.8-flash", "gemini-3.1-pro-preview"]:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            continue

    return "PackSure AI could not reach the server right now. Please try your question again in a moment."


def gemini_parse_label_image(image_bytes: bytes) -> dict | None:
    """Uses Gemini vision to transcribe label image and extract structured ingredients & claims."""
    client = get_genai_client()
    if not client:
        return None

    try:
        from google.genai import types
        b64_img = base64.b64encode(image_bytes).decode("utf-8")

        prompt = (
            "Analyze this packaged food label photo. Extract and return JSON with keys:\n"
            "- 'product_name': string\n"
            "- 'brand': string\n"
            "- 'claims': list of front packaging marketing claims (e.g. '100% Atta', 'Zero Sugar')\n"
            "- 'ingredients_text': full exact transcription of ingredient list\n"
            "- 'nutrition_per_100g': dictionary of energy_kcal, protein_g, carbohydrates_g, total_sugars_g, fat_g, saturated_fat_g, sodium_mg\n"
            "Return valid JSON only."
        )

        mime_type = "image/jpeg"
        if image_bytes.startswith(b"\x89PNG"):
            mime_type = "image/png"
        elif image_bytes.startswith(b"RIFF") and b"WEBP" in image_bytes[:16]:
            mime_type = "image/webp"

        part_img = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

        for model_name in [DEFAULT_MODEL, "gemini-3.8-flash"]:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[part_img, prompt]
                )
                if response and response.text:
                    txt = response.text.strip()
                    # Clean markdown formatting if present
                    if txt.startswith("```json"):
                        txt = txt.split("```json")[1].split("```")[0].strip()
                    elif txt.startswith("```"):
                        txt = txt.split("```")[1].split("```")[0].strip()
                    return json.loads(txt)
            except Exception:
                continue
    except Exception:
        pass

    return None
