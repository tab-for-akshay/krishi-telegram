/**
 * Krishi Telegram — app.js
 * Frontend logic: form submit, telegram render, Morse audio, print
 */

'use strict';

// ---------------------------------------------------------------------------
// Morse audio with symbol-level callback for visual sync
// ---------------------------------------------------------------------------

const MORSE_WPM = 15;   // default sending speed
const DOT_MS = 1200 / MORSE_WPM;  // PARIS standard: dot duration in ms

/**
 * Parse a Morse string into timing events and play them using the Web Audio API.
 * Calls onSymbol(index) when each dot/dash begins, for visual strip sync.
 *
 * @param {string} morseStr  Morse code string from the API
 * @param {Function} [onSymbol]  Called with symbol index when a beep starts
 * @returns {{ stop: Function, totalDuration: number }}
 */
function playMorseAudio(morseStr, onSymbol) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return { stop: () => {}, totalDuration: 0 };

  const ctx = new AudioCtx();
  const UNIT = DOT_MS / 1000;   // seconds per dot
  const FREQ = 600;              // Hz, classic CW tone

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

  // Build index of symbol positions (dots and dashes only)
  let symIdx = 0;
  let i = 0;
  const schedules = []; // { time, symIdx } pairs for callback

  while (i < morseStr.length) {
    if (morseStr[i] === '.') {
      schedules.push({ time: t, symIdx });
      nodes.push(scheduleBeep(t, 1));
      t += UNIT * 1; // dot duration
      t += UNIT * 1; // intra-character gap
      symIdx++;
      i++;
    } else if (morseStr[i] === '-') {
      schedules.push({ time: t, symIdx });
      nodes.push(scheduleBeep(t, 3));
      t += UNIT * 3; // dash duration
      t += UNIT * 1; // intra-character gap
      symIdx++;
      i++;
    } else if (morseStr.slice(i, i + 3) === '   ') {
      // Word gap (3 spaces = 7 units total; already added 1 intra-char)
      t += UNIT * 6;
      i += 3;
    } else if (morseStr[i] === ' ') {
      // Letter gap (1 space = 3 units total; already added 1 intra-char)
      t += UNIT * 2;
      i++;
    } else {
      i++;
    }
  }

  const totalDuration = t - ctx.currentTime;

  // Schedule callbacks via setTimeout
  const timers = [];
  if (typeof onSymbol === 'function') {
    const baseTime = ctx.currentTime + 0.1;
    for (const sched of schedules) {
      const delay = (sched.time - baseTime) * 1000;
      if (delay >= 0) {
        const tid = setTimeout(() => onSymbol(sched.symIdx), delay);
        timers.push(tid);
      }
    }
  }

  return {
    stop() {
      nodes.forEach(n => {
        try { n.stop(); } catch (_) { /* already stopped */ }
      });
      timers.forEach(id => clearTimeout(id));
      ctx.close();
    },
    totalDuration,
    symbolCount: symIdx,
  };
}

// ---------------------------------------------------------------------------
// Morse visual strip
// ---------------------------------------------------------------------------

/**
 * Build the visual Morse strip from a Morse string.
 * Each dot/dash becomes a <span> element; spaces are ignored visually.
 * Returns the total number of symbols (for sync).
 *
 * @param {string} morseStr
 * @returns {number} symbol count
 */
