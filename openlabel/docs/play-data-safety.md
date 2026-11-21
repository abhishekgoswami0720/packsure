# Google Play — Data Safety answers (OpenLabel)

Fill these into **Play Console → App content → Data safety**. The wording matches
what OpenLabel actually does (verified against the code), so you can stand behind
every answer.

---

## Data collection and security

**Q: Does your app collect or share any of the required user data types?**
→ **No.**

*Why this is correct:* Google defines "collect" as transmitting user data **off
the device**. OpenLabel:

- reads labels with **on-device OCR** — photos and extracted text never leave
  the phone;
- stores scan history **locally only** — it is never transmitted to us;
- sends **only a product barcode** to Open Food Facts. A barcode is product
  data, not personal user data, and does not fall under any of Google's user
  data categories (personal info, location, photos, identifiers, app activity,
  etc.).

Because you answer **No**, Google will display **"No data collected"** and
**"No data shared"** on your store listing, and the follow-up questions
(encryption in transit, deletion requests) are skipped automatically.

> Optional / conservative stance: if you ever add features that upload images or
> attach identity, revisit this and declare accordingly. As the app stands today,
> **No** is accurate.

---

## Related "App content" declarations you'll also be asked

| Question | Answer | Note |
|---|---|---|
| Does your app contain **ads**? | **No** | No ad SDKs of any kind. |
| **App access** — is all functionality available without special access (login)? | **Yes, all features available without an account** | OpenLabel has no login. |
| **Content rating** questionnaire | Answer honestly → results in **Everyone / 3+** | No violence, no user communication, no mature content. |
| **Target audience & content** | Select **13+** (general audience) | Don't mark "designed for children" — it triggers stricter Families policies you don't need. |
| **Government app**? | **No** | |
| **Financial features**? | **No** | |
| **Health apps** declaration (if shown) | Not a medical/health-data app | OpenLabel provides general food information, not medical advice. |
| **Privacy policy URL** | *(your hosted privacy-policy.md URL)* | Required. |

---

## One-line summary of your data-safety story

> OpenLabel collects no user data, shares no user data, shows no ads, requires no
> account, and processes label scans entirely on-device. The only network call
> sends a product barcode to Open Food Facts to fetch public product information.
