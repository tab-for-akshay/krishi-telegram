# Otari edition: review rounds (v1 → v2 → v3)

Built by Tab, an AI assistant, for team lead Akshay Wagh. Standing rule: v1 → two outside critics → v2 → two critics → v3; only v3 is final.
Critic 1 is **Fo** (Wajo's agent; it opened the live site and the repo itself). Critic 2 is **Arden** (a Skydive agent). Both got the same brief: the judging rubric, the live URL, the repo and branch, and "score it strictly, top 8 changes by score impact". Full texts are kept beside the entry's working files.

## Round 1 (1 Nov 2026, ~20:40Z) on v1.1 (commit 727e146)

Scores: **Fo 84/100**, **Arden ~85/100**. Both gave the video 0/5 and both called it the biggest single gain.

What they agreed on, and what v2 did:

| Critique | v2 change |
|---|---|
| Features are claimed in prose, not verifiable (both) | `/proof.html`: one button per rubric feature that runs it live and prints Otari's own response headers (`Otari-Provider`, `Otari-Model`, `Otari-Fallback`, `Otari-Attempt-Count`, `Otari-Guardrails`, `Otari-End-User-Budget`, `Otari-Error-Code`). `evidence/README.md` lists one real request id per feature. |
| Fallback never shown working (Arden) | The private route is a real Otari policy (`krishi-private`: self-hosted 9B → Qwen3-235B → Gemma 3 27B). A long field diary that overflows the small model's context makes Otari fall over in the same request (`Otari-Fallback: true`, attempt 2). |
| Per-user budget invisible (both) | A second service key with a 1-request-per-farmer-per-day end-user budget; the proof page sends the same farmer twice and shows `200` then `403 budget_exceeded` with `Otari-Budget-Scope: user`. The farmer id is kept per device in the browser, and the main page now shows that farmer's daily allowance read live from Otari's end-user record (`GET /api/v1/end-users/{id}`): "N of 40 gateway calls used today". |
| Dashboard settings taken on faith (Fo) | `otari-config/`: routing policies, budgets, spend ceiling, guardrail and MCP server exported as JSON from the dashboard, with screenshots. |
| README on the branch still describes the pre-Otari app (both) | README rewritten for the branch: features table, exported config, setup, first-Otari commit. Kiroween notes moved to `docs/kiroween/`. |
| Code execution shows only the model's own copy of the code (Fo) | The receipt now shows Otari's gateway tool fee for the call (the sandbox really ran). Otari's Chat Completions response does not carry code-execution calls (its docs say so: "Code execution and MCP calls are not reported there"), so the code shown is labelled as the model's own copy. Raised as feedback. |
| One policy served two roles (Fo) | KVK lookup has its own policy, `krishi-locate` (Mistral Small 3.2 24B → Qwen3-235B), so the MCP call has its own receipt row and model. |
| MCP lookup fired on almost any capital word (Fo) | `looksLikePlace` now needs a place word (district, taluka, village, near, gav, in, at…) followed by a capitalised name; unit-tested. |
| Red-team | Hindi/Marathi Devanagari self-harm and dose phrasing added to the safety floor (from the `main` red-team pass), 117 tests. |

Not taken, and why:
- **Video.** The rules require the participant's own screen recording and voice, with no AI. This entry is built by an AI assistant; we do not fake a recording. The proof page is the demonstration.
- **Swap the abliterated private model.** Akshay asked for one self-hosted uncensored model in this entry. It never answers alone: the code floor, the Otari block-mode guardrail and the Qwen3Guard judge wrap it exactly as they wrap the hosted models. The README says so plainly.
- **Eligibility flag (Fo).** The disclosure line is on every artefact so the organisers can judge it.

## Round 2 (1 Nov 2026, ~21:16Z) on v2.1 (commit 86f3e0e)

Same brief, plus: "there is deliberately no video; score that line 0". Scores: **Fo 95/100**, **Arden ~93/100** (feature points already past the 60 cap). Both named the same weakest line: budgets were proven only by a recorded run on a deleted temporary key.

| Critique | v3 change |
|---|---|
| Budget tier-down not live (both; Fo's "single thing") | New proof button `f=budget_tierdown`: a new farmer on a US$0.0025 end-user budget sends a long diary through the real `krishi-diagnose` policy (Qwen3-235B, ~83% used), then a short question on the same policy, which Otari routes to Gemma 3 27B by `budget_used_pct >= 80`. Spend after each call is read back from Otari. About US$0.002 a run, capped per server instance. |
| Code execution is the model's word (both) | The model now also returns each calculation as one arithmetic expression with the value its code printed; the app re-computes it with its own safe evaluator and shows "sandbox printed X, app re-computed X (matches)". The Otari tool fee shows the sandbox ran. |
| Guardrail evidence label "self_harm" on a poisoning test (Fo) | Guardrail now answers `poisoning_or_self_harm_emergency` or `pesticide_dose`; proof page also sends a Hindi poisoning message and a Marathi dose question. Evidence updated with the new request ids. |
| Allowance hard-codes limits, reports a new farmer as known (Arden) | A farmer with no Otari record yet is shown as such; limits are labelled as coming from the `farmer-daily` budget export, because a service key cannot read budget limits. Raised in feedback. |
| MCP call can silently not happen (Arden) | The locate receipt row now says whether a KVK came back from `find_kvk`, and says plainly that Otari does not report MCP calls on Chat Completions. |
| Export shows `guardrails: []` on every policy (Arden) | `otari-config/README.md` explains the guardrail is organisation-level; `service-keys.json` added. |
| Judge path (both) | README opens with "Judge's 60 seconds": one curl per feature against the live proof API, and a rubric → check → config table. |

Not taken: a deliberately dead provider in a policy (Arden): the routing check already shows a real refusal falling over inside one request, and a fake dead target would be staged. Fetching the top search result's page (Fo): web search already scores; kept the cost down.

## v3

v3 is the version above, live at https://krishi-telegram-otari.vercel.app. 118 tests.
