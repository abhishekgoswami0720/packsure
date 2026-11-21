# PackSure & TruthLens (TruthIn 2.0)
### Next-Generation Food Intelligence & Statutory Legal Metrology Compliance Platform for India

[![Python 3.11](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Google Gemini API](https://img.shields.io/badge/Google%20Gemini-3.1%20Flash-4285F4?style=flat&logo=google&logoColor=white)](https://ai.google.dev/)
[![React Native Expo](https://img.shields.io/badge/React%20Native-Expo%2056-000020?style=flat&logo=expo&logoColor=white)](https://expo.dev/)
[![LMPC Rules 2011](https://img.shields.io/badge/Compliance-Legal%20Metrology%202011-1B4332?style=flat)](legal/)
[![Tests Passing](https://img.shields.io/badge/Tests-38%2F38%20Passing-2D6A4F?style=flat&logo=pytest&logoColor=white)](tests/)
[![License MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌟 Overview

**PackSure & TruthLens** is an integrated food intelligence and consumer transparency platform built specifically for Indian consumers, regulatory enforcement officers, and FMCG brands.

Inspired by *TruthIn by Food Pharmer* and statutory requirements under the **Legal Metrology (Packaged Commodities) Rules, 2011**, PackSure bridges the gap between opaque label fine-print and consumer empowerment:

1. **For Everyday Consumers**: Decodes INS chemical additive numbers, unmasks 50+ hidden sugar aliases, flags industrial palm fats, calculates a deterministic **0–100 TruthScore**, classifies **NOVA Ultra-Processed Foods (UPF)**, exposes deceptive front-of-pack marketing claims, and answers natural language questions via **Voice Lens AI (Google Gemini 3.1 Flash)**.
2. **For Enforcement & Legal Metrology Officers**: Automatically inspects front and back of pack for mandatory Rule 6 declarations (MRP, Net Quantity, Customer Care, Unit Sale Price, Month/Year of Manufacture) and Rule 7 minimum letter height calibration.

---

## 🚀 Key Features

### 1. 🔍 Multi-Modal Triple Input Scanner
* **EAN-13 Barcode Scanning**: Instant lookup against a verified local Indian FMCG database (Parle-G, Maggi, Bournvita, Amul, Epigamia, The Whole Truth) with fallbacks to Open Food Facts.
* **Camera OCR & Multi-Modal Gemini Vision**: Transcribes and extracts ingredients and nutrition tables directly from packaged food photos using Google Gemini 3.1 Flash.
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

### 5. 🎙️ Voice Lens AI Assistant (Powered by Gemini 3.1 Flash)
* Direct natural language conversational food advisor.
* Real-time audio equalizer visualization in the web client.
* Injects active product context into Gemini:
  * *"Is this biscuit safe for someone with Type-2 diabetes?"*
  * *"Does this cereal contain palm oil or synthetic dyes?"*
  * *"Explain what INS 407 (Carrageenan) does to the gut microbiome."*

### 6. 🎨 Google Stitch 15-Screen Platform
TruthLens hosts 15 production UI screens designed in **Google Stitch**, accessible interactively via the built-in gallery:
* Consumer Home Dashboard, Triple Input Scanner, Product Intelligence Overview, Voice Lens Assistant, Hidden Sugar Breakdown, INS Additive Decoder, INS 330 Gut Biome Detail, Letter Height Audit (Rule 7 mm calibration), Declaration OCR Extraction, Daily Product Scan Log, Consumer Complaints, Field Inspector Dashboard, Supervisory Review Queue, Supervisor Enforcement Dashboard, and Supervisor Review & Notice Approval.

### 7. ⚖️ Legal Metrology (Packaged Commodities) Rules, 2011 Compliance
* **Rule 6 Mandatory Declarations Check**:
  * Name and address of manufacturer / packer / importer.
  * Common or generic name of the commodity.
  * Net quantity in standard metric units ($g, kg, ml, l$).
  * Month and year of manufacture / packing.
  * Retail sale price (MRP ₹ inclusive of all taxes).
  * Consumer care details (name, address, telephone, email).
* **Section 36 Penalty Assessment**: Flags violations and calculates statutory penalties under the Legal Metrology Act, 2009.

---

## 📁 Repository Structure

```text
packsure/
├── backend/
│   ├── app/
│   │   ├── main.py                      # FastAPI REST endpoints + static SPA mount + Stitch static mount
│   │   ├── truth_service.py             # Central coordinator (OCR, OFF, DB, scoring, alternatives)
│   │   ├── gemini_service.py            # Gemini 3.1 Flash integration (Voice Assistant & Vision OCR)
│   │   ├── nutrition_engine.py          # Traffic lights, NOVA UPF, TruthScore (0-100)
│   │   ├── claim_buster.py              # Front claim vs back ingredients verification
│   │   ├── health_profiles.py           # Diabetic, Heart, PCOS, Gut, Child, Allergens
│   │   ├── compliance/
│   │   │   └── legal_metrology.py       # PackSure Rule 6 statutory checks
│   │   ├── knowledge/
│   │   │   ├── ins_database.json        # 30+ verified INS additives with EU/US abroad bans
│   │   │   ├── hidden_sugars.json       # 50+ added sugar aliases with Glycemic Index
│   │   │   ├── industrial_fats.json     # Palm oil, palmolein, hydrogenated fats
│   │   │   ├── allergens.json           # 8 major allergens (confirmed vs precautionary)
│   │   │   ├── popular_indian_products.json # Verified popular Indian FMCG catalogue
│   │   │   └── clean_alternatives.json  # Healthier substitutes in same food categories
│   │   └── static/
│   │       └── index.html               # Mobile-first responsive web application with animations
│   ├── tests/
│   │   ├── test_truth_engine.py         # 26 unit tests (ingredients, claims, NOVA, nutrition)
│   │   └── test_api_endpoints.py        # 12 integration tests (FastAPI, Voice Assistant, Stitch)
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
└── rules/                               # Rule-based LMPC compliance logic
    ├── lmpc.py
    └── lmpc_rules.json
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
Verify that all 38 test cases pass:
```bash
python -m pytest tests/ -v
```
Expected output:
```text
============================= 38 passed in 4.79s ==============================
```

### 5. Launch the TruthLens Backend Server
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser to experience the animated web application!

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the animated mobile-first TruthLens web application |
| `GET` | `/api/health` | Health check, catalog size, and knowledge base stats |
| `GET` | `/api/truth/barcode/{code}` | Instant barcode lookup (Local DB first, then Open Food Facts) |
| `GET` | `/api/truth/search?q={query}` | Search food catalogue by name, brand, or ingredient |
| `GET` | `/api/truth/popular` | Retrieve pre-verified popular Indian packaged foods |
| `GET` | `/api/truth/ingredients/lookup?q={query}` | Decode any INS number (e.g. `211`) or chemical name |
| `POST` | `/api/truth/scan/manual` | Analyze raw ingredients text, claims, and nutrition per 100g |
| `POST` | `/api/truth/scan` | Multi-modal scan supporting barcode, label photo, and text |
| `POST` | `/api/truth/compare` | Head-to-head nutrition and TruthScore comparison of two products |
| `POST` | `/api/truth/alternatives` | Retrieve clean-label alternatives in the same food category |
| `POST` | `/api/truth/voice-assistant` | Conversational Gemini AI assistant with product context |
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
