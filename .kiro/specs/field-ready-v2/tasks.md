# Tasks: Krishi Telegram v2

- [x] 1. Language-specific safety telegrams (EN/HI/MR, Roman script) and a language-aware system prompt that also requires a `cause` field (R1, R2)
- [x] 2. `findKvk` + ASSETS-loaded `site/data/kvk.json`; accept `state`/`district`; KVK-specific pesticide referral telegram; return `kvk` in the response (R3)
- [x] 3. Frontend: state select + district input (localStorage), KVK card under the telegram, cause line (R3)
- [x] 4. Frontend: visual Morse strip synced with audio, WPM label (R4)
- [x] 5. `eval/cases.json` (10+ canonical crop problems) and `eval/run.mjs` against the live API (R2)
- [x] 6. Unit tests for KVK lookup, language safety telegrams, eval-set shape; `node --test` green (R5)
