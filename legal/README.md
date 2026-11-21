# Legal corpus

The laws PackSure checks against, downloaded from the original sources with a record of where each one came from.

## Run it

```bash
pip install -r legal/requirements.txt
python legal/scrape.py --crawl
# scanned PDFs (no text layer): add your AI Studio key and use Gemini
set GEMINI_API_KEY=...          # Windows cmd   (PowerShell: $env:GEMINI_API_KEY="...")
python legal/scrape.py --crawl --gemini
```

Results:

| Path | What |
|---|---|
| `legal/raw/*.pdf` | Each document exactly as downloaded |
| `legal/text/*.txt` | Extracted text, split by page |
| `legal/manifest.json` | Source URL, publisher, official vs secondary copy, fetch time, SHA-256, extraction method |

`sources.json` is the curated list. `--crawl` adds every matching PDF linked from the Department of Consumer Affairs "Acts and Rules" page.

## Which text is current (as of 21 Nov 2026)

| Instrument | Notified | In force | What it changes |
|---|---|---|---|
| Legal Metrology Act, 2009 | 13 Jan 2010 | 1 Apr 2011 | Parent Act. Amended by the Jan Vishwas Acts 2023 and 2026; the 2026 Act adds an Improvement Notice for first-time procedural lapses (in force 1 May 2026). |
| LMPC Rules, 2011 (G.S.R. 202(E)) | 7 Mar 2011 | 1 Apr 2011 | Rule 6: mandatory declarations. Rule 7: minimum numeral height by panel area (Table-I). |
| Amendment Rules, 2025 (G.S.R. 778(E)) | Oct 2025 | 24 Oct 2025 | Medical devices follow the Medical Devices Rules 2017 for font size. |
| Second Amendment Rules, 2025 (G.S.R. 881(E)) | 2 Dec 2025 | 1 Feb 2026 | Rule 26(a): pan masala no longer gets the small-pack exemption. |
| Amendment Rules, 2026 (G.S.R. 128(E)) | 13 Feb 2026 | 1 Jul 2026 | New Rule 6(10A): e-commerce country-of-origin filter. |
| Second Amendment Rules, 2026 | 27 Apr 2026 | **1 Jul 2027** | Country-of-origin related. **Not in force yet.** |
| Third Amendment Rules, 2026 (G.S.R. 418(E)) | 29 May 2026 | 1 Jun 2026 | Rule 4: importers may label in AEO bonded warehouses. Rule 27: registration changes. |

The newest consolidated text we found (Khaitan & Co., to 13 Feb 2026) is missing the last two rows. Treat it as a reading copy and check the 2026 notifications on top of it.

## Rules for using this corpus

- **Cite the official notification**, not a law-firm copy. Law-firm copies are marked `"authority": "secondary"`.
- **Every rule PackSure applies needs a source and an "in force from" date.** Second Amendment 2026 must not be enforced before 1 July 2027.
- These are public government documents. The scraper waits between requests and identifies itself. Don't remove the delay.
