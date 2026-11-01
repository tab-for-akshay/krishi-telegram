# Design: Krishi Telegram v3

- worker.mjs: system prompt asks for JSON {cause, telegram, native?}; `native` validated with /[\u0900-\u097F]/; fixed Devanagari safety telegrams in SAFETY_NATIVE {hi, mr}; response gains `native`.
- index.html/app.js: example chips (data-q, data-lang); "Find my KVK" button opens the existing state/district picker and calls the existing client-side KVK lookup (fetch data/kvk.json on demand); SMS/Copy buttons (sms:?&body=); Roman/देवनागरी toggle on the printed form; footer weight read from weight.json.
- scripts/weight.mjs uses node:zlib gzipSync; run it after edits.
- tests: test/safety-guard.test.mjs (static checks of worker.mjs source + a pure-function check of the safety floor); existing tests stay green.
