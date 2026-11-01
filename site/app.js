/**
 * Krishi Telegram — app.js
 * Frontend logic: form submit, telegram render, Morse audio, print
 */

'use strict';

// ---------------------------------------------------------------------------
// Morse audio
// ---------------------------------------------------------------------------

/**
 * Parse a Morse string (dots, dashes, spaces) into timing events and play
 * them using the Web Audio API.
 *
 * @param {string} morseStr  Morse code string from the API
 * @returns {{ stop: Function }} Object with a stop() method
 */
function playMorseAudio(morseStr) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return { stop: () => {} };

  const ctx = new AudioCtx();
  const UNIT = 0.06;        // 60 ms per unit
  const FREQ = 600;         // Hz, classic CW tone

  /** Schedule a beep of `durationUnits` starting at `startTime`. */
  function scheduleBeep(startTime, durationUnits) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.value = FREQ;

    const t0 = startTime;
    const t1 = startTime + durationUnits * UNIT;

    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.5, t0 + 0.005);
    gain.gain.setValueAtTime(0.5, t1 - 0.005);
    gain.gain.linearRampToValueAtTime(0, t1);

    osc.start(t0);
    osc.stop(t1);
    return osc;
  }

  let t = ctx.currentTime + 0.1;
  const nodes = [];

  // Parse the Morse string character by character
  let i = 0;
  while (i < morseStr.length) {
    if (morseStr[i] === '.') {
      nodes.push(scheduleBeep(t, 1));
      t += UNIT * 1; // dot duration
      t += UNIT * 1; // intra-character gap
      i++;
    } else if (morseStr[i] === '-') {
      nodes.push(scheduleBeep(t, 3));
      t += UNIT * 3; // dash duration
      t += UNIT * 1; // intra-character gap
      i++;
    } else if (morseStr.slice(i, i + 3) === '   ') {
      // Word gap (3 spaces = 7 units total: 3 from word gap + we already added 1 intra-char)
      t += UNIT * 6; // extra 6 to reach total 7
      i += 3;
    } else if (morseStr[i] === ' ') {
      // Letter gap (1 space = 3 units total: we already added 1 intra-char)
      t += UNIT * 2; // extra 2 to reach total 3
      i++;
    } else {
      i++;
    }
  }

  const totalDuration = t - ctx.currentTime;

  return {
    stop() {
      nodes.forEach(n => {
        try { n.stop(); } catch (_) { /* already stopped */ }
      });
      ctx.close();
    },
    totalDuration,
  };
}

// ---------------------------------------------------------------------------
// Telegram rendering
// ---------------------------------------------------------------------------

/**
 * Render the telegram card with data from the API.
 * @param {{ telegram: string, words: number, cost_paise: number, morse: string }} data
 */
function renderTelegram(data) {
  const card = document.getElementById('telegram-card');
  const body = document.getElementById('telegram-body');
  const words = document.getElementById('telegram-words');
  const cost = document.getElementById('telegram-cost');
  const dateEl = document.getElementById('telegram-date');
  const playBtn = document.getElementById('play-morse');

  body.textContent = data.telegram;
  words.textContent = data.words;

  // Format cost
  const paise = data.cost_paise;
  const rupees = Math.floor(paise / 100);
  const remainingPaise = paise % 100;
  const costStr = rupees > 0
    ? `₹${rupees}.${String(remainingPaise).padStart(2, '0')} (${paise} paise)`
    : `${paise} paise`;
  cost.textContent = costStr;

  // Date
  dateEl.textContent = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();

  card.hidden = false;

  // Show Morse button only if Web Audio is supported and we have morse data
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (AudioCtx && data.morse) {
    playBtn.hidden = false;
  }
}

// ---------------------------------------------------------------------------
// Morse button state management
// ---------------------------------------------------------------------------
let activeMorseStop = null;
let morseAutoStopTimer = null;

function resetMorseButtons() {
  const playBtn = document.getElementById('play-morse');
  const stopBtn = document.getElementById('stop-morse');
  playBtn.hidden = false;
  stopBtn.hidden = true;
  activeMorseStop = null;
  if (morseAutoStopTimer) {
    clearTimeout(morseAutoStopTimer);
    morseAutoStopTimer = null;
  }
}

function setupMorsePlayback(morseStr) {
  const playBtn = document.getElementById('play-morse');
  const stopBtn = document.getElementById('stop-morse');

  playBtn.onclick = () => {
    const result = playMorseAudio(morseStr);
    activeMorseStop = result.stop;

    playBtn.hidden = true;
    stopBtn.hidden = false;

    // Auto-reset when playback ends
    if (result.totalDuration) {
      morseAutoStopTimer = setTimeout(resetMorseButtons, result.totalDuration * 1000 + 200);
    }
  };

  stopBtn.onclick = () => {
    if (activeMorseStop) activeMorseStop();
    resetMorseButtons();
  };
}

// ---------------------------------------------------------------------------
// Error display
// ---------------------------------------------------------------------------
function showError(message) {
  const errEl = document.getElementById('error-msg');
  errEl.textContent = message;
  errEl.hidden = false;
}

function clearError() {
  const errEl = document.getElementById('error-msg');
  errEl.textContent = '';
  errEl.hidden = true;
}

// ---------------------------------------------------------------------------
// Form submit handler
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('telegram-form');
  const sendBtn = document.getElementById('send-btn');
  const loadingEl = document.getElementById('loading');
  const resultSection = document.getElementById('result');
  const card = document.getElementById('telegram-card');
  const printBtn = document.getElementById('print-btn');

  // Print button
  printBtn.addEventListener('click', () => window.print());

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const text = document.getElementById('question').value.trim();
    const lang = document.getElementById('lang').value;

    if (!text) return;

    // Reset UI
    clearError();
    card.hidden = true;
    document.getElementById('play-morse').hidden = true;
    document.getElementById('stop-morse').hidden = true;
    if (activeMorseStop) {
      activeMorseStop();
      activeMorseStop = null;
    }

    // Show loading
    resultSection.hidden = false;
    loadingEl.hidden = false;
    sendBtn.disabled = true;
    sendBtn.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang }),
      });

      const data = await response.json();

      loadingEl.hidden = true;

      if (!response.ok && !data.telegram) {
        showError(`Error: ${data.error || 'Something went wrong. Please try again.'}`);
        return;
      }

      renderTelegram(data);

      if (data.morse) {
        setupMorsePlayback(data.morse);
      }

      // Scroll the result into view
      resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (err) {
      loadingEl.hidden = true;
      showError('Network error: Could not reach the telegraph office. Please try again.');
      console.error(err);
    } finally {
      sendBtn.disabled = false;
      sendBtn.removeAttribute('aria-busy');
    }
  });
});
