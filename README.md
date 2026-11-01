# Krishi Telegram

**Live:** https://krishi-telegram.vercel.app (Vercel) · mirror: https://krishi-telegram.sites.tab.bot


**Kiroween 2026 Hackathon — Category: RESURRECTION**

> *"What hath God wrought"* — first US telegram, 1844.
> India's public telegram service closed on 15 July 2013.
> *"ADVISORY RECEIVED STOP SPRAY NEEM OIL STOP"* — Krishi Telegram, 2026.

Built by Tab, an AI assistant, for team lead Akshay Wagh — using Kiro (CLI, specs, steering, hooks).

**Live demo:** https://krishi-telegram.sites.tab.bot/

---

## What It Is

**Krishi Telegram** resurrects India's telegram service — shut by BSNL on 15 July 2013 — as an AI-powered farm advisory telegraph for low-bandwidth rural phones.

A farmer types a crop question in **English, Hindi, or Marathi**. The app replies like a 1960s Indian telegram: ALL CAPS, max 20 words, sentences separated by `STOP`, priced per word with a playful, illustrative rate (50 paise a word, 10-word minimum — a nod to word-counted telegrams, not the historical tariff). The reply is also playable as **Morse-code audio** (Web Audio API) and printable as a **ghostly vintage telegram form** complete with sepia paper, flickering candle, and a ghost telegraph operator.

```
YOUR QUESTION (reply language: English):  Mere gehu ke patte peele ho rahe hain aur murjha rahe hain

   ┌─────────────────────────────────────────────────────┐
   │  KRISHI TELEGRAPH OFFICE              RECEIVED      │
   │  TO:    FARMER IN FIELD                             │
   │  FROM:  KRISHI TELEGRAM SERVICE                     │
   │  DATE:  01 NOV 2026                                 │
   │ ────────────────────────────────────────────────── │
   │  CHECK FOR RUST SPOTS STOP IRRIGATE ONCE THIS     │
   │  WEEK STOP SHOW LEAF TO KVK FOR NUTRIENT TEST STOP│
   │ ────────────────────────────────────────────────── │
   │  15 words — Cost: ₹7.50 (750 paise)               │
   │  [▶ PLAY MORSE]  [🖨 PRINT TELEGRAM]               │
   └─────────────────────────────────────────────────────┘
```

---

## Why the Telegram?

India's telegram service ran for more than a century and a half before BSNL shut it down in 2013. For generations it was how urgent news reached villages. We resurrect it because:

1. **Radical brevity** — 20 words forces truly actionable advice. No lengthy web articles.
2. **Low-bandwidth** — one static page, no framework: about 14 KB gzipped in total (measured, `site/weight.json`), light enough for a slow mobile connection.
3. **Culturally resonant** — the telegram is a shared memory of urgent, trusted news.
4. **Safety-first** — a hard-coded safety floor intercepts any self-harm or pesticide-dose query before it ever reaches the model.

---

## Safety Floor

The app has **two layers** of safety that never reach the AI model:

| Trigger | Action |
|---|---|
| Pesticide/poison ingestion, self-harm, poisoning symptoms | Returns emergency telegram with **108**, **112**, **Tele-MANAS 14416** |
| Named chemical pesticide or dose/dosage query | Returns KVK (Krishi Vigyan Kendra) referral telegram |

These checks run **before** the model call and again on the model's **response**.

---

## How to Run

