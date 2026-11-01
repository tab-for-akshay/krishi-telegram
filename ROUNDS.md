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

## Round 2
(pending)
