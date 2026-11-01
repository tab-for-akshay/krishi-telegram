/**
 * test/lang.test.mjs
 * Unit tests for language-specific safety telegrams (SAFETY_TELEGRAMS)
 * and the language-aware safetyFloor() function from site/worker.mjs.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safetyFloor, SAFETY_TELEGRAMS } from '../site/worker.mjs';

// ---------------------------------------------------------------------------
// SAFETY_TELEGRAMS structure
// ---------------------------------------------------------------------------

test('SAFETY_TELEGRAMS has emergency and kvk keys', () => {
  assert.ok(SAFETY_TELEGRAMS.emergency, 'Should have emergency key');
  assert.ok(SAFETY_TELEGRAMS.kvk, 'Should have kvk key');
});

test('SAFETY_TELEGRAMS.emergency has en/hi/mr variants', () => {
  assert.ok(typeof SAFETY_TELEGRAMS.emergency.en === 'string');
  assert.ok(typeof SAFETY_TELEGRAMS.emergency.hi === 'string');
  assert.ok(typeof SAFETY_TELEGRAMS.emergency.mr === 'string');
});

test('SAFETY_TELEGRAMS.kvk has en/hi/mr variants', () => {
  assert.ok(typeof SAFETY_TELEGRAMS.kvk.en === 'string');
  assert.ok(typeof SAFETY_TELEGRAMS.kvk.hi === 'string');
  assert.ok(typeof SAFETY_TELEGRAMS.kvk.mr === 'string');
});

test('All safety telegrams are uppercase (Roman script, Morse-safe)', () => {
  for (const type of ['emergency', 'kvk']) {
    for (const lang of ['en', 'hi', 'mr']) {
      const t = SAFETY_TELEGRAMS[type][lang];
      // Check it equals itself uppercased (i.e. no lowercase letters)
      assert.equal(
        t, t.toUpperCase(),
        `SAFETY_TELEGRAMS.${type}.${lang} should be all uppercase`
      );
      assert.ok(t.includes('STOP'), `SAFETY_TELEGRAMS.${type}.${lang} should contain STOP`);
    }
  }
});

test('Emergency telegrams contain 108 helpline (EN)', () => {
  assert.ok(SAFETY_TELEGRAMS.emergency.en.includes('108'));
});

test('Emergency telegrams contain 14416 (Tele-MANAS) in EN', () => {
  assert.ok(SAFETY_TELEGRAMS.emergency.en.includes('14416'));
});

test('KVK telegrams mention KVK in all languages', () => {
  for (const lang of ['en', 'hi', 'mr']) {
    assert.ok(
      SAFETY_TELEGRAMS.kvk[lang].includes('KVK'),
      `kvk telegram for ${lang} should mention KVK`
    );
  }
});

// ---------------------------------------------------------------------------
// safetyFloor with language parameter
// ---------------------------------------------------------------------------

test('safetyFloor: returns emergency telegram in English (default)', () => {
  const result = safetyFloor('I want to commit suicide', 'en');
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'self_harm');
  assert.equal(result.telegram, SAFETY_TELEGRAMS.emergency.en);
});

test('safetyFloor: returns emergency telegram in Hindi', () => {
  const result = safetyFloor('I want to commit suicide', 'hi');
  assert.equal(result.blocked, true);
  assert.equal(result.telegram, SAFETY_TELEGRAMS.emergency.hi);
});

test('safetyFloor: returns emergency telegram in Marathi', () => {
  const result = safetyFloor('I want to commit suicide', 'mr');
  assert.equal(result.blocked, true);
  assert.equal(result.telegram, SAFETY_TELEGRAMS.emergency.mr);
});

test('safetyFloor: falls back to English for unknown lang', () => {
  const result = safetyFloor('I took poison', 'xx');
  assert.equal(result.blocked, true);
  assert.equal(result.telegram, SAFETY_TELEGRAMS.emergency.en);
});

test('safetyFloor: returns KVK telegram in English for pesticide query', () => {
  const result = safetyFloor('dosage for my crop', 'en');
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'pesticide_dose');
  assert.equal(result.telegram, SAFETY_TELEGRAMS.kvk.en);
});

test('safetyFloor: returns KVK telegram in Hindi for pesticide query', () => {
  const result = safetyFloor('dosage for my crop', 'hi');
  assert.equal(result.blocked, true);
  assert.equal(result.telegram, SAFETY_TELEGRAMS.kvk.hi);
});

test('safetyFloor: returns KVK telegram in Marathi for pesticide query', () => {
  const result = safetyFloor('dosage for my crop', 'mr');
  assert.equal(result.blocked, true);
  assert.equal(result.telegram, SAFETY_TELEGRAMS.kvk.mr);
});

test('safetyFloor: uses KVK district-specific telegram when kvkMatch given', () => {
  const kvkMatch = { district: 'Nashik', kvk: 'KVK Nashik', host: 'Test Uni', source: 'https://example.com' };
  const result = safetyFloor('dosage for my crop', 'en', kvkMatch);
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'pesticide_dose');
  // Should contain district name in the telegram
  assert.ok(result.telegram.includes('NASHIK'), 'KVK district referral should name the district');
  assert.ok(result.telegram.includes('KVK'), 'KVK district referral should mention KVK');
});

test('safetyFloor: all blocked telegrams are uppercase (Morse-safe)', () => {
  const triggers = [
    { text: 'I took poison', lang: 'en' },
    { text: 'I took poison', lang: 'hi' },
    { text: 'I took poison', lang: 'mr' },
    { text: 'dosage for crops', lang: 'en' },
    { text: 'dosage for crops', lang: 'hi' },
    { text: 'dosage for crops', lang: 'mr' },
  ];
  for (const { text, lang } of triggers) {
    const result = safetyFloor(text, lang);
    assert.equal(result.blocked, true);
    assert.equal(
      result.telegram, result.telegram.toUpperCase(),
      `Blocked telegram for lang=${lang} should be all uppercase`
    );
  }
});

test('safetyFloor: safe input returns blocked:false with any lang', () => {
  for (const lang of ['en', 'hi', 'mr']) {
    const result = safetyFloor('My wheat has yellow spots', lang);
    assert.equal(result.blocked, false);
  }
});
