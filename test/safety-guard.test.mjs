/**
 * test/safety-guard.test.mjs
 * Guards the safety floor in site/worker.mjs.
 *
 * Asserts:
 *  1. Emergency numbers 108, 112, and 14416 are present in the worker source.
 *  2. The KVK referral path exists in the worker source.
 *  3. The safety floor runs BEFORE the model call (checked via source analysis).
 *  4. The safety floor runs AFTER the model call (checked via source analysis).
 *  5. Pure-function checks: safetyFloor() returns the right shapes.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { safetyFloor, SAFETY_TELEGRAMS, SAFETY_NATIVE } from '../site/worker.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerSrc = readFileSync(join(__dirname, '..', 'site', 'worker.mjs'), 'utf8');

// ---------------------------------------------------------------------------
// Static source checks
// ---------------------------------------------------------------------------

test('worker source contains emergency number 108', () => {
  assert.ok(workerSrc.includes('108'), 'worker.mjs must contain 108');
});

test('worker source contains emergency number 112', () => {
  assert.ok(workerSrc.includes('112'), 'worker.mjs must contain 112');
});

test('worker source contains Tele-MANAS 14416', () => {
  assert.ok(workerSrc.includes('14416'), 'worker.mjs must contain 14416');
});

test('worker source contains KVK referral path', () => {
  assert.ok(
    workerSrc.includes('KVK') && workerSrc.includes('pesticide_dose'),
    'worker.mjs must contain KVK referral logic'
  );
});

test('safety floor runs BEFORE the model call', () => {
  // The pre-model safetyFloor call must appear before the actual model invocation.
  // We look for "Safety floor — checked BEFORE model call" comment and
  // "modelResult = await callGroq" (the actual call site, not the function definition).
  const preIdx = workerSrc.indexOf('Safety floor — checked BEFORE model call');
  const callIdx = workerSrc.indexOf('modelResult = await callGroq');
  assert.ok(preIdx !== -1, 'Pre-model safety floor comment must be present');
  assert.ok(callIdx !== -1, '"modelResult = await callGroq" call must be present');
  assert.ok(preIdx < callIdx, 'Safety floor check must come before model call invocation');
});

test('safety floor runs AFTER the model call', () => {
  // The post-model safetyFloor call must appear after the actual model invocation.
  const postIdx = workerSrc.indexOf('Safety floor — checked AFTER model response');
  const callIdx = workerSrc.indexOf('modelResult = await callGroq');
  assert.ok(postIdx !== -1, 'Post-model safety floor comment must be present');
  assert.ok(callIdx !== -1, '"modelResult = await callGroq" call must be present');
  assert.ok(postIdx > callIdx, 'Safety floor check must come after model call invocation');
});

// ---------------------------------------------------------------------------
// Pure-function checks
// ---------------------------------------------------------------------------

test('safetyFloor blocks self-harm and returns 108 and 14416', () => {
  const result = safetyFloor('I drank poison please help', 'en');
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'self_harm');
  assert.ok(result.telegram.includes('108'));
  assert.ok(result.telegram.includes('14416'));
});

test('safetyFloor blocks pesticide dose and returns KVK referral', () => {
  const result = safetyFloor('What is the dosage of this chemical?', 'en');
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'pesticide_dose');
  assert.ok(result.telegram.includes('KVK'));
});

test('SAFETY_TELEGRAMS.emergency contains 108 in all languages', () => {
  for (const lang of ['en', 'hi', 'mr']) {
    assert.ok(
      SAFETY_TELEGRAMS.emergency[lang].includes('108'),
      `emergency.${lang} must contain 108`
    );
  }
});

test('SAFETY_TELEGRAMS.emergency contains 112 in all languages', () => {
  for (const lang of ['en', 'hi', 'mr']) {
    assert.ok(
      SAFETY_TELEGRAMS.emergency[lang].includes('112'),
      `emergency.${lang} must contain 112`
    );
  }
});

test('SAFETY_TELEGRAMS.emergency contains 14416 in all languages', () => {
  for (const lang of ['en', 'hi', 'mr']) {
    assert.ok(
      SAFETY_TELEGRAMS.emergency[lang].includes('14416'),
      `emergency.${lang} must contain 14416`
    );
  }
});

test('SAFETY_TELEGRAMS.kvk references KVK in all languages', () => {
  for (const lang of ['en', 'hi', 'mr']) {
    assert.ok(
      SAFETY_TELEGRAMS.kvk[lang].includes('KVK'),
      `kvk.${lang} must reference KVK`
    );
  }
});

test('SAFETY_NATIVE has Devanagari for hi and mr emergency', () => {
  assert.ok(SAFETY_NATIVE, 'SAFETY_NATIVE must be exported');
  assert.ok(/[\u0900-\u097F]/.test(SAFETY_NATIVE.emergency.hi), 'emergency.hi must be Devanagari');
  assert.ok(/[\u0900-\u097F]/.test(SAFETY_NATIVE.emergency.mr), 'emergency.mr must be Devanagari');
});

test('SAFETY_NATIVE has Devanagari for hi and mr kvk', () => {
  assert.ok(/[\u0900-\u097F]/.test(SAFETY_NATIVE.kvk.hi), 'kvk.hi must be Devanagari');
  assert.ok(/[\u0900-\u097F]/.test(SAFETY_NATIVE.kvk.mr), 'kvk.mr must be Devanagari');
});

test('safetyFloor returns native Devanagari for hi emergency', () => {
  const result = safetyFloor('I want to commit suicide', 'hi');
  assert.equal(result.blocked, true);
  assert.ok(result.native, 'native field should be present for hi');
  assert.ok(/[\u0900-\u097F]/.test(result.native), 'native must be Devanagari for hi');
});

test('safetyFloor returns native Devanagari for mr emergency', () => {
  const result = safetyFloor('I want to commit suicide', 'mr');
  assert.equal(result.blocked, true);
  assert.ok(result.native, 'native field should be present for mr');
  assert.ok(/[\u0900-\u097F]/.test(result.native), 'native must be Devanagari for mr');
});

test('safetyFloor returns no native for en (English)', () => {
  const result = safetyFloor('I want to commit suicide', 'en');
  assert.equal(result.blocked, true);
  // native should be null/undefined for English
  assert.ok(!result.native, 'native should be absent or null for en');
});

test('safe farming question is not blocked', () => {
  const result = safetyFloor('My wheat leaves have yellow spots', 'en');
  assert.equal(result.blocked, false);
});
