# PackSure & TruthLens (TruthIn 2.0)
### Next-Generation Food Intelligence & Statutory Legal Metrology Compliance Platform for India

[![Python 3.11](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Google Gemini API](https://img.shields.io/badge/Google%20Gemini-3.1%20Flash--Lite-4285F4?style=flat&logo=google&logoColor=white)](https://ai.google.dev/)
[![React Native Expo](https://img.shields.io/badge/React%20Native-Expo%2056-000020?style=flat&logo=expo&logoColor=white)](https://expo.dev/)
[![LMPC Rules 2011](https://img.shields.io/badge/Compliance-Legal%20Metrology%202011-1B4332?style=flat)](legal/)
[![Tests Passing](https://img.shields.io/badge/Tests-58%2F58%20Passing-2D6A4F?style=flat&logo=pytest&logoColor=white)](backend/tests/)
[![License MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌟 Overview

**PackSure & TruthLens** is an integrated food intelligence and statutory legal metrology compliance platform built specifically for Indian consumers, enforcement officers, and FMCG brands.

Inspired by *TruthIn by Food Pharmer* and statutory requirements under the **Legal Metrology Act, 2009** and the **Legal Metrology (Packaged Commodities) Rules, 2011 (LMPC)**, PackSure bridges the gap between opaque label fine-print and consumer empowerment:

1. **For Everyday Consumers (TruthLens)**: Decodes INS chemical additive numbers, unmasks 50+ hidden sugar aliases, flags industrial palm fats, calculates a deterministic **0–100 TruthScore**, classifies **NOVA Ultra-Processed Foods (UPF)**, exposes deceptive front-of-pack marketing claims, and answers natural language questions via **Voice Lens AI (Google Gemini 3.1 Flash-Lite)**.
2. **For Enforcement & Legal Metrology Officers (PackSure)**: Automated statutory inspection of front and back of pack for mandatory Rule 6 declarations (manufacturer address with PIN code, common generic name, net quantity in SI units, MRP inclusive of taxes, unit sale price, month/year of manufacture, and consumer care) and Rule 7 Table-I minimum letter height calibration.

---

## 🚀 Key Features

### 1. 🔍 Multi-Modal Triple Input Scanner
* **EAN-13 Barcode Scanning**: Instant lookup against a verified local Indian FMCG database (Parle-G, Maggi, Bournvita, Amul, Epigamia, The Whole Truth) with fallbacks to Open Food Facts.
* **Camera OCR & Multi-Modal Gemini Vision**: Transcribes and extracts ingredients and nutrition tables directly from packaged food photos using Google Gemini 3.1 Flash-Lite.
* **Quick Text / E-Commerce Paste**: Paste raw ingredient text directly from Blinkit, Zepto, Swiggy Instamart, or Amazon Fresh.

### 2. 🧪 Deep Additive & INS Decoder (30+ Verified Records)
* Translates numeric INS / E-numbers into human-readable chemical names, functions, and safety ratings.
* Cites **mandatory abroad bans and restrictions**:
  * **INS 102 (Tartrazine)**: Requires mandatory EU health warning for child attention deficits.
  * **INS 127 (Erythrosine)**: Subject to US FDA regulatory restrictions.
  * **INS 171 (Titanium Dioxide)**: Banned as a food additive in the European Union (2022).
  * **INS 211 (Sodium Benzoate)**: Evaluates benzene formation risks when combined with ascorbic acid (Vitamin C).

### 3. 🍬 50+ Hidden Sugars & Industrial Fats Detection
* Identifies hidden sugars by Glycemic Index (GI), including **Maltodextrin (GI 110)**, High-Fructose Corn Syrup (HFCS), Invert Sugar, Liquid Glucose, and Rice Syrup.
* Detects industrial fats including Palmolein, Palm Oil, Hydrogenated Vegetable Fat, and Vanaspati with trans-fat risk warnings.

### 4. 🚨 Deceptive Marketing Claim Buster
Automatically verifies front-packaging marketing claims against back-of-package ingredient lists:
* **"100% Atta / Whole Wheat"**: Flags inconsistency if refined wheat flour (*Maida*) precedes or exceeds whole wheat flour.
* **"Sugar-Free / Zero Sugar"**: Exposes high-GI fillers such as maltodextrin, dextrose, or polydextrose.
* **"Real Honey / Made with Real Fruit"**: Verifies whether advertised ingredients constitute meaningful percentages or token fractions (e.g. < 2%).
* **"No Added Preservatives"**: Flags cosmetic preservatives (INS 211, INS 202, INS 220).

### 5. 🎙️ Voice Lens AI Assistant (Powered by Gemini 3.1 Flash-Lite)
* Direct natural language conversational food advisor.
* Real-time audio equalizer visualization in the web client.
* Injects active product context into Gemini:
  * *"Is this biscuit safe for someone with Type-2 diabetes?"*
  * *"Does this cereal contain palm oil or synthetic dyes?"*
  * *"Explain what INS 407 (Carrageenan) does to the gut microbiome."*
* General informational advisory emphasizing medical consultation for clinical health conditions.

### 5a. 🗣️ Speaks Your Language — No Training Needed
Built for first-time smartphone users in Tier 2 and Tier 3 towns:
* **Learns itself on first open**: pick a language from big buttons in its own script (हिन्दी, বাংলা, मराठी, தமிழ், తెలుగు, ગુજરાતી, ಕನ್ನಡ, മലയാളം, ਪੰਜਾਬੀ, English). A 4-step guide then explains the app **out loud**, with one large picture per step, and ends on the scanner. A **?** button replays it anytime.
* **Speaks every result**: after a scan, the app says a 2-3 sentence verdict in the chosen language (score, hidden sugar, palm oil, misleading claims, missing label details), with the text on screen too.
* **Hold the mic to ask**: the shopper asks a question by voice; Gemini transcribes it and answers in the same language, out loud.
* **Voice stack**: summaries and answers are written by **Google Gemini**. Speech uses **Sarvam AI** (Bulbul text-to-speech, Saaras speech-to-text, built for Indian languages) when `VOICE_PROVIDER=sarvam` and `SARVAM_API_KEY` are set, and **Gemini TTS** otherwise. Generated audio is cached, so replays are instant; if speech is unavailable the phone's built-in voice reads the same text.

### 6. 🎨 Dual-Mode Platform with 15 Natively-Integrated Stitch Screens
TruthLens × PackSure integrates 15 production UI screens inspired by the Google Stitch designs, unified into a seamless single-page application with a live **Role Switcher** (Consumer Mode vs Enforcement Mode):

* **Consumer Experience (TruthLens)**:
  1. *Consumer Home Dashboard* (Screen 1): Trending food alerts, daily sugar quotas, and recent scans.
  2. *Triple Input Scanner with Human Review* (Screen 2): 6-step optical pipeline with text correction before analysis.
  3. *Product Intelligence Overview* (Screen 3): 0–100 TruthScore gauge, NOVA UPF badge, traffic lights.
  4. *Voice Lens Assistant* (Screen 4): Live Gemini 3.1 conversational nutrition advisor with animated audio wave.
  5. *Hidden Sugar Breakdown* (Screen 5): Detailed breakdown of 50+ sugar aliases, maltodextrin GI 110 warnings, and teaspoon equivalents.
  6. *INS Additive Decoder* (Screen 6): Searchable chemical database with EU/US safety alerts.
  7. *Gut Biome Clinical Detail* (Screen 7): Clinical microbiome impact for emulsifiers and additives (e.g. INS 407 Carrageenan, INS 330).
  8. *Daily Product Log* (Screen 10): Track daily sugar, sodium, and ultra-processed food intake against WHO/ICMR thresholds.
  9. *Consumer Complaints & Petitions* (Screen 11): File misleading packaging reports with real-time status tracking.

* **Enforcement & Inspector Experience (PackSure)**:
  1. *Field Inspector Hub* (Screen 12): Active market raids, sample chain-of-custody, and violation quick-actions.
  2. *Rule 7 Letter Height Calibrator* (Screen 8): Precise optical mm calculator based on package volume and PDP area.
  3. *Declaration OCR Extraction* (Screen 9): Automated multi-declaration audit with confidence indicators.
  4. *Supervisory Review Queue* (Screen 13): District-wide dossier approval pipeline with evidence scrutiny.
  5. *Supervisor District Dashboard* (Screen 14): Jurisdiction analytics, top offending manufacturers, and compliance rates.
  6. *Notice Approval & Enforcement Action* (Screen 15): Issue formal Section 36 statutory notices under LMPC Rules 2011.

### 7. ⚖️ Statutory Legal Metrology (Packaged Commodities) Rules, 2011 Engine
* **Rule 6 Mandatory Declarations Check**:
  * Name and address of manufacturer / packer / importer with PIN code.
  * Common or generic name of the commodity.
  * Net quantity in standard SI units (`g`, `kg`, `ml`, `l`); flags non-standard abbreviations such as `gm`.
  * Month and year of manufacture / packing.
  * Retail sale price (MRP ₹ inclusive of all taxes).
  * Consumer care details (telephone **and** email).
  * Unit sale price (Rule 6(11), in force from 1 January 2024).
* **Rule 7(2) Table-I Numeral Height Calibration**:
  * Evaluates measured numeral height against statutory minimums indexed by Principal Display Panel area ($A \le 50\text{ cm}^2$: $1.0\text{ mm}$, $50 < A \le 200\text{ cm}^2$: $1.5\text{ mm}$, $200 < A \le 500\text{ cm}^2$: $2.5\text{ mm}$, $500 < A \le 2500\text{ cm}^2$: $4.0\text{ mm}$, $> 2500\text{ cm}^2$: $6.0\text{ mm}$).
* **Rules with Statutory Citations & In-Force Dates**:
  * Checks read from [`rules/lmpc_rules.json`](rules/lmpc_rules.json), citing gazette notifications and source pages. Rules are only checked if in force on the inspection date.
  * For food commodities, Rule 6(1)(a) and the proviso to 6(1)(d) appropriately defer to FSSAI labelling regulations.
* **Legal Metrology Act, 2009 References**: Points to Section 18 (declarations) and Section 36 (penalties for non-standard packages).

---

## 📁 Repository Structure

```text
packsure/
├── backend/
│   ├── app/
│   │   ├── main.py                      # FastAPI REST endpoints + static SPA mount + Stitch static mount
│   │   ├── truth_service.py             # Central coordinator (OCR, OFF, DB, scoring, alternatives)
│   │   ├── voice_service.py             # Spoken verdicts, voice questions, Gemini TTS (10 Indian languages)
│   │   ├── gemini_service.py            # Gemini 3.1 Flash-Lite integration (Voice Assistant & Vision OCR)
│   │   ├── nutrition_engine.py          # Traffic lights, NOVA UPF, TruthScore (0-100)
│   │   ├── claim_buster.py              # Front claim vs back ingredients verification
│   │   ├── health_profiles.py           # Diabetic, Heart, PCOS, Gut, Child, Allergens
│   │   ├── compliance/
│   │   │   ├── legal_metrology.py       # Rule 6 & Rule 7 checks read from rules/lmpc_rules.json
│   │   │   └── packsure_service.py      # PackSure service layer (Rule 7 Table-I, Dossiers, Petitions)
│   │   ├── knowledge/
│   │   │   ├── ins_database.json        # 30+ verified INS additives with EU/US abroad bans
│   │   │   ├── hidden_sugars.json       # 50+ added sugar aliases with Glycemic Index
│   │   │   ├── industrial_fats.json     # Palm oil, palmolein, hydrogenated fats
│   │   │   ├── allergens.json           # 8 major allergens (confirmed vs precautionary)
│   │   │   ├── popular_indian_products.json # Verified popular Indian FMCG catalogue
│   │   │   └── clean_alternatives.json  # Healthier substitutes in same food categories
│   │   └── static/
│   │       └── index.html               # Unified single-page application (15 views + role switcher)
│   ├── tests/
│   │   ├── test_truth_engine.py         # 26 unit tests (ingredients, claims, NOVA, nutrition)
│   │   ├── test_legal_metrology.py      # 6 unit tests (Rule 6, Rule 7 Table I, in-force dates)
│   │   ├── test_voice.py                # 9 tests (spoken summaries, audio, Sarvam/Gemini speech, first-run guide)
│   │   └── test_api_endpoints.py        # 17 integration tests (FastAPI, Voice Assistant, PackSure)
│   └── .env.example                     # Environment template
├── stitch_platform/                     # 15 Google Stitch UI screens (HTML/Tailwind)
│   └── stitch_packsure_ai_mobile_platform/
├── openlabel/                           # React Native Expo mobile application
│   ├── app.json                         # Configured for TruthLens branding & permissions
│   ├── src/core/theme/tokens.ts         # TruthLens design tokens (Forest Green & Charcoal)
│   └── src/data/truthlens/              # TruthLens TypeScript API client
│       └── truthlens.client.ts
├── legal/                               # Statutory references, scrape scripts, and legal manifest
│   ├── text/                            # Consolidated LMPC 2011 and Legal Metrology Act texts
│   └── README.md
├── rules/                               # Rule-based LMPC compliance logic
│   ├── lmpc.py
│   └── lmpc_rules.json
└── LICENSE                              # MIT License
```

---

## 🛠️ Quickstart & Installation

### Prerequisites
* Python 3.11+
* Git
* (Optional) Node.js 18+ for React Native Expo mobile frontend

### 1. Clone the Repository
```bash
git clone https://github.com/abhishekgoswami0720/packsure.git
cd packsure
```

### 2. Configure Environment Variables
Create a `.env` file inside `backend/`:
```bash
cp backend/.env.example backend/.env
```
Add your Gemini API Key in `backend/.env`:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
```

### 3. Install Python Dependencies
```bash
cd backend
python -m pip install -r requirements.txt
```
*(Dependencies: `fastapi`, `uvicorn`, `pydantic`, `google-genai`, `pytest`, `httpx`, `python-multipart`)*

### 4. Run Automated Test Suite
Verify that all 58 test cases pass:
```bash
python -m pytest tests/ -v
```
Expected output:
```text
============================= 58 passed ==============================
```

### 5. Launch the TruthLens Backend Server
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser to experience the animated web application!

---

## 📡 REST API Reference

### Consumer TruthLens Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the animated unified TruthLens × PackSure web application |
| `GET` | `/api/health` | Health check, catalog size, and knowledge base stats |
| `GET` | `/api/truth/barcode/{code}` | Instant barcode lookup (Local DB first, then Open Food Facts) |
| `GET` | `/api/truth/search?q={query}` | Search food catalogue by name, brand, or ingredient |
| `GET` | `/api/truth/popular` | Retrieve pre-verified popular Indian packaged foods |
| `GET` | `/api/truth/products/{product_id}` | Full analysis of a catalogue product by ID |
| `GET` | `/api/truth/ingredients/lookup?q={query}` | Decode any INS number (e.g. `211`) or chemical name |
| `GET` | `/api/truth/additives` | List all cataloged INS additives with safety & functional category |
| `GET` | `/api/truth/additives/{ins}/biome` | Detailed clinical gut microbiome research profile |
| `POST` | `/api/truth/scan/manual` | Analyze raw ingredients text, claims, and nutrition per 100g |
| `POST` | `/api/truth/scan` | Multi-modal scan supporting barcode, label photo, and text |
| `POST` | `/api/truth/compare` | Head-to-head nutrition and TruthScore comparison of two products |
| `POST` | `/api/truth/alternatives` | Retrieve clean-label alternatives in the same food category |
| `POST` | `/api/truth/voice-assistant` | Conversational Gemini AI assistant with active product context |
| `GET` | `/api/consumer/daily-log` | Get tracked daily intake of sugars, sodium, and ultra-processed food |
| `POST` | `/api/consumer/daily-log` | Log consumed product to daily diary |
| `GET` | `/api/consumer/complaints` | Fetch filed consumer packaging complaints and status |
| `POST` | `/api/consumer/complaints` | File new misleading claim or LMPC non-compliance petition |

### Enforcement PackSure Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/compliance/letter-height` | Rule 7(2) Table-I statutory numeral height calibration |
| `POST` | `/api/compliance/extract-declarations` | Automated Rule 6 mandatory declarations audit from OCR |
| `GET` | `/api/compliance/inspections` | Retrieve active market inspection dossiers |
| `POST` | `/api/compliance/inspections` | Create new field inspection dossier with geo-tag & seized batch |
| `GET` | `/api/compliance/inspections/{dossier_id}` | Retrieve comprehensive dossier details and audit trail |
| `POST` | `/api/compliance/dossiers/{dossier_id}/determination` | Supervisor final determination (Approve Notice / Warn / Dismiss) |
| `GET` | `/api/compliance/supervisor/metrics` | District inspection metrics, compliance rate, and jurisdiction stats |
| `GET` | `/api/voice/languages` · `/api/voice/guide?lang=hi` | Supported languages and the first-run guide lines |
| `POST` | `/api/voice/summary` | Spoken verdict for a scan result (text + audio URL) |
| `POST` | `/api/voice/ask` | Voice question in (audio), spoken answer out |
| `POST` | `/api/voice/speak` · `GET /api/voice/audio/{key}` | Text to speech, cached audio |
| `GET` | `/api/stitch/screens` | Catalog of the 15 Google Stitch UI screens with launch URLs |
| `GET` | `/stitch/{screen_id}/code.html` | Direct access to any Google Stitch screen |

---

## 🎨 UI Animation System

The TruthLens web interface features a tailored micro-interaction and animation system:
* **Ambient Floating Glow**: Dynamic radial background gradients on hero containers (`@keyframes ambientFloat`).
* **TruthScore Circular Gauge Pulse**: Dynamic entrance animation and gentle pulse glow (`@keyframes gaugePulse`).
* **Laser Scanner Reticle**: Animated green laser sweep across the camera viewfinder simulating active optical recognition (`@keyframes scanLaserAnim`).
* **Floating Voice Lens Action Button**: Floating action button with expanding concentric ripple rings (`@keyframes fabRipple`).
* **Live Audio Wave Equalizer**: Animated 4-bar equalizer reflecting Gemini generation activity in real-time (`@keyframes soundEqualizer`).
* **Card Lift & Zoom**: Card hover elevation and subtle product image zoom (`cubic-bezier(0.16, 1, 0.3, 1)`).

---

## 📜 Statutory Legal Metrology References

* **Legal Metrology Act, 2009** (Act No. 1 of 2010): Section 18 & Section 36 (Penalties for non-standard packaging).
* **Legal Metrology (Packaged Commodities) Rules, 2011**:
  * **Rule 6**: Mandatory declarations to be printed on every retail package.
  * **Rule 7**: Prescribed minimum letter and numeral height in mm based on net quantity.
  * **Rule 9**: Manner in which declarations shall be specified.
* **FSSAI Food Safety and Standards (Labelling and Display) Regulations, 2020**.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
