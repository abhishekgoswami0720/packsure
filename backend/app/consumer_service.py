"""Consumer profile, favorites, scan history, and feedback management for TruthLens."""
from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional
from .truth_service import LOCAL_PRODUCTS, analyze_product_data, lookup_barcode, search_catalogue

# In-memory storage with sensible starter data
_FAVORITES: List[str] = ["epigamia_greek_yogurt_plain", "the_whole_truth_peanut_butter"]

_HISTORY: List[Dict[str, Any]] = [
    {
        "product_id": "parle_g",
        "scanned_at": "2026-11-21T09:15:00Z",
        "method": "barcode"
    },
    {
        "product_id": "britannia_nutrichoice_atta",
        "scanned_at": "2026-11-21T10:30:00Z",
        "method": "barcode"
    },
    {
        "product_id": "9002490100070",
        "scanned_at": "2026-11-21T11:45:00Z",
        "method": "barcode"
    }
]

_FEEDBACK: List[Dict[str, Any]] = []

_PROFILE: Dict[str, Any] = {
    "name": "Health Seeker",
    "diet": "vegetarian",
    "goals": ["low_added_sugar", "no_palm_oil", "high_protein"],
    "allergens": ["artificial_dyes"],
    "daily_sugar_limit_g": 25.0,
    "daily_sodium_limit_mg": 2000.0,
}


def get_categories() -> List[Dict[str, Any]]:
    """Returns curated category list with counts and icon hints."""
    cats: Dict[str, int] = {}
    for p in LOCAL_PRODUCTS:
        c = p.get("category", "General Food")
        cats[c] = cats.get(c, 0) + 1

    category_list = [
        {"id": "all", "name": "All", "count": sum(cats.values()), "icon": "sparkles"},
        {"id": "food", "name": "Food", "count": sum(v for k, v in cats.items() if k != "Personal Care"), "icon": "utensils"},
        {"id": "personal_care", "name": "Personal Care", "count": cats.get("Personal Care", 0), "icon": "sparkle"},
        {"id": "recent_scans", "name": "Recent Scans", "count": len(_HISTORY), "icon": "history"},
    ]

    for cat_name, count in sorted(cats.items()):
        cat_id = cat_name.lower().replace("&", "and").replace(" ", "_")
        category_list.append({
            "id": cat_id,
            "name": cat_name,
            "count": count,
            "icon": "tag"
        })

    return category_list


def get_favorites() -> List[Dict[str, Any]]:
    """Returns resolved product details for all favorited IDs."""
    items = []
    for pid in reversed(_FAVORITES):
        res = None
        for p in LOCAL_PRODUCTS:
            if p["id"] == pid or p.get("barcode") == pid:
                res = analyze_product_data(
                    name=p["name"],
                    brand=p.get("brand", ""),
                    category=p.get("category", ""),
                    ingredients_text=p.get("ingredients_text", ""),
                    nutrition=p.get("nutrition_per_100g", {}),
                    claims=p.get("claims", []),
                    serving_size_g=p.get("serving_size_g"),
                    product_id=p.get("id", ""),
                    image_url=p.get("image_url", ""),
                )
                break
        if not res:
            res = lookup_barcode(pid)
        if res:
            items.append(res)
    return items


def add_favorite(product_id: str) -> bool:
    """Adds a product ID to favorites if not already present."""
    clean_id = product_id.strip()
    if clean_id and clean_id not in _FAVORITES:
        _FAVORITES.append(clean_id)
        return True
    return False


def remove_favorite(product_id: str) -> bool:
    """Removes a product ID from favorites."""
    clean_id = product_id.strip()
    if clean_id in _FAVORITES:
        _FAVORITES.remove(clean_id)
        return True
    return False


def is_favorite(product_id: str) -> bool:
    """Checks if a product is in favorites."""
    return product_id.strip() in _FAVORITES


def get_history(limit: int = 20) -> List[Dict[str, Any]]:
    """Returns resolved product objects for recent scans."""
    items = []
    seen = set()
    for h in reversed(_HISTORY):
        pid = h["product_id"]
        if pid in seen:
            continue
        seen.add(pid)

        prod = None
        for p in LOCAL_PRODUCTS:
            if p["id"] == pid or p.get("barcode") == pid:
                prod = analyze_product_data(
                    name=p["name"],
                    brand=p.get("brand", ""),
                    category=p.get("category", ""),
                    ingredients_text=p.get("ingredients_text", ""),
                    nutrition=p.get("nutrition_per_100g", {}),
                    claims=p.get("claims", []),
                    serving_size_g=p.get("serving_size_g"),
                    product_id=p.get("id", ""),
                    image_url=p.get("image_url", ""),
                )
                break
        if not prod:
            prod = lookup_barcode(pid)

        if prod:
            item = dict(prod)
            item["scanned_at"] = h["scanned_at"]
            item["scan_method"] = h.get("method", "barcode")
            items.append(item)
            if len(items) >= limit:
                break
    return items


def add_history(product_id: str, method: str = "barcode") -> None:
    """Records a scanned product in history."""
    clean_id = product_id.strip()
    if not clean_id:
        return
    _HISTORY.append({
        "product_id": clean_id,
        "scanned_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "method": method
    })


def clear_history() -> None:
    """Clears history."""
    _HISTORY.clear()


def submit_feedback(product_id: str, purchase_intent: Optional[str] = None, helpful: Optional[bool] = None, comment: str = "") -> Dict[str, Any]:
    """Records consumer purchase intent and helpfulness feedback."""
    entry = {
        "product_id": product_id,
        "purchase_intent": purchase_intent,  # "yes", "no", "already_bought"
        "helpful": helpful,  # True, False
        "comment": comment,
        "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
    }
    _FEEDBACK.append(entry)
    return {"status": "success", "message": "Feedback recorded", "entry": entry}


def get_profile() -> Dict[str, Any]:
    """Returns current user dietary and health profile."""
    return dict(_PROFILE)


def update_profile(updates: Dict[str, Any]) -> Dict[str, Any]:
    """Updates user dietary profile."""
    _PROFILE.update(updates)
    return dict(_PROFILE)
