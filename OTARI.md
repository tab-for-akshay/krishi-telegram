# Krishi Telegram: Otari edition

Built by Tab, an AI assistant, for team lead Akshay Wagh. Entry for the Mozilla Otari hackathon "Developers Wilding: Online".

Live: https://krishi-telegram-otari.vercel.app (mirror: https://krishi-telegram-otari.sites.tab.bot)
Branch: `otari` (the `main` branch is the earlier Kiro-built version and is left untouched).
First commit where Otari came in: https://github.com/tab-for-akshay/krishi-telegram/commit/c6b828fcf38022f4995b63b7b7f9814ceb07e4ab

## What it does

A farmer in India types a crop problem in English, Hindi or Marathi. They get back a telegram: at most 20 words, in their language written in Roman letters, with Morse audio, plus the address of their local ICAR Krishi Vigyan Kendra (KVK, the government farm science centre). Two extra buttons: **Find a source** (what an Indian extension page says) and **Field maths telegram** (area, plant counts, drip time, worked out by real code).

Under every telegram is a **gateway receipt**: each Otari call, the policy that was asked, the model that answered, whether a fallback happened, the time and the cost.

## Every model call goes through Otari

There is no provider SDK and no provider key in this app. The server (`site/worker.mjs`) holds one Otari service key and sends every request to Otari's OpenAI-compatible endpoint. All models are open-weight.

| Otari feature | Where it is used in the app | Code |
|---|---|---|
| Model routing and fallbacks | Four named policies the app calls as model names. `krishi-diagnose`: Qwen3-235B-A22B-Instruct, falls back to Llama 3.3 70B, then Gemma 3 27B. `krishi-telegraph`: Gemma 3 27B, then Gemma 3 12B, then Llama 3.3. `krishi-judge`: Qwen3Guard-Gen-8B, then Llama Guard 4. `krishi-research` / `krishi-calc`. The receipt shows `Otari-Fallback` when it happens. | `POLICY`, `otari()` |
| Multiple models in distinct roles | Diagnose (Qwen3-235B), write the Hindi/Marathi telegram (Gemma 3 27B), judge safety (Qwen3Guard), tool use for search/MCP (Qwen3-235B), code-execution maths (Qwen3.5-35B-A3B), private route (Huihui Qwythos 9B). | `runDiagnose`, `runTelegraph`, `runJudge` |
| MCP integration | Our own MCP server (`/mcp`, tool `find_kvk` over 708 ICAR KVKs) is registered in the Otari workspace. When a farmer names a town and no district was picked, the model calls `find_kvk` through Otari (`mcp_server_ids`). The app then re-checks the answer against its own list, so a KVK is never invented. | `handleMcp`, `runLocate` |
| Web search | "Find a source" runs one Otari web search. The app shows only links that came back in `otari_tool_calls` (never links written by the model), Indian extension sites (ICAR, state universities, `.gov.in`) first. | `handleSource`, `pickSources` |
| Code execution | "Field maths telegram": the model must compute every number with `otari_code_execution`; the code is shown to the farmer. | `handleCalc` |
| Budgets and spending limits | A monthly US$1 ceiling on the app's service key; the diagnose policy drops to the cheaper Gemma model when 80% of the budget is used (`budget_used_pct`). | policy `krishi-diagnose` |
| Per-user budgets | Each farmer gets a daily allowance (Otari end-user budget on the service key; US$0.05 and 40 requests a day). The farmer id is a random id in the browser, hashed before it is sent as `user`. When Otari refuses, the farmer gets a plain telegram pointing to the Kisan Call Centre. | `farmerUser`, `refusalTelegram` |
| Guardrails | Our safety floor (poisoning / self-harm and pesticide-dose rules, in English, Hindi and Marathi) is served at `/guard/validate` in Otari's guardrail contract and registered as an **organisation guardrail in block mode**, so Otari refuses those requests before any model sees them. The same rules also run in code before and after the models. The receipt shows the guardrail verdict Otari returns. | `handleGuard`, `safetyFloor` |
| Bring your own model | "Private route": Tab's self-hosted open model (Huihui Qwythos 9B abliterated, llama.cpp on a CPU box) is added to Otari as a provider key, with zero pricing, and called through Otari like any other model. If it is asleep or slow, the request falls back to the normal policy. | `runDiagnose` |

## Safety

- Words about drinking poison never reach a model: the code floor answers with 108, 112 and Tele-MANAS 14416.
- The app never gives a pesticide name or dose; it sends the farmer to their KVK by name.
- A safety-classifier model (Qwen3Guard) judges every piece of advice before it is shown.

## Run it yourself

```
node --test                      # 100+ tests, no network
OTARI_KEY=... KVK_MCP_ID=... node scripts/local-call.mjs /api/telegram '{"text":"Tomato leaves curling, white flies","lang":"hi"}'
```

Secrets (`OTARI_KEY`, `MCP_TOKEN`, `GUARD_TOKEN`, `KVK_MCP_ID`) come from the environment or are injected at publish time; none are in the repository.

## Feedback for Otari

See `OTARI_FEEDBACK.md`.

## No demo video

The rules ask for a screen recording with the participant's own voice and no AI. This entry was built by an AI assistant, so we have not made a video rather than fake one.
