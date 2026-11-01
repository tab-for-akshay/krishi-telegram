# Design — Last Telegram (Krishi Telegram)

## Architecture Overview

```
Browser                           Cloudflare Worker (site/worker.mjs)
──────────────────────────────    ──────────────────────────────────────
index.html  ──load──►  GET /      env.ASSETS.fetch()
app.js      ──POST──►  /api/telegram
                                  │
                         safety_floor() ──✗──► emergency telegram
                                  │
                                  ▼
                         Groq API (openai/gpt-oss-120b)
                                  │  fallback: openai/gpt-oss-20b
                                  ▼
                         morse_encode(telegram)
                                  │
                                  ▼
                         { telegram, words, cost_paise, morse }
                                  │
app.js      ◄──JSON──────────────┘
  │
  ├── render telegram card
  ├── Web Audio Morse playback
  └── print stylesheet
```

---

## Component Design

### Worker (`site/worker.mjs`)

**Exports:** ES module `default` with `fetch(request, env, ctx)` handler.

**Routes:**
- `GET /*` → `env.ASSETS.fetch(request)` (static files)
- `POST /api/telegram` → telegram handler

**Telegram handler:**
1. Parse `{ text, lang }` from JSON body. Validate: text ≤ 2000 chars, lang ∈ {en, hi, mr}.
2. Run `safetyFloor(text)` — returns `{ blocked: true, telegram }` or `{ blocked: false }`.
3. Build system prompt: "You are a terse Indian agricultural telegram service. Reply ONLY in JSON with keys telegram (string), words (number). Telegram must be UPPERCASE, max 20 content words, sentences separated by STOP. Language: {lang}."
4. Call Groq primary → fallback on non-2xx.
5. Parse `{ telegram, words }` from model JSON. Compute `cost_paise` = `max(words, 10) * 50`.
6. Run `morseEncode(telegram)` to produce the `morse` string (dots, dashes, spaces).
7. Return `{ telegram, words, cost_paise, morse }` as JSON.

**Safety Floor (`safetyFloor(text)`):**
- Keyword sets (compiled regex, case-insensitive, Unicode):
  - `SELF_HARM`: poison|pesticide.*swallow|swallow.*pesticide|keet.*naashak.*pi|zeher.*pi|aatmahatya|suicide|self.harm|poisoning symptom|zeher ke lakshan
  - `PESTICIDE_DOSE`: specific chemical names list (endosulfan, chlorpyrifos, monocrotophos, etc.) | dose|dosage|kitni maatra|kiti dose
- If `SELF_HARM` matches → return emergency telegram with 108, 112, 14416.
- If `PESTICIDE_DOSE` matches → return KVK redirect telegram.

**Morse Encoder (`morseEncode(text)`):**
- ITU-R table: A–Z, 0–9, punctuation (. , ? /).
- Output: string of `.`, `-`, ` ` (1 space = letter gap, 3 spaces = word gap).
- Ignore characters not in table (strip STOP as word boundary).

**Pricing:**
- `costPaise(wordCount)` = `Math.max(wordCount, 10) * 50`
- Returns integer. 10-word minimum is an illustrative nod to word-counted telegrams.

---

### Frontend (`site/app.js`)

**State:** single `state` object `{ loading, telegram, words, cost_paise, morse, audioCtx, sourceNode }`.

**Flow:**
1. User fills `#question` textarea, selects `#lang`.
2. Submit → show spinner, POST JSON to `/api/telegram`.
3. On success → render telegram card: stamp, to/from fields, body text, word/cost line.
4. Show `#play-morse` button; attach click handler to `playMorse(state.morse)`.
5. Show `#print-btn`; click opens `window.print()`.

**Morse Audio (`playMorse(morseStr)`):**
- Parse dots/dashes/spaces into timed OscillatorNode events.
- Unit = 60 ms. Dot = 1u on, dash = 3u on, letter gap = 1u off, word gap = 7u off.
- Uses `AudioContext` with 600 Hz sine wave, gain envelope.
- Returns a stop function stored in state to cancel mid-play.

---

### Frontend (`site/styles.css`)

**Design tokens (CSS custom properties `--kt-*`):**
- `--kt-paper`: #f5e6c8 (sepia)
- `--kt-ink`: #2a1a0a (dark brown)
- `--kt-red`: #8b0000 (stamp red)
- `--kt-ghost`: rgba(200,220,200,0.15)
- `--kt-font-body`: 'Courier New', Courier, monospace
- `--kt-font-heading`: Georgia, serif

**Key sections:**
- `.kt-page` — full viewport, dark background with flickering CSS candle animation
- `.kt-form-card` — form panel, light background
- `.kt-telegram` — output: torn-paper border, sepia gradient, typewriter font
- `.kt-stamp` — red diagonal "RECEIVED" stamp
- `.kt-ghost` — translucent ghost operator SVG overlay (CSS keyframe fade)
- `@media print` — hide everything except `.kt-telegram`
- `@media (max-width: 390px)` — single column, larger tap targets

---

### HTML (`site/index.html`)

Sections:
1. `<header>` — title "KRISHI TELEGRAM" with subtitle and candle SVG
2. `<main>` — form: textarea `#question`, select `#lang`, submit button `#send-btn`
3. `#result` — hidden until response; contains telegram card `#telegram-card`
4. `<footer>` — disclosure text, attribution

Accessibility:
- `lang="en"` on `<html>` (content is mixed, primary UI labels in English)
- All inputs have `<label for=…>`
- `aria-live="polite"` on `#result` for screen-reader announcement
- `aria-busy` on submit button during fetch
- High-contrast focus ring via `:focus-visible`

---

## Data Flow Diagram

```
User Input (text, lang)
        │
        ▼
  [Frontend: app.js]
  POST /api/telegram
        │
        ▼
  [Worker: safety_floor]
   blocked? ──yes──► emergency JSON ──► Frontend renders
        │
       no
        ▼
  [Worker: Groq API call]
  prompt → model → parse JSON
        │
        ▼
  [Worker: morseEncode + costPaise]
        │
        ▼
  JSON response { telegram, words, cost_paise, morse }
        │
        ▼
  [Frontend: render card]
  [Frontend: enable Morse play]
  [Frontend: enable print]
```

---

## Error Handling

| Scenario | Response |
|---|---|
| Groq primary fails | Retry with fallback model |
| Both models fail | Return 502 with error telegram "SERVICE UNAVAILABLE STOP TRY AGAIN LATER STOP" |
| Invalid request body | Return 400 |
| Safety floor triggered | Return 200 with emergency/redirect telegram |
| Network error on frontend | Show error message in result area |