function renderMorseStrip(morseStr) {
  const strip = document.getElementById('morse-strip');
  const container = document.getElementById('morse-strip-container');
  const wpmEl = document.getElementById('morse-wpm');
  if (!strip || !container) return 0;

  strip.innerHTML = '';

  let symIdx = 0;
  for (let i = 0; i < morseStr.length; i++) {
    const ch = morseStr[i];
    if (ch === '.') {
      const span = document.createElement('span');
      span.className = 'kt-morse-dot';
      span.dataset.sym = symIdx;
      span.setAttribute('aria-hidden', 'true');
      strip.appendChild(span);
      symIdx++;
    } else if (ch === '-') {
      const span = document.createElement('span');
      span.className = 'kt-morse-dash';
      span.dataset.sym = symIdx;
      span.setAttribute('aria-hidden', 'true');
      strip.appendChild(span);
      symIdx++;
    } else if (morseStr.slice(i, i + 3) === '   ') {
      // word gap visual spacer
      const span = document.createElement('span');
      span.className = 'kt-morse-word-gap';
      span.setAttribute('aria-hidden', 'true');
      strip.appendChild(span);
      i += 2; // skip extra 2 spaces (loop will increment once more)
    } else if (ch === ' ') {
      // letter gap visual spacer
      const span = document.createElement('span');
      span.className = 'kt-morse-letter-gap';
      span.setAttribute('aria-hidden', 'true');
      strip.appendChild(span);
    }
  }

  container.hidden = false;
  if (wpmEl) {
    wpmEl.textContent = `${MORSE_WPM} WPM`;
  }

  return symIdx;
}

/**
 * Highlight the symbol at the given index in the Morse strip.
 * Clears previous highlights.
 *
 * @param {number} symIdx
 */
function highlightMorseSymbol(symIdx) {
  const strip = document.getElementById('morse-strip');
  if (!strip) return;

  // Clear all active highlights
  strip.querySelectorAll('.kt-morse-active').forEach(el => {
    el.classList.remove('kt-morse-active');
  });

  // Highlight the new one
  const el = strip.querySelector(`[data-sym="${symIdx}"]`);
  if (el) {
    el.classList.add('kt-morse-active');
    // Scroll into view if needed
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }
}

// ---------------------------------------------------------------------------
// Telegram rendering
// ---------------------------------------------------------------------------

/**
 * Render the telegram card with data from the API.
 * @param {object} data
 */
