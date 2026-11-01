# Feedback for the Otari team

Built by Tab, an AI assistant, for team lead Akshay Wagh. Written from building Krishi Telegram's `otari` branch on hosted otari.ai, 1 Nov 2026, with a US$2 starting credit. Everything below is something we hit, not something we read about.

## When were you most tempted to skip Otari?

1. **Field maths with code execution.** The sandbox ran (the right answer came back, and the usage row showed a tool fee), but the Chat Completions response carried no trace of it: `tool_calls` was empty and there is no `otari_tool_calls` entry for code execution. Your docs say this is by design ("Code execution and MCP calls are not reported there"). For an app that wants to show a farmer *how* a number was worked out, that left us displaying the model's own copy of the code, which is exactly the self-report we wanted to avoid. We were close to doing the arithmetic in plain JavaScript instead.
2. **The price of that call.** One code-execution request cost about US$0.0102 against about US$0.00009 of tokens (request `b6b340c3-d179-480f-9b55-bd93534c4888`): the tool fee was more than 100 times the model cost. With a US$2 credit that is a budget decision, not a footnote. Showing the per-tool rate next to the tool in the Playground would have saved us a surprise.
3. **Our own self-hosted model.** Adding a llama.cpp box (CPU, about 5 tokens a second) as a provider endpoint worked, and Otari fell over to Qwen3-235B in the same request when the small model could not take a long input. But the box sleeps when idle, and a routing policy cannot know that in advance, so we kept a separate health check in the app to tell the farmer whether the private route is awake.

## What did you build yourself that Otari should have done?

- **A receipt for the user.** We read `Otari-Provider`, `Otari-Model`, `Otari-Fallback`, `Otari-Attempt-Count`, `Otari-Guardrails` and the usage cost on every response and render them as a per-request table. The headers are excellent; a documented "receipt" object in the response body (one entry per attempt, with the policy step that chose it) would let every app show this without parsing headers.
- **Skipping a target that is known to be down.** A short-lived "this target failed N times in the last minute, skip it" memory in the routing policy, so a sleeping self-hosted endpoint does not cost every request its timeout.
- **Turning end-user usage into a number the user can read.** `GET /api/v1/end-users/{id}` with the service key gives us a farmer's requests and spend so far, and we show "N of 40 gateway calls used today". But the budget's limits are not in that response (we hard-code 40 requests and US$0.05 from the budget we created), so the app and the dashboard can drift apart. Returning the budget's limits, or a `remaining` figure, with the end user would close that.
- **Budget-aware tier-down with small ceilings.** The `budget_used_pct >= 80` rule worked (Qwen3-235B → Gemma 3 27B once 80% was used). But with a tiny ceiling the request was refused at 25% spend, because the hold for one request is priced at its full `max_tokens`. That is documented in access control, but the routing docs' tier-down example does not mention it, so it reads as if the cheaper model will always catch the tail of the budget. We pair it with a lower `max_tokens` now.

What we deleted because Otari did it: our hand-written Groq → Gemini fallback chain, per-language model picking, and the provider keys in the app. The guardrail contract was the nicest surprise: our existing safety floor became an organisation guardrail in block mode with one small endpoint, so a request that skips the app's own check is still refused at the gateway.

## Would you keep using it without the rule?

Yes, for this app, with one condition. Routing policies, per-user budgets, the guardrail hook and MCP by server id replaced code we would otherwise maintain, and one key instead of five is a real security gain for a public demo. The condition is cost visibility for gateway-run tools: we would keep web search and MCP through Otari, and move code execution back into the app unless its result is returned and its price is shown up front.
