"""Load the LMPC rule file and answer the two questions the checker needs.

    from rules.lmpc import load_rules, rules_in_force, min_numeral_height_mm
    rules = rules_in_force(load_rules(), on="2026-11-21")
    min_numeral_height_mm(180)          # -> 2.5
"""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

RULES_PATH = Path(__file__).with_name("lmpc_rules.json")


def load_rules(path: Path = RULES_PATH) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def rules_in_force(rules: dict, on: str | dt.date | None = None) -> list[dict]:
    """All declaration and presentation checks in force on the given date (default: today)."""
    day = dt.date.fromisoformat(on) if isinstance(on, str) else (on or dt.date.today())
    checks = rules["declarations"] + rules["presentation"]
    return [r for r in checks if dt.date.fromisoformat(r["in_force_from"]) <= day]


def min_numeral_height_mm(panel_area_cm2: float, blown_or_moulded: bool = False,
                          rules: dict | None = None) -> float:
    """Rule 7(2) Table I: minimum height for a principal display panel of this area."""
    rules = rules or load_rules()
    table = next(r for r in rules["presentation"] if r["id"] == "numeral_height")["table_I"]
    for row in table:
        if row["area_cm2_max"] is None or panel_area_cm2 <= row["area_cm2_max"]:
            return row["min_mm_blown_moulded" if blown_or_moulded else "min_mm"]
    raise AssertionError("Table I has an open-ended last row")


def is_exempt_small_pack(net_quantity_g_or_ml: float, product: str = "", on: str | None = None) -> bool:
    """Rule 26(a): 10 g / 10 ml or less is exempt, except tobacco and (from 1 Feb 2026) pan masala."""
    if net_quantity_g_or_ml > 10:
        return False
    rules = load_rules()
    day = dt.date.fromisoformat(on) if on else dt.date.today()
    scope = next(r for r in rules["scope"] if r["id"] == "small_pack_exemption")
    for ex in scope["exceptions"]:
        if ex["product"] == product and dt.date.fromisoformat(ex["in_force_from"]) <= day:
            return False
    return True
