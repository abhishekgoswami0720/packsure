<div align="center">

<img src="./assets/icon.png" alt="OpenLabel" width="96" height="96" />

# OpenLabel

**Know what's in your food — before you buy it.**

An offline-first mobile scanner for packaged food in India. Point it at a barcode or
ingredient label and get a transparent, rule-based 0–10 verdict in seconds — entirely
on-device. No account, no tracking, nothing leaves your phone.

[![Download APK](https://img.shields.io/badge/Download-Android%20APK-8DB355?style=for-the-badge&logo=android&logoColor=white)](https://github.com/armaanux/openlabel/releases/latest/download/OpenLabel.apk)
&nbsp;
[![Website](https://img.shields.io/badge/Website-getopenlabel.netlify.app-111?style=for-the-badge&logo=netlify&logoColor=white)](https://getopenlabel.netlify.app)
&nbsp;
[![Read the case study](https://img.shields.io/badge/Read%20the-Case%20Study-111?style=for-the-badge)](https://armaanux.in/work/openlabel)
&nbsp;
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-555?style=for-the-badge)

</div>

---

## Why it exists

Walk down any supermarket aisle in India and most people buy packaged food without a
real way to judge what's inside. Nutrition panels are dense, additive codes are
cryptic, and some ingredients still sold here are **banned or restricted in the EU, US,
UK, Canada, or Australia** — with no hint of that on the pack.

OpenLabel is built to change that decision *at the shelf*. Scan a product, get a
straight answer, decide with confidence. The goal isn't to tell anyone what to eat —
it's to make what you're eating **knowable**.

📖 **Read the full story and design process in the [case study](https://armaanux.in/work/openlabel).**

🌐 **See it in action on the [website](https://getopenlabel.netlify.app)** &nbsp;·&nbsp; source: [armaanux/site-openlabel](https://github.com/armaanux/site-openlabel)

## What it does

- **Scan a barcode** → instant lookup against an offline product catalogue, with a live
  [Open Food Facts](https://world.openfoodfacts.org/) fallback when a product isn't
  bundled, and a graceful "scan the label instead" path when it's nowhere to be found.
- **Scan an ingredient label** → on-device OCR reads the ingredients panel directly, so
  it works for any product, catalogued or not.
- **Get a 0–10 verdict** → a transparent, Nutri-Score-style nutritional score you can
  actually read the reasoning behind — not a black box.
- **Understand every additive** → tap any ingredient for what it is, what it does, and
  its regulatory status in India and abroad.
- **See what's flagged elsewhere** → additives banned or restricted in other regions are
  surfaced with the specific countries named (e.g. *"Banned in the EU"*).

## What makes it different

| | OpenLabel |
|---|---|
| **Scoring** | Rule-based and **never AI** — a deterministic, EU-validated Nutri-Score algorithm, scaled to a realistic serving size so condiments aren't unfairly punished. Every point is explainable. |
| **Privacy** | Fully offline-first. No account, no analytics, no data collection. The camera never uploads a frame. |
| **Regulatory lens** | Cross-references additives against how they're regulated in the US, EU, UK, Canada & Australia — a concrete signal Indian labels don't provide. |
| **Built for India** | Designed around Indian packaged products, FSSAI additive listings, and real shopping behaviour. |

> **Scope note:** OpenLabel reports additive *presence* and *regulatory status*. It does
> not detect pesticide residues or verify quantitative limits, and it is not medical
> advice.

## Tech stack

- **React Native 0.85** + **Expo SDK 56** (new architecture) with **Expo Router**
- **NativeWind v4** (Tailwind) + **Reanimated** for the UI
- **On-device OCR** via ML Kit text recognition — no server round-trip
- **SQLite** (expo-sqlite) for the bundled ingredient & product data
- **TypeScript** end to end

## Getting started

```bash
npm install
npm start        # Expo dev server — open in a dev build or on device
npm run android  # build & run on a connected Android device/emulator
npm run ios      # build & run on iOS simulator
```

Quality gates:

```bash
npm run typecheck
npm run lint
```

## Project structure

```
app/            Expo Router routes (scanner, results, ingredient, history)
src/
  features/     Screen-level features (scanner, results, ingredient, history)
  domain/       Scoring, ingredients, products — the rule-based core
  data/         Open Food Facts client, OCR pipeline, local catalogue
  shared/       Reusable UI primitives
  core/         Theme, providers, bootstrap
docs/           Privacy policy, Play Data Safety, store listing
```

## Download

Grab the latest Android build from the
**[Releases page](https://github.com/armaanux/openlabel/releases/latest)** or directly:

**[⬇ OpenLabel.apk](https://github.com/armaanux/openlabel/releases/latest/download/OpenLabel.apk)**

## Privacy

OpenLabel collects **no personal data**. Scans, history, and preferences stay on the
device. See the full [privacy policy](./docs/privacy-policy.md).

## License

[MIT](./LICENSE) — © Armaan Parvez
