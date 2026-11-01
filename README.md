# Krishi Telegram: Otari edition (branch `otari`)

Built by Tab, an AI assistant, for team lead Akshay Wagh.

Entry for the Mozilla Otari hackathon **"Developers Wilding: Online"** (DoraHacks): finish a side project using [Otari](https://otari.ai) as the hosted AI gateway.

- **Live:** https://krishi-telegram-otari.vercel.app (mirror: https://krishi-telegram-otari.sites.tab.bot)
- **Proof page** (runs each Otari feature live, with Otari's own response headers): https://krishi-telegram-otari.vercel.app/proof.html
- **Branch:** `otari`. The `main` branch is the earlier Kiro-built version (Kiroween 2026) and is left as it was.
- **First commit where Otari came in:** https://github.com/tab-for-akshay/krishi-telegram/commit/c6b828fcf38022f4995b63b7b7f9814ceb07e4ab
- **Otari configuration, exported from the dashboard:** [`otari-config/`](otari-config/) (routing policies, budgets, spend ceiling, guardrail, MCP server, plus screenshots)
- **Evidence of each feature working, with Otari request ids:** [`evidence/README.md`](evidence/README.md)
- **Review rounds:** [`OTARI_ROUNDS.md`](OTARI_ROUNDS.md) · **Feedback for the Otari team:** [`OTARI_FEEDBACK.md`](OTARI_FEEDBACK.md)

## What it does

A farmer in India types a crop problem in English, Hindi or Marathi. They get back a telegram: at most 20 words, in their language written in Roman letters, with Morse audio, plus the address of their local ICAR Krishi Vigyan Kendra (KVK, the government farm science centre). Two extra buttons: **Find a source** (what an Indian extension page says) and **Field maths telegram** (area, plant counts, drip time, worked out by real code).

Under every telegram is a **gateway receipt**: each Otari call, the policy that was asked, the model that answered, whether a fallback happened, the guardrail verdict, the time and the cost.

Why a telegram: India closed its public telegram service in 2013. Short, urgent, trusted messages are still what a farmer on a weak 2G connection needs. The page is one small HTML file with no framework.

## Before and after Otari

Before (`main`): the worker called Groq and Gemini directly with provider keys, and carried a hand-written fallback chain, per-language model choice and a safety floor that only lived in the app.

After (`otari`): there is no provider SDK and no provider key in the app. The server holds one Otari service key. Fallbacks, budgets, per-farmer limits, web search, code execution, the MCP lookup and the guardrail are Otari features the app calls. The hand-written fallback chain is gone.

## Every model call goes through Otari (features used)

There is no provider SDK and no provider key in this app. The server (`site/worker.mjs`) holds one Otari service key and sends every request to Otari's OpenAI-compatible endpoint. All models are open-weight.

| Otari feature | Where it is used in the app | Code |
|---|---|---|
| Model routing and fallbacks | Seven named policies the app calls as model names. `krishi-diagnose`: Qwen3-235B-A22B-Instruct, falls back to Llama 3.3 70B, then Gemma 3 27B. `krishi-telegraph`: Gemma 3 27B, then Gemma 3 12B, then Llama 3.3. `krishi-judge`: Qwen3Guard-Gen-8B, then Llama Guard 4. `krishi-locate`: Mistral Small 3.2 24B, then Qwen3-235B. `krishi-research`: Qwen3-235B, then Qwen3.5-35B. `krishi-calc`: Qwen3.5-35B-A3B, then Llama 3.3 70B. `krishi-private`: Tab's self-hosted 9B, then Qwen3-235B, then Gemma 3 27B. The receipt shows `Otari-Fallback` when it happens. | `POLICY`, `otari()` |
| Multiple models in distinct roles | Diagnose (Qwen3-235B), write the Hindi/Marathi telegram (Gemma 3 27B), judge safety (Qwen3Guard), web search (Qwen3-235B), the KVK lookup over MCP (Mistral Small 3.2 24B), code-execution maths (Qwen3.5-35B-A3B), private route (Huihui Qwythos 9B). | `runDiagnose`, `runTelegraph`, `runJudge` |
| MCP integration | Our own MCP server (`/mcp`, tool `find_kvk` over 708 ICAR KVKs) is registered in the Otari workspace. When a farmer names a town and no district was picked, the model calls `find_kvk` through Otari (`mcp_server_ids`). The app then re-checks the answer against its own list, so a KVK is never invented. | `handleMcp`, `runLocate` |
| Web search | "Find a source" runs one Otari web search. The app shows only links that came back in `otari_tool_calls` (never links written by the model), Indian extension sites (ICAR, state universities, `.gov.in`) first. | `handleSource`, `pickSources` |
| Code execution | "Field maths telegram": the model must compute every number with `otari_code_execution`; the code is shown to the farmer. | `handleCalc` |
| Budgets and spending limits | A monthly US$1 ceiling on the app's service key; the diagnose policy drops to the cheaper Gemma model when 80% of the budget is used (`budget_used_pct`). | policy `krishi-diagnose` |
| Per-user budgets | Each farmer gets a daily allowance (Otari end-user budget on the service key; US$0.05 and 40 requests a day). The farmer id is a random id in the browser, hashed before it is sent as `user`. When Otari refuses, the farmer gets a plain telegram pointing to the Kisan Call Centre. | `farmerUser`, `refusalTelegram` |
| Guardrails | Our safety floor (poisoning / self-harm and pesticide-dose rules, in English, Hindi and Marathi) is served at `/guard/validate` in Otari's guardrail contract and registered as an **organisation guardrail in block mode**, so Otari refuses those requests before any model sees them. The same rules also run in code before and after the models. The receipt shows the guardrail verdict Otari returns. | `handleGuard`, `safetyFloor` |
| Bring your own model | "Private route": Tab's self-hosted open model (Huihui Qwythos 9B abliterated, llama.cpp on a CPU box) is added to Otari as a provider key, with zero pricing, and called through Otari like any other model. If it is asleep or slow, the request falls back to the normal policy. | `runDiagnose` |


## Otari configuration (exported)

Everything the app relies on in the Otari dashboard is exported as JSON in [`otari-config/`](otari-config/), so a judge does not have to take the dashboard on faith:

| File | What it is |
|---|---|
| `routing-policies.json` | The 7 `krishi-*` policies: targets, `on_failure` fallbacks, and the `budget_used_pct >= 80` tier-down on `krishi-diagnose` |
| `budgets.json` | `krishi-app-monthly` (US$1/month), `farmer-daily` (US$0.05 and 40 requests per farmer per day), `farmer-demo-capped` (1 request per farmer per day, used on the proof page) |
| `spend-ceilings.json` | The US$1 monthly ceiling on the app's service key, with its spend at export time |
| `guardrails.json` | `krishi-safety-floor`: our `/guard` service registered as an organisation guardrail in **block** mode |
| `mcp-servers.json` | `kvk-directory`: our `/mcp` server with its one allowed tool `find_kvk`, health "healthy" |
| `screens/*.png` | Dashboard screenshots of the same settings |

Ids in these files are Otari object ids, not secrets. No key or token is in the repository.

## Safety

- Words about drinking poison never reach a model: a code floor answers with 108, 112 and Tele-MANAS 14416, in English, Hindi and Marathi (Devanagari or Roman).
- The app never gives a pesticide name or dose; it sends the farmer to their KVK by name.
- The same floor is registered in Otari as a block-mode guardrail, so a request that skips the app's own check is still refused by the gateway.
- A safety-classifier model (Qwen3Guard, falling back to Llama Guard 4) judges every piece of advice before it is shown.
- The private route uses an abliterated (safety-tuning-removed) open model on purpose: Akshay asked for one self-hosted, uncensored model in this entry. It never answers alone: the code floor, the Otari guardrail and the Qwen3Guard judge sit around it exactly as they sit around the hosted models. [`REDTEAM.md`](REDTEAM.md) has 17 jailbreak and prompt-injection attacks and their results.

## Run it yourself

```
node --test     # 117 tests, no network (safety floor, red-team cases, Otari helpers, MCP server, Morse, pricing)
```

To call the live gateway from your machine:

```
OTARI_KEY=otk_... KVK_MCP_ID=<your MCP server id> node scripts/local-call.mjs /api/telegram '{"text":"Tomato leaves curling, white flies","lang":"hi"}'
```

To run your own copy: create the policies, budgets, guardrail and MCP server from `otari-config/` in your Otari workspace, then deploy `site/` as one Cloudflare-style worker (`site/worker.mjs`, static files in `site/`) or on Vercel. Secrets come from the environment: `OTARI_KEY` (service key), `DEMO_KEY` (the capped demo key for the proof page), `MCP_TOKEN` and `GUARD_TOKEN` (shared secrets Otari sends to our MCP and guardrail endpoints), `KVK_MCP_ID` (the MCP server's id in your workspace).

## No demo video

The hackathon rules ask for a screen recording with the participant's own voice and no AI. This entry was built by an AI assistant, so we have not made a video rather than fake one. The proof page is the live demonstration instead.

## Earlier history

The Kiroween 2026 version (Kiro specs, steering and hooks in `.kiro/`) is on `main`. Its submission notes are kept in [`docs/kiroween/`](docs/kiroween/).

MIT licence. Built by Tab, an AI assistant, for team lead Akshay Wagh.
