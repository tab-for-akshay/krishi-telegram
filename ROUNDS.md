# Krishi Telegram: review rounds (v1 → v2 → v3)

Built by Tab, an AI assistant, for team lead Akshay Wagh. Standing rule: v1 → two outside critics → v2 → two critics → v3; only v3 is final.

## Round 1 (1 Nov 2026, 19:28–19:30Z) on v1
Critics: **Fo** (Wajo's agent; it loaded the live site and sent a real question) and an open-weight critic model (gpt-oss-120b on Groq). Full texts: `reviews/r1_fo.md`, `reviews/r1_critic.md`.

Scores v1 — Fo: Impact 6, Implementation 6, Design 7, Innovation 5, Presentation 5. Critic 2: 6 / 5 / 4 / 7 / 3.

Top changes taken into v2:
1. **Reply in the farmer's language** (Fo): Hindi/Marathi telegrams in Roman letters; per-language safety telegrams; English-reply guard with one retry; Marathi routed to the model that wrote it best in our A/B test (gemini-3.5-flash; gpt-oss failed JSON validation on Romanized Marathi).
2. **Real KVK referral from a public dataset** (Fo): ICAR's Krishi Vigyan Kendra list for every state (708 KVKs, `site/data/kvk.json`, source page + fetch date). A dose question now says e.g. "KVK AKOLA SE SAMPARK KAREN" and shows that KVK's address and host institution.
3. **No more filler advice** (Fo caught "apply organic fertilizer" for tomato leaf curl): the model must name a specific cause first; the prompt walks common pests, insect-spread viruses and diseases before deficiencies. New 12-case eval set (`eval/cases.json`, `node eval/run.mjs <url>`): 9–11 of 12 pass on the live site across runs.
4. **Morse you can see** (Fo): a dots-and-dashes strip highlighted in sync with the audio, plus WPM.
5. **Safety floor gap found while testing v2** (Tab): "my brother drank pesticide" did not trip the v1 floor. Added ingestion phrasing in English, Hinglish and Marathi (drank/pi liya/pyayla + pesticide/keetnaashak/zeher/vish), with tests.
6. Built with **Kiro CLI** (kiro-cli 2.37, `--no-interactive`) from a new spec `.kiro/specs/field-ready-v2/` (EARS requirements, design, tasks): Kiro wrote the worker/front-end/eval/tests changes (90 tests green); Tab then fixed the language, safety and model-routing issues found in live testing (93 tests green).

Not taken: invented "pilot with 30 farmers, 92% understood" metrics (critic 2 suggested mock numbers — we don't publish numbers we didn't measure); SMS gateway (paid).

## Round 2 (on v2, 1 Nov 2026 19:49–20:13Z)
Reviewers: Fo by Wajo (opened the live site), Skydive agent "Arden" (loaded the site, read the repo), open-weight critic gpt-oss-120b.

Scores v2: Fo: Impact 6, Tech 7, Design 7, Innovation 8, Presentation 4. Arden: 6 / 6 / 7 / 6 / 4. gpt-oss: 6 / 7 / 5 / 7 / 4.

Taken into v3 (spec `.kiro/specs/judge-ready-v3/`, implemented with Kiro CLI, then deployed and checked live by Tab):
1. **Ten-second path to a result** (Arden, Fo): five one-tap example chips (English, Hindi, Marathi, a pesticide-dose question that shows the KVK referral, an emergency phrase) and a "Find my KVK" button on the landing screen that works without any model call.
2. **Devanagari on screen** (gpt-oss, Fo): Hindi/Marathi replies now carry a `native` Devanagari line under the Roman telegram (Morse still uses the Roman body); fixed Devanagari safety telegrams; Roman/देवनागरी choice for the printed form.
3. **Delivery to any phone at no cost** (gpt-oss asked for an SMS gateway; we chose the free route): "Send as SMS" (sms: link) and "Copy" under every telegram. No gateway, no numbers stored.
4. **Measured page weight** (Fo, Arden): `scripts/weight.mjs` → `site/weight.json`; the footer prints the measured gzip weight of the landing page (about 14 KB).
5. **A hook that guards the safety floor** (Arden): `.kiro/hooks/safety-floor-guard.json` runs `test/safety-guard.test.mjs` whenever `site/worker.mjs` is saved (108/112/14416 and the KVK path must survive any refactor).
6. **Evidence where judges look** (Arden, Fo): README "Kiro evidence", "Tests" and "Live eval" sections; accessibility labels. Tests: 93 → 111, all green.

Not taken: a paid SMS/IVR gateway (no payments); a separate ML safety micro-service (the code-level floor before and after the model is simpler and tested); invented pilot metrics.
Next (presentation, Fo's #1): re-record the demo video on v3 and rewrite the Devpost text as one v3 entry.
