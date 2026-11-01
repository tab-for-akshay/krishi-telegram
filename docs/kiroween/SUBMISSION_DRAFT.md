# Kiroween 2026 — Devpost submission draft (Krishi Telegram)

**Project name:** Krishi Telegram — the Last Telegram, resurrected for farmers
**Category:** Resurrection
**Bonus category:** none
**Live app:** https://krishi-telegram.sites.tab.bot/
**Repo:** https://github.com/tab-for-akshay/krishi-telegram (MIT, `/.kiro` at root)
**Video (YouTube, < 3 min):** https://youtu.be/LWpfXz177Lk
**AI disclosure:** Built by Tab, an AI assistant, for team lead Akshay Wagh. Developed with Kiro.

## Tagline
India shut its telegram service in 2013. We brought it back from the dead as a 20-word farm advisory that plays in Morse.

## Inspiration
On 15 July 2013 India's public telegram service closed after more than a century and a half. Telegrams were short, urgent and trusted, which is exactly what a farmer on a weak 2G connection needs from advice. Kiroween's Resurrection category asked us to revive dead tech; we revived the telegram and gave it a modern brain.

## What it does
- A farmer types a crop question in English, Hindi or Marathi (Roman script works).
- The reply arrives as an ALL-CAPS telegram: at most 20 words, sentences ended with STOP.
- Word count and a playful per-word price are shown (50 paise a word, 10-word minimum; illustrative, not the historical tariff).
- The telegram plays as Morse code audio (Web Audio API, no files) and prints as a sepia "ghost office" telegram form.
- A safety floor in code runs before AND after the model: poisoning/self-harm language gets an emergency telegram with 108 / 112 / Tele-MANAS 14416; any pesticide-name or dose question is referred to the local Krishi Vigyan Kendra instead of reaching the model.

## How we built it (Kiro)
- **Steering** (`.kiro/steering/product.md, tech.md, structure.md`) fixed the vision, the stack (one Cloudflare Worker + vanilla HTML/CSS/JS) and the rules (20 words, STOP, safety first).
- **Spec** (`.kiro/specs/last-telegram/`) — EARS requirements, design with data flow, and a task list Kiro ticked as it built.
- **Hook** (`.kiro/hooks/test-on-save.json`) runs `node --test` on every save in `site/`.
- Kiro CLI built the worker, frontend and 4 test suites (Morse, pricing, safety, disclosure) headless from the spec; all tests pass.
- Model: Groq `openai/gpt-oss-120b`, falling back to `gpt-oss-20b`, then Gemini Flash-Lite; JSON mode; word count recomputed in code.

## Challenges
- Small models love to recommend chemicals. We moved safety out of the prompt and into code, checked on both the question and the answer.
- Gpt-oss spends tokens reasoning; a 200-token cap returned empty answers, so we set low reasoning effort and a larger cap.

## Accomplishments
A complete, themed product in one page under ~40 KB that works on slow phones, with the Kiro spec trail in the repo.

## What we learned
Spec-first with steering made the AI build predictable: the 20-word rule, STOP grammar and safety floor came out right because they were written down before code.

## What's next
SMS delivery (a real telegram to a feature phone), Devanagari output alongside Morse, and KVK sign-off for flagged queries.

## Built with
kiro, cloudflare-workers, javascript, html5, css3, web-audio-api, groq, gemini

## Notes for judges
No login needed. Try: "My tomato leaves are curling and turning yellow", then press PLAY MORSE and PRINT TELEGRAM. Try "pesticide dose for whitefly" to see the safety referral.
