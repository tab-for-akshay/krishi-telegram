# Project Structure

```
krishi-telegram/
├── .kiro/
│   ├── steering/
│   │   ├── product.md        # Vision, problem, users, pillars
│   │   ├── tech.md           # Stack, runtime, constraints
│   │   └── structure.md      # This file — directory layout
│   ├── specs/
│   │   └── last-telegram/
│   │       ├── requirements.md   # EARS-format requirements
│   │       ├── design.md         # Architecture and component design
│   │       └── tasks.md          # Checkbox implementation tasks
│   └── hooks/
│       └── test-on-save.json     # Agent hook: run tests on site/ save
│
├── site/
│   ├── index.html            # Single-page UI — telegram form + output
│   ├── styles.css            # Sepia/ghostly/vintage telegraph styling
│   ├── app.js                # Frontend: fetch, Morse audio, print
│   └── worker.mjs            # Cloudflare Worker: API + static assets
│
├── test/
│   ├── morse.test.mjs        # Morse encoder unit tests
│   ├── pricing.test.mjs      # Word counter and cost calculation tests
│   ├── safety.test.mjs       # Safety floor trigger tests
│   └── disclosure.test.mjs   # Presence of disclosure line tests
│
├── wrangler.toml             # Cloudflare Workers config
├── package.json              # Scripts and Node engine declaration
├── README.md                 # Project overview, run instructions, Kiro workflow
└── LICENSE                   # MIT licence
```

## Naming Conventions
- All source files: lowercase with hyphens
- Worker exports `default` with `fetch` handler (ES modules)
- Test files: `*.test.mjs`
- CSS custom properties prefixed `--kt-` (Krishi Telegram)
