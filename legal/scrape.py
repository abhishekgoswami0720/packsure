"""Download the Legal Metrology laws PackSure relies on and extract their text.

Usage (from the repo root):
    pip install -r legal/requirements.txt
    python legal/scrape.py              # download the curated documents in sources.json
    python legal/scrape.py --crawl      # also collect PDF links from the official listing pages
    python legal/scrape.py --gemini     # use Gemini to read scanned PDFs that have no text layer
                                        # (needs GEMINI_API_KEY in the environment)

Output:
    legal/raw/<id>.pdf        the downloaded file, unchanged
    legal/text/<id>.txt       extracted text
    legal/manifest.json       what was fetched, from where, when, its SHA-256, and how text was extracted
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

HERE = Path(__file__).resolve().parent
RAW, TEXT = HERE / "raw", HERE / "text"
UA = "PackSure-legal-corpus/1.0 (student hackathon project; contact via GitHub abhishekgoswami0720)"
DELAY_S = 1.5          # be polite to government servers
MIN_CHARS_PER_PAGE = 80  # below this, treat the PDF as scanned


def session() -> requests.Session:
    s = requests.Session()
    s.headers["User-Agent"] = UA
    adapter = requests.adapters.HTTPAdapter(max_retries=requests.adapters.Retry(
        total=3, backoff_factor=2, status_forcelist=(429, 500, 502, 503, 504)))
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    return s


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:80]


def download(s: requests.Session, url: str, dest: Path) -> dict:
    r = s.get(url, timeout=60)
    r.raise_for_status()
    body = r.content
    if not body.startswith(b"%PDF"):
        raise ValueError(f"not a PDF (content-type {r.headers.get('content-type')})")
    dest.write_bytes(body)
    return {"bytes": len(body), "sha256": hashlib.sha256(body).hexdigest(),
            "content_type": r.headers.get("content-type")}


def pdf_text(path: Path) -> tuple[str, int, bool]:
    reader = PdfReader(str(path))
    pages = [(p.extract_text() or "") for p in reader.pages]
    text = "\n\n".join(f"--- page {i + 1} ---\n{t.strip()}" for i, t in enumerate(pages))
    scanned = sum(len(t.strip()) for t in pages) < MIN_CHARS_PER_PAGE * max(1, len(pages))
    return text, len(pages), scanned


def gemini_text(path: Path) -> str:
    """Transcribe a scanned PDF with Gemini (Google AI Studio key)."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    resp = client.models.generate_content(
        model=model,
        contents=[
            types.Part.from_bytes(data=path.read_bytes(), mime_type="application/pdf"),
            "Transcribe this Indian government legal document exactly, page by page. "
            "Keep rule numbers, sub-rule numbering, tables and provisos. Keep Hindi text as Hindi. "
            "Start each page with a line '--- page N ---'. Do not summarise or add anything.",
        ],
    )
    return resp.text or ""


def crawl(s: requests.Session, page: dict) -> list[dict]:
    r = s.get(page["url"], timeout=60)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    found, seen = [], set()
    for a in soup.find_all("a", href=True):
        href = urljoin(page["url"], a["href"])
        if not urlparse(href).path.lower().endswith(".pdf") or href in seen:
            continue
        # Link text is often just "Download"; use the table row for the title.
        row = a.find_parent("tr")
        title = " ".join((row.get_text(" ") if row else a.get_text(" ")).split())
        title = re.sub(r"\s*(Download|View)\s*\(?[\d.]+\s*[KM]B\)?.*$", "", title, flags=re.I).strip() or href
        if any(m in title.lower() for m in page["match"]):
            seen.add(href)
            found.append({"id": f"{page['id']}-{slug(title)}", "title": title, "kind": "crawled",
                          "authority": "official", "publisher": page["publisher"], "url": href,
                          "notes": f"Found on {page['url']}"})
    return found


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--crawl", action="store_true", help="also collect PDFs from the listing pages")
    ap.add_argument("--gemini", action="store_true", help="transcribe scanned PDFs with Gemini")
    ap.add_argument("--only", nargs="*", help="limit to these document ids")
    args = ap.parse_args()

    RAW.mkdir(exist_ok=True)
    TEXT.mkdir(exist_ok=True)
    cfg = json.loads((HERE / "sources.json").read_text(encoding="utf-8"))
    docs = [d for d in cfg["documents"] if d.get("url")]
    pending = [d for d in cfg["documents"] if not d.get("url")]
    s = session()

    if args.crawl:
        for page in cfg["listing_pages"]:
            try:
                more = crawl(s, page)
                print(f"[crawl] {page['url']}: {len(more)} matching PDFs")
                known = {d["url"] for d in docs}
                docs += [d for d in more if d["url"] not in known]
            except Exception as e:  # noqa: BLE001 - report and continue
                print(f"[crawl] FAILED {page['url']}: {e}")
            time.sleep(DELAY_S)

    if args.only:
        docs = [d for d in docs if d["id"] in args.only]

    manifest, ok = [], 0
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    for d in docs:
        entry = {**d, "fetched_at": now}
        pdf = RAW / f"{d['id']}.pdf"
        try:
            entry.update(download(s, d["url"], pdf))
            text, pages, scanned = pdf_text(pdf)
            entry.update(pages=pages, scanned=scanned, text_method="pdf_text_layer")
            if scanned and args.gemini:
                text = gemini_text(pdf)
                entry["text_method"] = "gemini_transcription"
            elif scanned:
                entry["text_method"] = "pdf_text_layer (looks scanned; rerun with --gemini)"
            (TEXT / f"{d['id']}.txt").write_text(text, encoding="utf-8")
            entry["status"] = "ok"
            ok += 1
            print(f"[ok]   {d['id']}  {pages} pages{'  (scanned)' if scanned else ''}")
        except Exception as e:  # noqa: BLE001 - one bad source should not stop the rest
            entry["status"] = f"error: {e}"
            print(f"[fail] {d['id']}  {e}")
        manifest.append(entry)
        time.sleep(DELAY_S)

    for d in pending:
        manifest.append({**d, "status": "no_url_yet"})
    (HERE / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n{ok}/{len(docs)} downloaded. {len(pending)} known documents still need a URL "
          f"(see manifest.json, status 'no_url_yet').")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
