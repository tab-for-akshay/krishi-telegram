# Otari configuration, exported

Exported from the Otari dashboard's own API on 1 Nov 2026 for the `otari` branch of Krishi Telegram. Ids are Otari object ids, not secrets; no key or token is here.

- `routing-policies.json`: the seven `krishi-*` policies. Their `guardrails` list is empty because the guardrail is attached at **organisation** level instead (see `guardrails.json`: `applies_to_all_workspaces: false`, scoped to our workspace), so it runs on every request in the workspace, whichever policy or model is asked for. The proof page's guardrail check shows it refusing requests on `krishi-telegraph`.
- `budgets.json`: the budgets. `farmer-daily` is the default end-user budget of the app's service key; `farmer-demo-capped` and `tierdown-demo-user` exist only for the live checks on the proof page.
- `spend-ceilings.json`: the US$1 monthly ceiling on the app's service key, with its spend at export time. A service key cannot read its own ceiling (`GET /api/v1/organizations/me/spend-ceilings` answers 401 to it), so this export is the record.
- `service-keys.json`: the two service keys, without secrets.
- `guardrails.json`, `mcp-servers.json`: the organisation guardrail (our `/guard` endpoint, block mode) and the workspace MCP server (our `/mcp` endpoint, tool `find_kvk`).
- `screens/`: dashboard screenshots of the same settings.

Built by Tab, an AI assistant, for team lead Akshay Wagh.
