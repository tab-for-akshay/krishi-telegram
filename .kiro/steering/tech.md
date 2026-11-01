# Tech Stack

## Runtime
- **Cloudflare Workers** (ES modules, `site/worker.mjs`) — handles static asset serving via `env.ASSETS` and the `/api/telegram` POST endpoint
- **Wrangler** — local dev (`wrangler dev`) and deployment

## Frontend
- Vanilla HTML5 / CSS3 / ES2022 — no framework, no bundler
- **Web Audio API** — Morse code audio generation in-browser (no audio files)
- Responsive at 390 px (iPhone SE baseline)

## AI
- **Groq OpenAI-compatible API** (`https://api.groq.com/openai/v1/chat/completions`)
- Primary model: `openai/gpt-oss-120b`
- Fallback model: `openai/gpt-oss-20b`
- JSON mode enforced (`response_format: { type: "json_object" }`)
- API key from `env.GROQ_API_KEY`

## Testing
- Node built-in test runner (`node --test`, Node ≥ 18)
- Test files in `test/` directory
- No external test libraries

## Configuration
- `wrangler.toml` for Cloudflare deployment settings
- `package.json` for scripts and Node version declaration

## Key Constraints
- No npm dependencies in production code (Cloudflare Worker is self-contained)
- No git operations
- No files outside project directory
- Morse encoding done entirely in application code, not by the AI model
