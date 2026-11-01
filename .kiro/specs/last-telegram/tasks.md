# Tasks — Last Telegram (Krishi Telegram)

Implementation checklist. Tick boxes as each task is completed.

---

## Kiro Workflow Setup
- [x] Create `.kiro/steering/product.md`
- [x] Create `.kiro/steering/tech.md`
- [x] Create `.kiro/steering/structure.md`
- [x] Create `.kiro/specs/last-telegram/requirements.md` (EARS format)
- [x] Create `.kiro/specs/last-telegram/design.md`
- [x] Create `.kiro/specs/last-telegram/tasks.md` (this file)
- [x] Create `.kiro/hooks/test-on-save.json`

## Core Implementation
- [x] Create `site/worker.mjs` — Cloudflare Worker
  - [x] Static asset serving via `env.ASSETS`
  - [x] POST `/api/telegram` route
  - [x] Safety floor (`safetyFloor()`) — self-harm and pesticide checks
  - [x] Groq API call with primary + fallback model
  - [x] Morse encoder (`morseEncode()`)
  - [x] Pricing (`costPaise()`)
  - [x] JSON response `{ telegram, words, cost_paise, morse }`
- [x] Create `site/index.html` — accessible single-page UI
  - [x] Header with title and candle SVG
  - [x] Form: textarea, language selector, submit button
  - [x] Result area with `aria-live`
  - [x] Telegram card with stamp, fields, body
  - [x] Print and Morse play buttons
  - [x] Footer with disclosure text
- [x] Create `site/styles.css` — vintage telegraph styling
  - [x] CSS custom properties (`--kt-*`)
  - [x] Sepia paper telegram card
  - [x] Flickering candle animation
  - [x] Ghost operator overlay
  - [x] Print stylesheet (`@media print`)
  - [x] Responsive at 390 px
- [x] Create `site/app.js` — frontend logic
  - [x] Form submit handler with fetch
  - [x] Telegram card renderer
  - [x] Morse audio player (Web Audio API)
  - [x] Print button handler
  - [x] Loading and error states

## Tests
- [x] Create `test/morse.test.mjs` — Morse encoder tests
- [x] Create `test/pricing.test.mjs` — word count and cost tests
- [x] Create `test/safety.test.mjs` — safety floor tests
- [x] Create `test/disclosure.test.mjs` — disclosure line presence tests

## Project Files
- [x] Create `wrangler.toml`
- [x] Create `package.json`
- [x] Create `README.md`
- [x] Create `LICENSE`

## Verification
- [x] Run `node --test` — all tests pass
- [x] Verify disclosure line in README and index.html footer
