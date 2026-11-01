/**
 * test/pricing.test.mjs
 * Unit tests for the costPaise() function from site/worker.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costPaise } from '../site/worker.mjs';

test('costPaise: 10 words costs 500 paise (minimum billing)', () => {
  assert.equal(costPaise(10), 500);
});

test('costPaise: fewer than 10 words still bills minimum 10 (500 paise)', () => {
  assert.equal(costPaise(1), 500);
  assert.equal(costPaise(5), 500);
  assert.equal(costPaise(9), 500);
});

test('costPaise: 0 words still bills minimum 10 words', () => {
  assert.equal(costPaise(0), 500);
});

test('costPaise: 20 words costs 1000 paise', () => {
  assert.equal(costPaise(20), 1000);
});

test('costPaise: 15 words costs 750 paise', () => {
  assert.equal(costPaise(15), 750);
});

test('costPaise: returns an integer', () => {
  const result = costPaise(13);
  assert.equal(Number.isInteger(result), true);
});

test('costPaise: cost increases linearly above 10 words', () => {
  const base = costPaise(10); // 500
  assert.equal(costPaise(11), base + 50);
  assert.equal(costPaise(12), base + 100);
  assert.equal(costPaise(20), base + 500);
});

test('costPaise: price per word is 50 paise', () => {
  // 11 words: 11 * 50 = 550
  assert.equal(costPaise(11), 550);
  // 25 words: 25 * 50 = 1250
  assert.equal(costPaise(25), 1250);
});
