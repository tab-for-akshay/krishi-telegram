/**
 * test/kvk.test.mjs
 * Unit tests for findKvk() from site/worker.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { findKvk } from '../site/worker.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Load real KVK data for integration tests
let kvkData = null;
try {
  kvkData = JSON.parse(readFileSync(join(ROOT, 'site', 'data', 'kvk.json'), 'utf8'));
} catch {
  // Will be caught in tests
}

// ---------------------------------------------------------------------------
// findKvk with minimal inline data
// ---------------------------------------------------------------------------

const MINI_DATA = {
  kvks: [
    { state: 'Maharashtra', district: 'Pune', kvk: 'KVK Pune Test', host: 'Test University', source: 'https://example.com' },
    { state: 'Maharashtra', district: 'Nashik', kvk: 'KVK Nashik Test', host: 'Test University Nashik', source: 'https://example.com/nashik' },
    { state: 'Maharashtra', district: null, kvk: 'KVK Maharashtra Generic, Ahmednagar', host: 'Host Uni', source: 'https://example.com/gen' },
    { state: 'Gujarat', district: 'Surat', kvk: 'KVK Surat Test', host: 'Navsari Agricultural University', source: 'https://example.com/surat' },
  ],
};

test('findKvk: returns null for null/undefined kvkData', () => {
  assert.equal(findKvk(null, 'Maharashtra', 'Pune'), null);
  assert.equal(findKvk(undefined, 'Maharashtra', 'Pune'), null);
});

test('findKvk: returns null when state is empty', () => {
  assert.equal(findKvk(MINI_DATA, '', 'Pune'), null);
});

test('findKvk: returns null when district is empty', () => {
  assert.equal(findKvk(MINI_DATA, 'Maharashtra', ''), null);
});

test('findKvk: returns null for no state match', () => {
  const result = findKvk(MINI_DATA, 'Atlantis', 'Pune');
  assert.equal(result, null);
});

test('findKvk: returns null for state match but no district match', () => {
  const result = findKvk(MINI_DATA, 'Maharashtra', 'Kolhapur');
  assert.equal(result, null);
});

test('findKvk: finds exact district match', () => {
  const result = findKvk(MINI_DATA, 'Maharashtra', 'Pune');
  assert.ok(result, 'Should return a match');
  assert.equal(result.district, 'Pune');
  assert.ok(result.kvk.includes('Pune'));
});

test('findKvk: match is case-insensitive for state', () => {
  const result = findKvk(MINI_DATA, 'maharashtra', 'Pune');
  assert.ok(result, 'Should match regardless of case');
  assert.equal(result.district, 'Pune');
});

test('findKvk: match is case-insensitive for district', () => {
  const result = findKvk(MINI_DATA, 'Maharashtra', 'pune');
  assert.ok(result, 'Should match regardless of case');
  assert.equal(result.district, 'Pune');
});

test('findKvk: district substring match works', () => {
  // 'nash' should match 'Nashik'
  const result = findKvk(MINI_DATA, 'Maharashtra', 'nash');
  assert.ok(result, 'Should match via substring');
  assert.equal(result.district, 'Nashik');
});

test('findKvk: matches different state', () => {
  const result = findKvk(MINI_DATA, 'Gujarat', 'Surat');
  assert.ok(result);
  assert.equal(result.state, 'Gujarat');
  assert.equal(result.district, 'Surat');
});

test('findKvk: returned object has expected fields', () => {
  const result = findKvk(MINI_DATA, 'Maharashtra', 'Pune');
  assert.ok(result);
  assert.ok('state' in result);
  assert.ok('district' in result);
  assert.ok('kvk' in result);
  assert.ok('host' in result);
  assert.ok('source' in result);
});

test('findKvk: falls back to kvk text search when district field is null', () => {
  // The MINI_DATA entry for Maharashtra with null district contains 'Ahmednagar' in kvk text
  const result = findKvk(MINI_DATA, 'Maharashtra', 'ahmednagar');
  assert.ok(result, 'Should find by kvk text fallback');
  assert.equal(result.district, null);
});

// ---------------------------------------------------------------------------
// Integration tests with real kvk.json
// ---------------------------------------------------------------------------

test('kvk.json exists and has correct shape', () => {
  assert.ok(kvkData, 'kvk.json should be loadable');
  assert.ok(Array.isArray(kvkData.kvks), 'kvks should be an array');
  assert.ok(kvkData.kvks.length >= 100, 'Should have at least 100 KVK entries');
  assert.ok(typeof kvkData.source === 'string', 'Should have source field');
  assert.ok(typeof kvkData.fetched === 'string', 'Should have fetched field');
});

test('findKvk: finds a real Maharashtra/Pune KVK', () => {
  if (!kvkData) return;
  const result = findKvk(kvkData, 'Maharashtra', 'Pune');
  assert.ok(result, 'Should find a KVK for Maharashtra/Pune');
  assert.equal(result.state, 'Maharashtra');
  assert.ok(result.kvk.length > 0);
});

test('findKvk: finds a real Gujarat KVK', () => {
  if (!kvkData) return;
  const result = findKvk(kvkData, 'Gujarat', 'Navsari');
  assert.ok(result, 'Should find a KVK for Gujarat/Navsari');
  assert.equal(result.state, 'Gujarat');
});

test('findKvk: finds a real Rajasthan KVK', () => {
  if (!kvkData) return;
  const result = findKvk(kvkData, 'Rajasthan', 'Jaipur');
  assert.ok(result, 'Should find a KVK for Rajasthan/Jaipur');
  assert.equal(result.state, 'Rajasthan');
});
