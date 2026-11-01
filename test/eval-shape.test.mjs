/**
 * test/eval-shape.test.mjs
 * Unit tests for the shape and validity of eval/cases.json.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const VALID_LANGS = new Set(['en', 'hi', 'mr']);

let cases;

test('eval/cases.json exists and parses as JSON', () => {
  let raw;
  try {
    raw = readFileSync(join(ROOT, 'eval', 'cases.json'), 'utf8');
  } catch {
    assert.fail('eval/cases.json not found');
  }
  assert.doesNotThrow(() => {
    cases = JSON.parse(raw);
  }, 'eval/cases.json must be valid JSON');
});

test('eval/cases.json is an array', () => {
  assert.ok(Array.isArray(cases), 'cases should be a JSON array');
});

test('eval/cases.json has at least 10 cases', () => {
  assert.ok(cases.length >= 10, `Should have at least 10 cases, found ${cases.length}`);
});

test('every case has a non-empty id string', () => {
  for (const c of cases) {
    assert.ok(
      typeof c.id === 'string' && c.id.trim().length > 0,
      `Case missing id: ${JSON.stringify(c)}`
    );
  }
});

test('every case has a non-empty text string', () => {
  for (const c of cases) {
    assert.ok(
      typeof c.text === 'string' && c.text.trim().length > 0,
      `Case ${c.id} missing text`
    );
  }
});

test('every case has a valid lang (en/hi/mr)', () => {
  for (const c of cases) {
    assert.ok(
      VALID_LANGS.has(c.lang),
      `Case ${c.id} has invalid lang: ${c.lang}`
    );
  }
});

test('every case has a non-empty must_any array', () => {
  for (const c of cases) {
    assert.ok(
      Array.isArray(c.must_any) && c.must_any.length > 0,
      `Case ${c.id} must have a non-empty must_any array`
    );
  }
});

test('every must_any entry is a non-empty string', () => {
  for (const c of cases) {
    for (const term of c.must_any) {
      assert.ok(
        typeof term === 'string' && term.trim().length > 0,
        `Case ${c.id} has invalid must_any entry: ${JSON.stringify(term)}`
      );
    }
  }
});

test('all case ids are unique', () => {
  const ids = cases.map(c => c.id);
  const unique = new Set(ids);
  assert.equal(unique.size, ids.length, 'All case ids must be unique');
});

test('cases cover at least 3 different crops or problems', () => {
  // Rough check: at least 3 distinct id prefixes/keywords across cases
  const texts = cases.map(c => c.text.toLowerCase());
  const cropKeywords = ['wheat', 'rice', 'cotton', 'tomato', 'sugarcane', 'paddy',
    'soybean', 'onion', 'maize', 'makk', 'groundnut', 'banana', 'chilli'];
  const found = cropKeywords.filter(k => texts.some(t => t.includes(k)));
  assert.ok(found.length >= 3, `Should cover at least 3 crop types, found: ${found.join(', ')}`);
});

test('eval/run.mjs exists', () => {
  let content;
  try {
    content = readFileSync(join(ROOT, 'eval', 'run.mjs'), 'utf8');
  } catch {
    assert.fail('eval/run.mjs not found');
  }
  assert.ok(content.includes('/api/telegram'), 'run.mjs should call /api/telegram');
  assert.ok(content.includes('must_any'), 'run.mjs should check must_any');
});
