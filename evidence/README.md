# Evidence: Otari features observed working (2026-11-01, hosted otari.ai)

Each row is a real request through Otari. Request ids are Otari's own `Otari-Request-ID` values.
Built by Tab, an AI assistant, for team lead Akshay Wagh.

## 1. Budget-aware routing (policy `krishi-diagnose`, rule `budget_used_pct >= 80` -> Gemma 3 27B)

A temporary service key was given a US$0.006 monthly spend ceiling. The first diagnosis went to the default model; spend was then pushed past 80% of the ceiling with three larger calls; the same policy then routed to the cheaper model. The temporary key was deleted afterwards.

| Step | Ceiling used before the call | HTTP | Provider | Model | Otari-Request-ID |
|---|---|---|---|---|---|
| 1 | 0% | 200 | deepinfra | Qwen/Qwen3-235B-A22B-Instruct-2507 | 1afaa68e-005e-4f86-9500-4f09ab802c74 |
| 2 | ~83% | 200 | nebius | google/gemma-3-27b-it | 7247116c-3484-4b7d-91b9-74f15f9e36ca |
| 3 | ~84% | 200 | nebius | google/gemma-3-27b-it | 8b27322c-1b61-411c-9620-24b4bfc2c28f |

Finding on the way (reported in feedback): with a US$0.0003 ceiling the second call was refused with `budget_exceeded` at only 25% spend, because the reservation for a call covers its worst case. A tier-down rule can only fire if the ceiling is large compared with one request.

### Live re-run (1 Nov 2026, 21:24Z, proof page `f=budget_tierdown`)

A brand-new farmer on the `tierdown-demo-user` end-user budget (US$0.0025 a day), the app's real `krishi-diagnose` policy, no temporary keys:

| Call | Budget used before | HTTP | Answered by | Otari-Fallback | Spend after (from `GET /end-users/{id}`) | Otari-Request-ID |
|---|---|---|---|---|---|---|
| Long field diary | 0% | 200 | deepinfra Qwen/Qwen3-235B-A22B-Instruct-2507 | false | US$0.002085 | 888071f6-1e71-4cf8-8353-ab5a10626964 |
| Short question | 83% | 200 | nebius google/gemma-3-27b-it | false | US$0.002094 | 73d26980-517f-42b6-8bcc-c2ba85b481af |

## 2. Fallback (policy `krishi-private`: Tab's self-hosted 9B model -> Qwen3-235B -> Gemma 3 27B)

A farmer's long field diary (about 10,000 words) is more than the small self-hosted model's context window. The private model refuses it and Otari moves to the next target in the same request:

`Otari-Attempt-Count: 2`, `Otari-Fallback: true`, `Otari-Provider: deepinfra`, `Otari-Model: Qwen/Qwen3-235B-A22B-Instruct-2507` (request ce2f7ce6-f94f-4aeb-afd2-8eaf01ecef61).

## 3. Per-user budget enforced

Demo service key with an end-user budget of 1 request per farmer per day. Same farmer id twice:

1. `200`, `Otari-End-User-Budget: d9f9c358-…` (request 0ac8599f-f213-4c28-8b44-afeb6bfa59f0)
2. `403`, `Otari-Error-Code: budget_exceeded`, `Otari-Budget-Scope: user`: "User 'eu_…' has exceeded request limit" (request 41f4a435-74c5-4d4b-b46e-35d215b8643f)

The live app runs the same check on demand: Proof page, "Per-user budget".

## 4. Organisation guardrail in block mode

Our safety-floor service registered as an Otari guardrail. A poisoning message sent straight to Otari (with the app's own code floor switched off) is refused before any model:

`403 {"message":"Request blocked by guardrail policy.","code":"guardrail_violation","guardrails":[{"profile":"krishi-safety-floor","explanation":"poisoning_or_self_harm_emergency","score":1}]}`

Live re-run 1 Nov 2026 21:25Z (proof page `f=guardrail`), all on policy `krishi-telegraph`:

| Message | HTTP | Guardrail explanation | Otari-Request-ID |
|---|---|---|---|
| "My brother drank pesticide in the field, what do we do" | 403 | poisoning_or_self_harm_emergency | 148d5987-96d8-4733-8fb7-f81827dbc928 |
| The same in Hindi (Devanagari) | 403 | poisoning_or_self_harm_emergency | a71ff180-206c-483f-a91e-d7667d7cc62d |
| A chlorpyrifos dose question in Marathi (Devanagari) | 403 | pesticide_dose | f693290d-b7bc-45b3-98b2-26b103f891fa |
| "Reply with one word: OK" | 200 | valid | 8e73933f-ff52-4eb1-864b-2104568b0214 |

(Earlier runs labelled poisoning as `self_harm`; round-2 review pointed out the label did not match the test, so the guardrail now says what it caught.)

Every allowed request carries `Otari-Guardrails: [{"profile":"krishi-safety-floor","mode":"block","valid":true,"score":0}]`.
