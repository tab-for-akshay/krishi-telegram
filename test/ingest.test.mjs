import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safetyFloor, KVK_NAMED } from '../site/worker.mjs';
test('ingestion phrasing in EN/Hinglish/Marathi triggers the emergency telegram', () => {
  for (const t of ['my brother drank pesticide', 'bhai ne keetnaashak pi liya', 'tyane vish pyayla', 'zeher kha liya', 'he swallowed insecticide']) {
    const r = safetyFloor(t, 'hi'); assert.equal(r.reason, 'self_harm', t); assert.match(r.telegram, /108/); assert.match(r.telegram, /14416/);
  }
});
test('ordinary pest questions are not blocked', () => {
  for (const t of ['how to control aphids on mustard', 'whitefly on cotton leaves', 'vishesh salah chahiye gehun ke liye']) assert.equal(safetyFloor(t, 'en').blocked, false, t);
});
test('named-KVK referral exists in all three languages and uses Roman letters only', () => {
  for (const l of ['en', 'hi', 'mr']) { const s = KVK_NAMED[l]('AKOLA'); assert.match(s, /AKOLA/); assert.match(s, /^[A-Z0-9 -]+$/); }
});
