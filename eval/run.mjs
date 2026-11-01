#!/usr/bin/env node
/**
 * eval/run.mjs
 * Runs the eval set against the live /api/telegram endpoint.
 *
 * Usage:
 *   node eval/run.mjs [base-url]
 *
 * Defaults to http://localhost:8787 if no URL is provided.
 * Set KRISHI_BASE_URL env var to override.
 *
 * Each case in eval/cases.json has:
 *   - text:     The farmer's question
 *   - lang:     Language code (en/hi/mr)
 *   - must_any: Array of strings — the response telegram must contain at
 *               least one of them (case-insensitive) to pass.
 *
 * Prints a summary table and exits with code 1 if pass rate < 70%.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.argv[2] || process.env.KRISHI_BASE_URL || 'http://localhost:8787';
const API_URL = `${BASE_URL}/api/telegram`;

const cases = JSON.parse(
  readFileSync(join(__dirname, 'cases.json'), 'utf8')
);

const PASS_THRESHOLD = 0.70;
const DELAY_MS = 300; // be gentle to the API

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCase(c) {
  const start = Date.now();
  let data;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: c.text, lang: c.lang }),
    });
    data = await res.json();
  } catch (err) {
    return { id: c.id, pass: false, reason: `fetch error: ${err.message}`, ms: Date.now() - start };
  }

  if (!data.telegram) {
    return { id: c.id, pass: false, reason: 'no telegram in response', ms: Date.now() - start };
  }

  const telegramUp = data.telegram.toUpperCase();
  const matched = c.must_any.find(term => telegramUp.includes(term.toUpperCase()));

  return {
    id: c.id,
    pass: Boolean(matched),
    matched: matched || null,
    telegram: data.telegram,
    cause: data.cause || null,
    ms: Date.now() - start,
    reason: matched ? null : `none of [${c.must_any.join(', ')}] found`,
  };
}

async function main() {
  console.log(`\nKrishi Telegram Eval — ${cases.length} cases → ${API_URL}\n`);
  console.log('─'.repeat(72));

  const results = [];
  for (const c of cases) {
    const r = await runCase(c);
    const icon = r.pass ? '✓' : '✗';
    const matchStr = r.matched ? `[${r.matched}]` : `FAIL`;
    console.log(`${icon}  ${c.id.padEnd(30)} ${matchStr.padEnd(20)} ${r.ms}ms`);
    if (!r.pass) {
      console.log(`   telegram: ${(r.telegram || '(none)').slice(0, 80)}`);
      console.log(`   reason:   ${r.reason}`);
    }
    results.push(r);
    await sleep(DELAY_MS);
  }

  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  const rate = passed / total;

  console.log('─'.repeat(72));
  console.log(`\nResults: ${passed}/${total} passed  (${(rate * 100).toFixed(0)}%)`);

  if (rate < PASS_THRESHOLD) {
    console.error(`\nFAIL: pass rate ${(rate * 100).toFixed(0)}% is below threshold ${(PASS_THRESHOLD * 100).toFixed(0)}%`);
    process.exit(1);
  } else {
    console.log(`\nPASS: pass rate ${(rate * 100).toFixed(0)}% meets threshold ${(PASS_THRESHOLD * 100).toFixed(0)}%`);
  }
}

main().catch(err => {
  console.error('eval failed:', err.message);
  process.exit(1);
});
