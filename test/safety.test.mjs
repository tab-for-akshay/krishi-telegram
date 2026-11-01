/**
 * test/safety.test.mjs
 * Unit tests for the safetyFloor() function from site/worker.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safetyFloor } from '../site/worker.mjs';

// ---------------------------------------------------------------------------
// Safe inputs — should NOT be blocked
// ---------------------------------------------------------------------------

test('safetyFloor: safe farming question passes through', () => {
  const result = safetyFloor('My tomato plants have yellow leaves, what should I do?');
  assert.equal(result.blocked, false);
});

test('safetyFloor: safe Hindi farming query passes through', () => {
  const result = safetyFloor('Mere gehu mein pani kab dena chahiye?');
  assert.equal(result.blocked, false);
});

test('safetyFloor: safe pest question without chemical names passes through', () => {
  const result = safetyFloor('How do I deal with aphids on my cotton crop?');
  assert.equal(result.blocked, false);
});

test('safetyFloor: returns blocked:false when not triggered', () => {
  const result = safetyFloor('What fertilizer is good for wheat?');
  assert.deepEqual(result, { blocked: false });
});

// ---------------------------------------------------------------------------
// Self-harm / poisoning — must be blocked with emergency telegram
// ---------------------------------------------------------------------------

test('safetyFloor: blocks "poison" in text', () => {
  const result = safetyFloor('I accidentally swallowed some poison from the shed');
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'self_harm');
  assert.ok(result.telegram.includes('108'), 'Emergency telegram should mention 108');
  assert.ok(result.telegram.includes('14416'), 'Emergency telegram should mention 14416');
});

test('safetyFloor: blocks "suicide" keyword', () => {
  const result = safetyFloor('I am thinking about suicide because crops failed');
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'self_harm');
});

test('safetyFloor: blocks "self-harm" keyword', () => {
  const result = safetyFloor('I want to self-harm because of debt');
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'self_harm');
});

test('safetyFloor: blocks "poisoning symptoms"', () => {
  const result = safetyFloor('I have poisoning symptoms after working in the field');
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'self_harm');
});

test('safetyFloor: blocks pesticide swallow combination', () => {
  const result = safetyFloor('I swallowed pesticide by mistake');
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'self_harm');
});

test('safetyFloor: blocked telegram is uppercase and contains STOP', () => {
  const result = safetyFloor('I took poison');
  assert.equal(result.blocked, true);
  assert.ok(result.telegram === result.telegram.toUpperCase(), 'Telegram should be uppercase');
  assert.ok(result.telegram.includes('STOP'), 'Telegram should contain STOP');
});

test('safetyFloor: blocks "aatmahatya" (Hindi for suicide)', () => {
  const result = safetyFloor('Maine aatmahatya karna chahta hu');
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'self_harm');
});

// ---------------------------------------------------------------------------
// Pesticide names / dose — must be blocked with KVK redirect
// ---------------------------------------------------------------------------

test('safetyFloor: blocks chlorpyrifos by name', () => {
  const result = safetyFloor('Should I use chlorpyrifos on my cotton?');
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'pesticide_dose');
  assert.ok(result.telegram.includes('KVK'), 'Pesticide telegram should mention KVK');
});

test('safetyFloor: blocks endosulfan by name', () => {
  const result = safetyFloor('My neighbour uses endosulfan for pests, should I too?');
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'pesticide_dose');
});

test('safetyFloor: blocks monocrotophos by name', () => {
  const result = safetyFloor('monocrotophos dosage for rice crop?');
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'pesticide_dose');
});

test('safetyFloor: blocks "dosage" keyword', () => {
  const result = safetyFloor('What is the correct dosage for my crops?');
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'pesticide_dose');
});

test('safetyFloor: blocks "ml per" dose pattern', () => {
  const result = safetyFloor('How many ml per litre should I mix?');
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'pesticide_dose');
});

test('safetyFloor: KVK redirect telegram does not contain pesticide names', () => {
  const result = safetyFloor('Is chlorpyrifos safe for wheat?');
  assert.equal(result.blocked, true);
  // The response telegram must not echo back the chemical name
  assert.ok(
    !result.telegram.toLowerCase().includes('chlorpyrifos'),
    'Response telegram must not repeat pesticide name'
  );
});

test('safetyFloor: pesticide block takes precedence does not leak dose info', () => {
  const result = safetyFloor('What dose of malathion should I spray?');
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'pesticide_dose');
  // Telegram must not contain any number followed by ml/gm
  assert.ok(!/\d+\s*(ml|gm|g|litre)/i.test(result.telegram));
});
