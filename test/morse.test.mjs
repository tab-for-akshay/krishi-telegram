/**
 * test/morse.test.mjs
 * Unit tests for the morseEncode() function from site/worker.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { morseEncode } from '../site/worker.mjs';

test('morseEncode: encodes single letter A', () => {
  assert.equal(morseEncode('A'), '.-');
});

test('morseEncode: encodes single letter S', () => {
  assert.equal(morseEncode('S'), '...');
});

test('morseEncode: encodes single letter O', () => {
  assert.equal(morseEncode('O'), '---');
});

test('morseEncode: SOS is three letters with word gaps if spaced', () => {
  // "S O S" — three separate words
  assert.equal(morseEncode('S O S'), '...   ---   ...');
});

test('morseEncode: letters within a word are separated by 1 space', () => {
  // "HI" → .... ..
  assert.equal(morseEncode('HI'), '.... ..');
});

test('morseEncode: words are separated by 3 spaces', () => {
  // "E T" → . -  (word gap = 3 spaces)
  assert.equal(morseEncode('E T'), '.   -');
});

test('morseEncode: numbers encode correctly', () => {
  assert.equal(morseEncode('1'), '.----');
  assert.equal(morseEncode('0'), '-----');
  assert.equal(morseEncode('5'), '.....');
});

test('morseEncode: is case-insensitive', () => {
  assert.equal(morseEncode('sos'), morseEncode('SOS'));
  assert.equal(morseEncode('hello'), morseEncode('HELLO'));
});

test('morseEncode: unknown characters are silently skipped', () => {
  // '@' is not in the table; should be ignored
  assert.equal(morseEncode('@A'), '.-');
});

test('morseEncode: empty string returns empty string', () => {
  assert.equal(morseEncode(''), '');
});

test('morseEncode: STOP encoded as four letters', () => {
  // S=... T=- O=--- P=.--.
  assert.equal(morseEncode('STOP'), '... - --- .--.');
});

test('morseEncode: multi-word telegram phrase', () => {
  const result = morseEncode('CALL 108');
  // CALL = -.-. .- .-.. .-..   108 = .---- ----- ---..
  assert.ok(result.includes('   '), 'Should contain 3-space word gap');
  assert.ok(result.startsWith('-.-. .- .-.. .-..'), 'CALL should be first word');
});
