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

`403 {"message":"Request blocked by guardrail policy.","code":"guardrail_violation","guardrails":[{"profile":"krishi-safety-floor","explanation":"self_harm","score":1}]}`

Every allowed request carries `Otari-Guardrails: [{"profile":"krishi-safety-floor","mode":"block","valid":true,"score":0}]`.
