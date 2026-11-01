// Call the worker locally against the real Otari gateway.
// usage: OTARI_KEY=... node scripts/local-call.mjs /api/telegram '{"text":"...","lang":"hi"}'
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import worker from '../site/worker.mjs';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const env = { OTARI_KEY: process.env.OTARI_KEY, KVK_MCP_ID: process.env.KVK_MCP_ID, MCP_TOKEN: process.env.MCP_TOKEN, GUARD_TOKEN: process.env.GUARD_TOKEN,
  ASSETS: { fetch: async (req) => { const p = new URL(req.url).pathname; try { return new Response(fs.readFileSync(path.join(root, p))); } catch { return new Response('nf', { status: 404 }); } } } };
const [route, body] = [process.argv[2], process.argv[3]];
const t0 = Date.now();
const res = await worker.fetch(new Request('https://local' + route, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body }), env);
const txt = await res.text();
console.log(res.status, ((Date.now() - t0) / 1000).toFixed(1) + 's'); console.log(txt);
