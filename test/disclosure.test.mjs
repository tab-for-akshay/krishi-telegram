/**
 * test/disclosure.test.mjs
 * Tests that the required disclosure line is present in README.md and index.html
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const DISCLOSURE = 'Built by Tab, an AI assistant, for team lead Akshay Wagh.';

test('README.md exists', () => {
  let content;
  try {
    content = readFileSync(join(ROOT, 'README.md'), 'utf8');
  } catch {
    assert.fail('README.md not found');
  }
  assert.ok(content.length > 0, 'README.md should not be empty');
});

test('README.md contains the required disclosure line', () => {
  const content = readFileSync(join(ROOT, 'README.md'), 'utf8');
  assert.ok(
    content.includes(DISCLOSURE),
    `README.md must contain: "${DISCLOSURE}"`
  );
});

test('site/index.html exists', () => {
  let content;
  try {
    content = readFileSync(join(ROOT, 'site', 'index.html'), 'utf8');
  } catch {
    assert.fail('site/index.html not found');
  }
  assert.ok(content.length > 0, 'index.html should not be empty');
});

test('site/index.html contains the required disclosure line in the footer', () => {
  const content = readFileSync(join(ROOT, 'site', 'index.html'), 'utf8');
  assert.ok(
    content.includes(DISCLOSURE),
    `index.html must contain: "${DISCLOSURE}"`
  );
});

test('disclosure line mentions Tab', () => {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
  assert.ok(readme.includes('Tab'), 'Disclosure must mention Tab');
});

test('disclosure line mentions Kiro', () => {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
  assert.ok(readme.includes('Kiro'), 'Disclosure must mention Kiro');
});

test('disclosure line mentions Akshay Wagh', () => {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
  assert.ok(readme.includes('Akshay Wagh'), 'Disclosure must mention Akshay Wagh');
});

test('LICENSE file exists', () => {
  let content;
  try {
    content = readFileSync(join(ROOT, 'LICENSE'), 'utf8');
  } catch {
    assert.fail('LICENSE file not found');
  }
  assert.ok(content.includes('MIT'), 'LICENSE should be MIT');
});