### Prerequisites
- [Node.js](https://nodejs.org/) ≥ 18
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)
- A [Groq API key](https://console.groq.com/)

### Local development

```bash
# Set your Groq API key
export GROQ_API_KEY=your_key_here

# Start local dev server (serves site/ and runs the Worker)
wrangler dev

# Open http://localhost:8787
```

### Run tests

```bash
node --test
```

All tests use the Node.js built-in test runner — no extra packages needed.

### Deploy to Cloudflare

```bash
# Add the secret
wrangler secret put GROQ_API_KEY

# Deploy
wrangler deploy
```

---


## What's new in v2 (after outside review)

Two outside critics reviewed v1 (log: [ROUNDS.md](ROUNDS.md)). v2 changes:

- **Replies in the farmer's language.** Pick Hindi or Marathi and the telegram comes back in that language in Roman letters (so it still goes out as Morse). Safety telegrams exist in all three languages.
- **A real KVK, not "your local KVK".** The 708 KVKs listed by state on ICAR's Krishi Vigyan Kendra page ([source](https://icar.org.in/en/krishi-vigyan-kendras), fetched 1 Nov 2026) ship with the app. India has 731 KVKs in all (PIB, [source](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2186124)), so a few districts may not be listed yet. Pick your state and district: a pesticide-dose question gets "KVK AKOLA SE SAMPARK KAREN …" and the KVK's address and host institution.
- **Names the cause first.** The model must name the most likely pest, insect-spread virus, disease or deficiency before advising. A 12-case eval set (`node eval/run.mjs https://krishi-telegram.sites.tab.bot`) checks this on the live site.
- **Morse you can see.** The dots and dashes are drawn under the telegram and light up as they play, with the speed in WPM.
- **Stronger safety floor.** "Drank pesticide / pi liya / pyayla" phrasing in three languages now goes straight to emergency numbers (108, 112, Tele-MANAS 14416) without the model.
- **Built with Kiro.** The v2 spec lives in `.kiro/specs/field-ready-v2/` (EARS requirements, design, tasks). Kiro CLI implemented it; tests went from 30-odd to 93, all green.

## Kiro Workflow

This project was built using **Kiro**, an AI-assisted development tool, following the full Kiro workflow. The workflow is part of the hackathon judging criteria.

### Steering files (`.kiro/steering/`)

| File | Purpose |
|---|---|
| [`product.md`](.kiro/steering/product.md) | Vision, problem, target users, experience pillars |
| [`tech.md`](.kiro/steering/tech.md) | Stack, runtime, constraints, key decisions |
| [`structure.md`](.kiro/steering/structure.md) | Directory layout, naming conventions |

Steering files guide every file the agent creates. They ensure the AI never drifts from the product vision.

### Spec (`.kiro/specs/last-telegram/`)

| File | Purpose |
|---|---|
| `requirements.md` | EARS-format functional and non-functional requirements |
| `design.md` | Architecture diagram, component design, data flow, error handling |
| `tasks.md` | Checkbox implementation task list — ticked as each task completes |

The spec was written first, before any implementation, so the build had a verifiable contract.

### Agent hook (`.kiro/hooks/test-on-save.json`)

Configured to run `node --test` automatically whenever a file in `site/` is saved. This gives instant feedback during development — like a tiny CI loop in the editor.

### Build order

1. Steering files → define the product and tech constraints
2. Spec → EARS requirements, component design, task checklist
3. Hook → automatic test-on-save
4. Worker → core logic (Morse encoder, safety floor, Groq integration)
5. Frontend → HTML, CSS (vintage theme), JavaScript (Morse audio, fetch)
6. Tests → verify Morse, pricing, safety, disclosure
7. README + LICENSE
8. `node --test` → all tests pass
9. Tick tasks.md checkboxes

---

## Kiro Evidence

All artifacts produced by the Kiro AI agent during this build:

| Artifact | Path |
|---|---|
| Spec v1 (last-telegram) | [`.kiro/specs/last-telegram/`](.kiro/specs/last-telegram/) |
| Spec v2 (field-ready-v2) | [`.kiro/specs/field-ready-v2/`](.kiro/specs/field-ready-v2/) |
| Spec v3 (judge-ready-v3) | [`.kiro/specs/judge-ready-v3/`](.kiro/specs/judge-ready-v3/) |
| Steering: product | [`.kiro/steering/product.md`](.kiro/steering/product.md) |
| Steering: tech | [`.kiro/steering/tech.md`](.kiro/steering/tech.md) |
| Steering: structure | [`.kiro/steering/structure.md`](.kiro/steering/structure.md) |
| Hook: test-on-save | [`.kiro/hooks/test-on-save.json`](.kiro/hooks/test-on-save.json) |
| Hook: safety-floor-guard | [`.kiro/hooks/safety-floor-guard.json`](.kiro/hooks/safety-floor-guard.json) |
| Eval set | [`eval/cases.json`](eval/cases.json) |

---

## Tests

Run with: `node --test`

All tests use the Node.js built-in test runner — no extra packages needed.

**Current pass count: 127 tests, 0 failures.**

Test files:

| File | What it covers |
|---|---|
| `test/morse.test.mjs` | Morse encoder unit tests |
| `test/pricing.test.mjs` | Word counter and cost calculation |
| `test/safety.test.mjs` | Safety floor trigger tests |
| `test/lang.test.mjs` | Language-aware safety telegrams |
| `test/kvk.test.mjs` | KVK lookup function |
| `test/ingest.test.mjs` | Ingestion phrasing triggers |
| `test/eval-shape.test.mjs` | Eval set shape validation |
| `test/disclosure.test.mjs` | Disclosure line presence |
| `test/safety-guard.test.mjs` | Safety floor guard (hook target) |
| `test/redteam.test.mjs` | The 17-attack red-team set (REDTEAM.md) |

---

## Live Eval

The eval harness runs the 12-case eval set against the live site.

**Last run:** [`eval/last_run.txt`](eval/last_run.txt)

Run manually: `node eval/run.mjs https://krishi-telegram.sites.tab.bot`

---

## Project Structure

```
krishi-telegram/
├── .kiro/
│   ├── steering/          # product.md, tech.md, structure.md
│   ├── specs/             # last-telegram (v1), field-ready-v2, judge-ready-v3
│   └── hooks/             # test-on-save.json, safety-floor-guard.json
├── site/
│   ├── index.html         # Single-page UI
│   ├── styles.css         # Vintage telegraph theme
│   ├── app.js             # Frontend: fetch, Morse audio, KVK finder, SMS/copy, print
│   ├── worker.mjs         # API + static serve (Vercel or Cloudflare Workers)
│   ├── weight.json        # measured page weight
│   └── data/kvk.json      # 708 KVKs from ICAR's page, with source and fetch date
├── eval/                  # 12-case live eval set and last run
├── test/                  # 10 test files, 127 tests (node --test)
├── REDTEAM.md, ROUNDS.md
├── wrangler.toml, package.json, README.md, LICENSE
```

---

## API

`POST /api/telegram`

**Request:**
```json
{ "text": "My wheat has yellow rust spots", "lang": "en" }
```

**Response:**
```json
{
  "telegram": "APPLY FUNGICIDE STOP REMOVE INFECTED LEAVES STOP CONSULT KVK STOP",
  "words": 7,
  "cost_paise": 500,
  "morse": ".- .--. .--. .-.. -.--   ..-. ..- -. --. .. -.-. .. -.. . …"
}
```

`lang` values: `en` (English), `hi` (Hindi), `mr` (Marathi).

---

## Tech Stack

- **One fetch handler** (`site/worker.mjs`) — runs on Vercel (live) or Cloudflare Workers (`wrangler.toml`)
- **Model chain** — Groq `openai/gpt-oss-120b` (primary), Groq `openai/gpt-oss-20b`, then Gemini Flash-Lite as fallbacks (Hindi and Marathi try Gemini Flash first)
- **Web Audio API** — Morse code playback, no audio files
- **Vanilla HTML/CSS/JS** — no framework, no bundler, about 58 KB raw / 14 KB gzipped (`site/weight.json`)

---

## Licence

MIT — see [LICENSE](./LICENSE).

---

*Built by Tab, an AI assistant, for team lead Akshay Wagh. Made with Kiro.*
*Kiroween 2026 Hackathon — RESURRECTION category.*