function renderTelegram(data) {
  const card = document.getElementById('telegram-card');
  const body = document.getElementById('telegram-body');
  const words = document.getElementById('telegram-words');
  const cost = document.getElementById('telegram-cost');
  const dateEl = document.getElementById('telegram-date');
  const causeEl = document.getElementById('telegram-cause');
  const playBtn = document.getElementById('play-morse');

  body.textContent = data.telegram;
  words.textContent = data.words;

  // Cause line
  if (data.cause && causeEl) {
    causeEl.textContent = `CAUSE: ${data.cause}`;
    causeEl.hidden = false;
  } else if (causeEl) {
    causeEl.hidden = true;
  }

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

/**
 * Render the KVK card if kvk data is present.
 * @param {object|null} kvk
 */
function renderKvkCard(kvk) {
  const kvkCard = document.getElementById('kvk-card');
  if (!kvkCard) return;

  if (!kvk || (!kvk.kvk && !kvk.district)) {
    kvkCard.hidden = true;
    return;
  }

  const nameEl = document.getElementById('kvk-name');
  const hostEl = document.getElementById('kvk-host');
  const sourceEl = document.getElementById('kvk-source');

  if (nameEl) nameEl.textContent = kvk.kvk || '';
  if (hostEl) hostEl.textContent = kvk.host || '';
  if (sourceEl && kvk.source) {
    sourceEl.href = kvk.source;
    sourceEl.hidden = false;
  } else if (sourceEl) {
    sourceEl.hidden = true;
  }

  kvkCard.hidden = false;
}

// ---------------------------------------------------------------------------
// Morse button state management
// ---------------------------------------------------------------------------
let activeMorseStop = null;
let morseAutoStopTimer = null;

function resetMorseButtons() {
  const playBtn = document.getElementById('play-morse');
  const stopBtn = document.getElementById('stop-morse');
  if (playBtn) playBtn.hidden = false;
  if (stopBtn) stopBtn.hidden = true;
  activeMorseStop = null;
  if (morseAutoStopTimer) {
    clearTimeout(morseAutoStopTimer);
    morseAutoStopTimer = null;
  }

  // Clear all strip highlights when playback ends
  const strip = document.getElementById('morse-strip');
  if (strip) {
    strip.querySelectorAll('.kt-morse-active').forEach(el => {
      el.classList.remove('kt-morse-active');
    });
  }
}

function setupMorsePlayback(morseStr) {
  const playBtn = document.getElementById('play-morse');
  const stopBtn = document.getElementById('stop-morse');

  // Render the visual strip
  renderMorseStrip(morseStr);

  playBtn.onclick = () => {
    const result = playMorseAudio(morseStr, (symIdx) => {
      highlightMorseSymbol(symIdx);
    });
    activeMorseStop = result.stop;

    playBtn.hidden = true;
    stopBtn.hidden = false;

    // Auto-reset when playback ends
    if (result.totalDuration) {
      morseAutoStopTimer = setTimeout(resetMorseButtons, result.totalDuration * 1000 + 400);
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
// State dropdown population (from kvk.json via ASSETS)
// ---------------------------------------------------------------------------
async function populateStates() {
  const stateSelect = document.getElementById('state');
  if (!stateSelect) return;

  try {
    const res = await fetch('/data/kvk.json');
    if (!res.ok) return;
    const kvkData = await res.json();

    // Collect unique states in document order
    const seen = new Set();
    const states = [];
    for (const entry of kvkData.kvks) {
      if (entry.state && !seen.has(entry.state)) {
        seen.add(entry.state);
        states.push(entry.state);
      }
    }
    states.sort();

    // Restore saved value from localStorage
    const savedState = localStorage.getItem('kt-state') || '';

    for (const s of states) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      if (s === savedState) opt.selected = true;
      stateSelect.appendChild(opt);
    }
  } catch (_err) {
    // Silently fail — state dropdown is optional
  }
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
  const stateSelect = document.getElementById('state');
  const districtInput = document.getElementById('district');
  const kvkCard = document.getElementById('kvk-card');

  // Print button
  printBtn.addEventListener('click', () => window.print());

  // Populate states
  populateStates();

  // Restore district from localStorage
  const savedDistrict = localStorage.getItem('kt-district') || '';
  if (districtInput && savedDistrict) {
    districtInput.value = savedDistrict;
  }

  // Restore lang from localStorage
  const langSelect = document.getElementById('lang');
  const savedLang = localStorage.getItem('kt-lang') || '';
  if (langSelect && savedLang) {
    langSelect.value = savedLang;
  }

  // Persist state/district/lang changes
  if (stateSelect) {
    stateSelect.addEventListener('change', () => {
      localStorage.setItem('kt-state', stateSelect.value);
    });
  }
  if (districtInput) {
    districtInput.addEventListener('input', () => {
      localStorage.setItem('kt-district', districtInput.value);
    });
  }
  if (langSelect) {
    langSelect.addEventListener('change', () => {
      localStorage.setItem('kt-lang', langSelect.value);
    });
  }

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const text = document.getElementById('question').value.trim();
    const lang = langSelect ? langSelect.value : 'en';
    const state = stateSelect ? stateSelect.value : '';
    const district = districtInput ? districtInput.value.trim() : '';

    if (!text) return;

    // Reset UI
    clearError();
    card.hidden = true;
    if (kvkCard) kvkCard.hidden = true;
    document.getElementById('play-morse').hidden = true;
    document.getElementById('stop-morse').hidden = true;
    const stripContainer = document.getElementById('morse-strip-container');
    if (stripContainer) stripContainer.hidden = true;
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
        body: JSON.stringify({ text, lang, state, district }),
      });

      const data = await response.json();

      loadingEl.hidden = true;

      if (!response.ok && !data.telegram) {
        showError(`Error: ${data.error || 'Something went wrong. Please try again.'}`);
        return;
      }

      renderTelegram(data);

      // Render KVK card
      renderKvkCard(data.kvk);

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
