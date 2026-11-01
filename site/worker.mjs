/**
 * Krishi Telegram — Cloudflare Worker
 * Serves static assets and exposes POST /api/telegram
 */

// ---------------------------------------------------------------------------
// Morse code table (ITU-R)
// ---------------------------------------------------------------------------
const MORSE_TABLE = {
  A: '.-',    B: '-...',  C: '-.-.',  D: '-..',   E: '.',
  F: '..-.',  G: '--.',   H: '....',  I: '..',     J: '.---',
  K: '-.-',   L: '.-..',  M: '--',    N: '-.',     O: '---',
  P: '.--.',  Q: '--.-',  R: '.-.',   S: '...',    T: '-',
  U: '..-',   V: '...-',  W: '.--',   X: '-..-',   Y: '-.--',
  Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '/': '-..-.', '-': '-....-',
};

/**
 * Encode a string to Morse code.
 * Letter gap = 1 space, word gap = 3 spaces (between single-space separators
 * the total becomes: letter-end-space + word-gap + letter-start-space = 3).
 * Output uses dots and dashes; letters separated by ' ', words by '   ' (3 spaces).
 *
 * @param {string} text
 * @returns {string}
 */
export function morseEncode(text) {
  return text
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(word =>
      word
        .split('')
        .filter(ch => MORSE_TABLE[ch])
        .map(ch => MORSE_TABLE[ch])
        .join(' ')          // 1-space letter gap
    )
    .join('   ');           // 3-space word gap
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------
const PRICE_PER_WORD_PAISE = 50;
const MINIMUM_WORDS = 10;

/**
 * Calculate cost in paise. Minimum 10 words billed (illustrative rate).
 * @param {number} wordCount
 * @returns {number}
 */
export function costPaise(wordCount) {
  return Math.max(wordCount, MINIMUM_WORDS) * PRICE_PER_WORD_PAISE;
}

// ---------------------------------------------------------------------------
// Safety floor
// ---------------------------------------------------------------------------

// Self-harm / poisoning patterns (English, Hindi, Marathi transliteration)
const SELF_HARM_RE = /poison|pesticide[\s\S]{0,30}swallow|swallow[\s\S]{0,30}pesticide|keet[\s\S]{0,10}naashak[\s\S]{0,10}pi|zeher[\s\S]{0,10}pi|zeher\s+pina|aatmahatya|suicide|self[\s-]harm|poisoning\s+symptom|zeher\s+ke\s+lakshan|zeher[\s\S]{0,10}lakshan|keet\s*naashak\s*kha|naashak\s+pi|pi\s+li[\s\S]{0,20}naashak/iu;

// Pesticide name / dose patterns
const PESTICIDE_NAMES_RE = /endosulfan|chlorpyrifos|monocrotophos|quinalphos|profenofos|cypermethrin|lambda[\s-]cyhalothrin|imidacloprid|acephate|malathion|dimethoate|phorate|carbofuran|methomyl|trichlorfon/iu;
const DOSE_RE = /\b(dose|dosage|kitni\s+maatra|kiti\s+dose|kitna\s+dalen|kiti\s+ghyavi|concentration|ml\s+per|gram\s+per|gm\s+per|litre\s+per)\b/iu;

const EMERGENCY_TELEGRAM =
  'STOP EMERGENCY STOP CALL 108 NOW STOP CALL 112 NOW STOP ' +
  'TELE-MANAS HELPLINE 14416 STOP DO NOT DELAY STOP GET HELP IMMEDIATELY STOP';

const KVK_REDIRECT_TELEGRAM =
  'CONSULT KVK EXPERT STOP PESTICIDE DOSE REQUIRES EXPERT ADVICE STOP ' +
  'CALL YOUR LOCAL KRISHI VIGYAN KENDRA STOP DO NOT SELF-MEDICATE CROPS STOP';

/**
 * Check text for safety-critical content.
 * @param {string} text
 * @returns {{ blocked: boolean, telegram?: string, reason?: string }}
 */
export function safetyFloor(text) {
  if (SELF_HARM_RE.test(text)) {
    console.log('SAFETY_FLOOR_TRIGGERED: self_harm');
    return { blocked: true, telegram: EMERGENCY_TELEGRAM, reason: 'self_harm' };
  }
  if (PESTICIDE_NAMES_RE.test(text) || DOSE_RE.test(text)) {
    console.log('SAFETY_FLOOR_TRIGGERED: pesticide_dose');
    return { blocked: true, telegram: KVK_REDIRECT_TELEGRAM, reason: 'pesticide_dose' };
  }
  return { blocked: false };
}

// ---------------------------------------------------------------------------
// Groq API call
// ---------------------------------------------------------------------------
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const PRIMARY_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_MODEL = 'openai/gpt-oss-20b';

const LANG_NAMES = { en: 'English', hi: 'Hindi', mr: 'Marathi' };

function buildSystemPrompt(lang) {
  const langName = LANG_NAMES[lang] || 'English';
  return (
    'You are a terse Indian agricultural telegram service from the 1960s. ' +
    'The farmer has written in ' + langName + '. ' +
    'Respond ONLY with a JSON object with exactly two keys: ' +
    '"telegram" (string) and "words" (number). ' +
    'The telegram value must be ALL UPPERCASE, ' +
    'use the word STOP to separate sentences, ' +
    'and contain at most 20 content words (STOPs do not count as words). ' +
    'Give practical farming advice. ' +
    'Do NOT mention any pesticide names, doses, or chemical compounds. ' +
    'Do NOT include self-harm or emergency information — that is handled separately. ' +
    'Example: {"telegram":"SPRAY NEEM OIL ON LEAVES STOP REPEAT AFTER SEVEN DAYS STOP","words":11}'
  );
}

async function callGroq(apiKey, model, userText, lang, url = GROQ_API_URL) {
  const isGroq = url === GROQ_API_URL;
  const body = JSON.stringify({
    model,
    ...(isGroq ? { reasoning_effort: 'low' } : {}),
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt(lang) },
      { role: 'user', content: userText },
    ],
    max_tokens: 1200,
    temperature: 0.3,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Groq ${model} returned ${res.status}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty model response');

  const parsed = JSON.parse(content.replace(/^```(json)?|```$/g, '').trim());
  if (typeof parsed.telegram === 'string') {
    // Count words in code; never trust the model's own count.
    parsed.words = parsed.telegram.toUpperCase().split(/\s+/).filter(w => w !== 'STOP' && w.length > 0).length;
  }
  if (typeof parsed.telegram !== 'string' || typeof parsed.words !== 'number') {
    throw new Error('Invalid model JSON shape');
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------
async function handleTelegram(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { text, lang = 'en' } = body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return jsonResponse({ error: 'text is required' }, 400);
  }
  if (text.length > 2000) {
    return jsonResponse({ error: 'text must be 2000 characters or fewer' }, 400);
  }
  if (!['en', 'hi', 'mr'].includes(lang)) {
    return jsonResponse({ error: 'lang must be en, hi, or mr' }, 400);
  }

  // Safety floor — checked BEFORE model call
  const safety = safetyFloor(text);
  if (safety.blocked) {
    const telegram = safety.telegram;
    const words = telegram.split(/\s+/).filter(w => w !== 'STOP' && w.length > 0).length;
    const morse = morseEncode(telegram);
    return jsonResponse({ telegram, words, cost_paise: costPaise(words), morse });
  }

  // Groq API
  const apiKey = env?.GROQ_API_KEY || '';
  if (!apiKey) {
    return jsonResponse({ error: 'GROQ_API_KEY not configured' }, 503);
  }

  let modelResult;
  try {
    modelResult = await callGroq(apiKey, PRIMARY_MODEL, text.trim(), lang);
  } catch (primaryErr) {
    console.warn('Primary model failed:', primaryErr.message, '— trying fallback');
    try {
      modelResult = await callGroq(apiKey, FALLBACK_MODEL, text.trim(), lang);
    } catch (fallbackErr) {
      try {
        if (!env?.GEMINI_API_KEY) throw fallbackErr;
        modelResult = await callGroq(env.GEMINI_API_KEY, 'gemini-3.5-flash-lite', text.trim(), lang, GEMINI_API_URL);
      } catch (geminiErr) {
      console.error('Fallback model also failed:', fallbackErr.message);
      const errorTelegram = 'SERVICE UNAVAILABLE STOP TRY AGAIN LATER STOP';
      return jsonResponse(
        {
          telegram: errorTelegram,
          words: 5,
          cost_paise: costPaise(5),
          morse: morseEncode(errorTelegram),
          error: 'Model unavailable',
        },
        502
      );
      }
    }
  }

  const { telegram, words } = modelResult;

  // Safety floor — checked AFTER model response too
  const postSafety = safetyFloor(telegram);
  if (postSafety.blocked) {
    const safeTelegram = postSafety.telegram;
    const safeWords = safeTelegram.split(/\s+/).filter(w => w !== 'STOP' && w.length > 0).length;
    return jsonResponse({
      telegram: safeTelegram,
      words: safeWords,
      cost_paise: costPaise(safeWords),
      morse: morseEncode(safeTelegram),
    });
  }

  const cost_paise = costPaise(words);
  const morse = morseEncode(telegram);

  return jsonResponse({ telegram, words, cost_paise, morse });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// ---------------------------------------------------------------------------
// Worker export
// ---------------------------------------------------------------------------
export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // API route
    if (request.method === 'POST' && url.pathname === '/api/telegram') {
      return handleTelegram(request, env);
    }

    // Static assets
    if (env?.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
