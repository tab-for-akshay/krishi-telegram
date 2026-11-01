import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { safetyFloor, pickSources, kvkSearch, MCP_TOOLS, parseJsonLoose, cleanTelegram, looksEnglish, sumCost, farmerUser, looksLikePlace } from '../site/worker.mjs';
import fs from 'node:fs';

const kvk = JSON.parse(fs.readFileSync(new URL('../site/data/kvk.json', import.meta.url)));
const env = { ASSETS: { fetch: async () => new Response(JSON.stringify(kvk)) } };
const post = (path, body, headers = {}) => worker.fetch(new Request('https://x' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }), env);

test('dose floor: drip flow "litre per hour" is not a pesticide dose', () => {
  assert.equal(safetyFloor('2 litre per hour drippers').blocked, false);
  assert.equal(safetyFloor('spray 2 litre per acre').blocked, true);
  assert.equal(safetyFloor('5 ml per litre of water').blocked, true);
});

test('MCP: initialize, tools/list and find_kvk over JSON-RPC', async () => {
  let r = await post('/mcp', { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } });
  assert.equal((await r.json()).result.serverInfo.name, 'kvk-directory');
  r = await post('/mcp', { jsonrpc: '2.0', id: 2, method: 'tools/list' });
  assert.equal((await r.json()).result.tools[0].name, 'find_kvk');
  r = await post('/mcp', { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'find_kvk', arguments: { state: 'Maharashtra', district: 'Pune', place: 'Baramati' } } });
  const hits = JSON.parse((await r.json()).result.content[0].text);
  assert.ok(hits.length >= 1 && hits[0].district === 'Pune');
  r = await post('/mcp', { jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal(r.status, 202);
  r = await post('/mcp', { jsonrpc: '2.0', id: 4, method: 'nope' });
  assert.equal((await r.json()).error.code, -32601);
});

test('kvkSearch: place puts the KVK located there first', () => {
  const hits = kvkSearch(kvk, 'Maharashtra', 'Pune', 'Baramati');
  if (hits.some(h => /baramati/i.test(h.kvk + h.host))) assert.match(hits[0].kvk + hits[0].host, /baramati/i);
  assert.deepEqual(kvkSearch(kvk, 'Maharashtra', ''), []);
  assert.ok(MCP_TOOLS[0].inputSchema.required.includes('district'));
});

test('guardrail endpoint speaks the Otari guardrail contract', async () => {
  let r = await post('/guard/validate', { profile: 'krishi-safety-floor', input_text: 'my brother drank pesticide' });
  let j = await r.json();
  assert.equal(j.result.valid, false); assert.equal(j.result.explanation, 'self_harm');
  r = await post('/guard/validate', { input_text: 'tomato leaves curling' });
  j = await r.json();
  assert.equal(j.result.valid, true);
});

test('emergency text never reaches a model (code floor first)', async () => {
  const r = await post('/api/telegram', { text: 'I drank pesticide', lang: 'hi' });
  const j = await r.json();
  assert.match(j.telegram, /108/); assert.equal(j.stopped_by, 'code floor'); assert.deepEqual(j.trace, []);
});

test('pickSources keeps only search results and ranks Indian extension sites first', () => {
  const s = pickSources([{ type: 'web_search', status: 'completed', sources: [
    { url: 'https://example.com/a', title: 'blog' }, { url: 'https://icar.org.in/en/node/5177', title: 'ICAR' }, { url: 'https://icar.org.in/en/node/5177', title: 'dup' }, { url: 'https://agri.maharashtra.gov.in/x', title: 'gov' }] }]);
  assert.deepEqual(s.trusted.map(x => x.title), ['ICAR', 'gov']);
  assert.deepEqual(s.other.map(x => x.title), ['blog']);
  assert.deepEqual(pickSources([{ type: 'web_search', status: 'failed' }]), { trusted: [], other: [] });
});

test('helpers: loose JSON, telegram cleaning, English detection, cost sum, hashed farmer id', async () => {
  assert.deepEqual(parseJsonLoose('```json\n{"a":1}\n```'), { a: 1 });
  assert.equal(parseJsonLoose('nope'), null);
  assert.ok(!/[^A-Z0-9 \-]/.test(cleanTelegram('Rice blast. Remove plants!')));
  assert.equal(looksEnglish('REMOVE INFECTED PLANTS STOP USE TRAPS'), true);
  assert.equal(looksEnglish('SANKRAMIT PAUDHE HATAYEN STOP'), false);
  assert.equal(sumCost([{ cost_usd: 0.001 }, null, { cost_usd: '0.0002' }]), 0.0012);
  const u = await farmerUser('abc'); assert.ok(u && !u.includes('abc'));
});

test('looksLikePlace only fires when a place is named', () => {
  assert.equal(looksLikePlace('I farm near Baramati in Pune district'), true);
  assert.equal(looksLikePlace('Tomato leaves are curling. Whitefly under leaves.'), false);
  assert.equal(looksLikePlace('Majha gav Shirur, taluka Shirur'), true);
});
