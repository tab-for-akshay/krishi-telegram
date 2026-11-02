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
 * Letter gap = 1 space, word gap = 3 spaces.
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
// Safety floor — language-aware
// ---------------------------------------------------------------------------

// Self-harm / poisoning patterns (English, Hindi, Marathi transliteration)
const SELF_HARM_RE = /poison|pesticide[\s\S]{0,30}swallow|swallow[\s\S]{0,30}pesticide|keet[\s\S]{0,10}naashak[\s\S]{0,10}pi|zeher[\s\S]{0,10}pi|zeher\s+pina|aatmahatya|suicide|self[\s-]harm|poisoning\s+symptom|zeher\s+ke\s+lakshan|zeher[\s\S]{0,10}lakshan|keet\s*naashak\s*kha|naashak\s+pi|pi\s+li[\s\S]{0,20}naashak/iu
// v2 (outside review): ingestion phrasing in English / Hinglish / Marathi, either word order
const INGEST_RE = /(drank|drink|drunk|drinking|ate|eaten|swallow\w*|consum\w*|pi\s*li|piya|pi\s*liya|pila|piyo|kha\s*li|khaya|khalla|pyayla|pyaala|pilay)[\s\S]{0,40}(pesticide|poison|insecticide|keet\s*n[a]+shak|zeh(e)?r|jahar|vish|kitaknashak|keetaknashak|daru\s*dawa)|(pesticide|poison|insecticide|keet\s*n[a]+shak|zeh(e)?r|jahar|vish|kitaknashak|keetaknashak)[\s\S]{0,40}(drank|drink|drunk|ate|eaten|swallow\w*|consum\w*|pi\s*li|piya|pi\s*liya|pila|kha\s*li|khaya|khalla|pyayla|pilay)/iu;

// Pesticide name / dose patterns
const EXTRA_HARM_RE = /(which|what|kaun\s*s[aie]|कौन\s*सा|कौनसा|कोणते|कोणता)[\s\S]{0,40}(pesticide|poison|insecticide|keet\s*nashak|कीटनाशक|कीटकनाशक|जहर|ज़हर|विष|दवा|औषध)[\s\S]{0,60}(drink|drinks|drunk|swallow|die|kill|पी|पिऊ|प्याय|मर|जीव)|(pesticide|poison|insecticide|कीटनाशक|कीटकनाशक|जहर|ज़हर|विष)[\s\S]{0,40}(if\s+a\s+person\s+drinks|if\s+someone\s+drinks|to\s+die|पीने\s*से|पीकर|पिऊन|प्यायल|प्यालो|प्याले|पी\s*लि|पी\s*ली|पिया|मरने|मरण|जीव\s*दे)|(पी\s*लिया|पी\s*ली|पिया|पीने|पीकर|प्यायल|प्यायले|प्यायला|पिऊन)[\s\S]{0,40}(कीटनाशक|कीटकनाशक|जहर|ज़हर|विष|दवा|स्प्रे|औषध)|(drank|drunk|swallowed|swallow|drinking)[\s\S]{0,40}(liquid|spray|bottle|tank|chemical)|(थक\s*गया|थक\s*गई|थक\s*चुका|परेशान|हार\s*गया|कंटाळलो|कंटाळले|थकलो|tired\s+of|can'?t\s+take)[\s\S]{0,80}(pesticide|poison|कीटनाशक|कीटकनाशक|जहर|ज़हर|विष|मर|die|dying)|आत्महत्या|खुदकुशी|ख़ुदकुशी|जान\s*दे|मर\s*जाना|मरना\s*चाह|जीना\s*नहीं|जीव\s*द्याय|मरायच|आयुष्य\s*संपव|end\s+it\s+all|no\s+reason\s+to\s+live|kill\s+(myself|me)\b|want\s+to\s+die|end\s+my\s+life/iu;
const DOSE_DEV_RE = /खुराक|डोस|किती\s*मिली|कितने\s*(ml|मिली|एमएल)|कितना\s*(ml|मिली)|मिली\s*प्रति|ml\s*प्रति|प्रति\s*(लिटर|लीटर)\s*किती|सटीक\s*मात्रा|नक्की\s*(प्रमाण|मात्रा)|क्लोरपायरीफॉस|क्लोरपायरीफास|इमिडाक्लोप्रिड|मोनोक्रोटोफॉस|मोनोक्रोटोफास|एंडोसल्फान|पैराक्वाट|पॅराक्वॅट|फोरेट|प्रोफेनोफॉस|सायपरमेथ्रिन|साइपरमेथ्रिन|ग्लायफोसेट|ग्लाइफोसेट|डायमिथोएट|एसीफेट|थायमेथोक्झाम/iu;
const PESTICIDE_NAMES_RE = /endosulfan|chlorpyrifos|monocrotophos|quinalphos|profenofos|cypermethrin|lambda[\s-]cyhalothrin|imidacloprid|acephate|malathion|dimethoate|phorate|carbofuran|methomyl|trichlorfon/iu;
const DOSE_RE = /\b(dose|dosage|kitni\s+maatra|kiti\s+dose|kitna\s+dalen|kiti\s+ghyavi|concentration|ml\s+per|gram\s+per|gm\s+per|litre\s+per)\b/iu;

/**
 * Safety telegrams per language (Roman script throughout so Morse works).
 * EN is the authoritative version; HI and MR are Romanized equivalents.
 */
export const KVK_NAMED = {
  en: d => `CONTACT KVK ${d} STOP PESTICIDE DOSE REQUIRES EXPERT ADVICE STOP DO NOT SELF-MEDICATE CROPS STOP`,
  hi: d => `KVK ${d} SE SAMPARK KAREN STOP KEETNAASHAK MAATRA KE LIYE VISHESHAGYA KI SALAH ZAROORI STOP KHUD SE DAWA MAT DALEN STOP`,
  mr: d => `KVK ${d} SHI SAMPARK KARA STOP KEETNAASHAK MATRESATHI TADNYANCHA SALLA AVASHYAK STOP SWATAHUN AUSHADH FAVARU NAKA STOP`,
};

export const SAFETY_TELEGRAMS = {
  emergency: {
    en: 'STOP EMERGENCY STOP CALL 108 NOW STOP CALL 112 NOW STOP TELE-MANAS HELPLINE 14416 STOP DO NOT DELAY STOP GET HELP IMMEDIATELY STOP',
    hi: 'STOP AAPAT STHITI STOP TURANT 108 PE CALL KAREN STOP 112 PE BHI CALL KAREN STOP TELE-MANAS 14416 STOP DERI MAT KAREN STOP TURANT MADAD LEN STOP',
    mr: 'STOP NADKAT STHITI STOP LAGECH 108 LA CALL KARA STOP 112 LA PAN CALL KARA STOP TELE-MANAS 14416 STOP USHEER KARU NAKA STOP LAGECH MADAD GYA STOP',
  },
  kvk: {
    en: 'CONSULT KVK EXPERT STOP PESTICIDE DOSE REQUIRES EXPERT ADVICE STOP CALL YOUR LOCAL KRISHI VIGYAN KENDRA STOP DO NOT SELF-MEDICATE CROPS STOP',
    hi: 'KVK EXPERT SE SALAH LEN STOP KEETNAASHAK MAATRA KE LIYE VISHESHAGYA CHAHIYE STOP APNE STHANIYA KRISHI VIGYAN KENDRA CALL KAREN STOP KHUD SE ILAJ MAT KAREN STOP',
    mr: 'KVK TAZAGYANIKANKADE JA STOP KEETNAASHAK MATRASATHI TAZAGYANIK LAGTO STOP TUMCHYA STHANIK KRISHI VIGYAN KENDRA LA CALL KARA STOP SWATAHOON UPCHAR KAR NAK STOP',
  },
};

/**
 * Fixed Devanagari safety telegrams for HI and MR.
 * These are shown as the `native` overlay when the safety floor triggers.
 */
export const SAFETY_NATIVE = {
  emergency: {
    hi: 'रुकें — आपातकाल — अभी 108 पर कॉल करें — 112 पर भी कॉल करें — टेली-मानस 14416 — देरी मत करें — तुरंत मदद लें',
    mr: 'थांबा — आणीबाणी — आत्ता 108 ला कॉल करा — 112 लाही कॉल करा — टेली-मानस 14416 — उशीर करू नका — लगेच मदत घ्या',
  },
  kvk: {
    hi: 'केवीके विशेषज्ञ से सलाह लें — कीटनाशक मात्रा के लिए विशेषज्ञ चाहिए — अपने स्थानीय कृषि विज्ञान केंद्र पर कॉल करें',
    mr: 'केव्हीके तज्ञांकडे जा — कीटकनाशक मात्रेसाठी तज्ञ लागतो — तुमच्या स्थानिक कृषी विज्ञान केंद्राला कॉल करा',
  },
};

/**
 * Check text for safety-critical content.
 * @param {string} text
 * @param {string} [lang='en']
 * @param {object|null} [kvkMatch=null]  Matched KVK entry for personalized pesticide referral
 * @returns {{ blocked: boolean, telegram?: string, reason?: string }}
 */
export function safetyFloor(text, lang = 'en', kvkMatch = null) {
  const safetyLang = ['en', 'hi', 'mr'].includes(lang) ? lang : 'en';

  if (SELF_HARM_RE.test(text) || INGEST_RE.test(text) || EXTRA_HARM_RE.test(text)) {
    console.log('SAFETY_FLOOR_TRIGGERED: self_harm');
    return {
      blocked: true,
      telegram: SAFETY_TELEGRAMS.emergency[safetyLang],
      native: (safetyLang === 'hi' || safetyLang === 'mr') ? SAFETY_NATIVE.emergency[safetyLang] : null,
      reason: 'self_harm',
    };
  }
  if (PESTICIDE_NAMES_RE.test(text) || DOSE_RE.test(text) || DOSE_DEV_RE.test(text)) {
    console.log('SAFETY_FLOOR_TRIGGERED: pesticide_dose');
    let telegram;
    if (kvkMatch && kvkMatch.district) {
      const distUp = kvkMatch.district.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
      telegram = KVK_NAMED[safetyLang](distUp);
    } else {
      telegram = SAFETY_TELEGRAMS.kvk[safetyLang];
    }
    return {
      blocked: true,
      telegram,
      native: (safetyLang === 'hi' || safetyLang === 'mr') ? SAFETY_NATIVE.kvk[safetyLang] : null,
      reason: 'pesticide_dose',
    };
  }
  return { blocked: false };
}

// ---------------------------------------------------------------------------
// KVK lookup
// ---------------------------------------------------------------------------

/**
 * Find KVK entries matching state and district.
 *
 * Match algorithm:
 * 1. Filter by state (case-insensitive exact match).
 * 2. Among those, find entries where entry.district (if set) contains the
 *    supplied district as a substring, OR the kvk/host text contains it.
 * 3. Return the first match, or null.
 *
 * @param {object} kvkData  Parsed kvk.json content
 * @param {string} state
 * @param {string} district
 * @returns {{ state: string, district: string|null, kvk: string, host: string, source: string }|null}
 */
export function findKvk(kvkData, state, district) {
  if (!kvkData || !Array.isArray(kvkData.kvks)) return null;
  if (!state || !district) return null;

  const stateNorm = state.trim().toLowerCase();
  const distNorm = district.trim().toLowerCase();

  if (!stateNorm || !distNorm) return null;

  // Filter by state
  const stateMatches = kvkData.kvks.filter(
    k => k.state && k.state.toLowerCase() === stateNorm
  );
  if (stateMatches.length === 0) return null;

  // Find best district match
  const distMatch = stateMatches.find(k => {
    if (k.district && k.district.toLowerCase().includes(distNorm)) return true;
    // Also search in kvk address text as fallback
    if (k.kvk && k.kvk.toLowerCase().includes(distNorm)) return true;
    return false;
  });

  return distMatch || null;
}

// ---------------------------------------------------------------------------
// Groq API call
// ---------------------------------------------------------------------------
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const INCEPTION_API_URL = 'https://api.inceptionlabs.ai/v1/chat/completions';
const PRIMARY_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_MODEL = 'openai/gpt-oss-20b';

const LANG_NAMES = { en: 'English', hi: 'Hindi', mr: 'Marathi' };
const LANG_SCRIPT_NOTE = {
  en: '',
  hi: ' Write the telegram in Hindi but use ROMAN LETTERS ONLY (A-Z, digits, spaces) — no Devanagari script. This is required so it can be transmitted as Morse code.',
  mr: ' Write the telegram in Marathi but use ROMAN LETTERS ONLY (A-Z, digits, spaces) — no Devanagari script. This is required so it can be transmitted as Morse code.',
};

function buildSystemPrompt(lang) {
  const langName = LANG_NAMES[lang] || 'English';
  const langRule = lang === 'hi'
    ? 'Write the telegram in HINDI using Roman letters (Hinglish spelling), NOT in English, e.g. "SAFED MAKKHI SE PATTA MOD VIRUS STOP PRABHAVIT PAUDHE UKHADEN STOP PEELA CHIPCHIPA TRAP LAGAYEN STOP". '
    : lang === 'mr'
    ? 'Write the telegram in MARATHI using Roman letters, NOT in English, e.g. "PANDHRYA MASHIMULE PAN GUNDALNE VIRUS STOP BADHIT ROPE UPTUN TAKA STOP PIVLE CHIKAT SAPLE LAVA STOP". '
    : 'Write the telegram in plain English. ';
  const nativeField = (lang === 'hi' || lang === 'mr')
    ? ' Also add a "native" key with the same advisory in Devanagari script (Unicode, proper ' + (lang === 'hi' ? 'Hindi' : 'Marathi') + ').'
    : '';
  const jsonShape = (lang === 'hi' || lang === 'mr')
    ? '"telegram" (string), "words" (number), "cause" (string, in English), "native" (string, Devanagari)'
    : '"telegram" (string), "words" (number) and "cause" (string, in English)';
  return (
    'You are a terse Indian agricultural telegram service from the 1960s, advising smallholder farmers. ' +
    'The farmer chose ' + langName + '. ' + langRule +
    'Use only letters A-Z, digits and spaces (no Devanagari, no punctuation) in the "telegram" field. ' +
    'Respond ONLY with a JSON object with exactly these keys: ' + jsonShape + '.' + nativeField + ' ' +
    'First decide the single most likely cause for the symptoms in Indian field conditions: think of the common pests, viral diseases spread by insects (for example leaf curl virus spread by whitefly when leaves curl in tomato, chilli or cotton), fungal and bacterial diseases, and only then nutrient deficiency or water stress. Name it specifically in "cause". ' +
    'The telegram must be ALL UPPERCASE, use STOP to separate sentences, contain at most 20 content words (STOPs do not count), and begin with the cause. ' +
    'Give practical, safe, low-cost actions (cultural, mechanical, biological, sticky traps, neem-based, removing infected plants, seeking KVK confirmation). ' +
    'Do NOT mention any chemical pesticide or fungicide names, doses or compounds. ' +
    'Do NOT include self-harm or emergency information; that is handled separately. ' +
    (lang === 'hi'
      ? 'Example: {"telegram":"SAFED MAKKHI SE PATTA MOD VIRUS STOP MUDE PAUDHE UKHAADEN STOP PEELE CHIPCHIPE TRAP LAGAYEN STOP NEEM TEL CHHIDKEN STOP","words":16,"cause":"LEAF CURL VIRUS (WHITEFLY)","native":"सफेद मक्खी से पत्ता मोड़ वायरस स्टॉप मुड़े पौधे उखाड़ें स्टॉप पीले चिपचिपे ट्रैप लगाएं स्टॉप नीम तेल छिड़कें"}. Every word in "telegram" except STOP, KVK and numbers must be Hindi. "native" must be Devanagari script.'
      : lang === 'mr'
      ? 'Example: {"telegram":"PANDHRI MASHI PAN GUNDALNE VIRUS STOP GUNDALLELI ROPE UPTUN TAKA STOP PIVLE CHIKAT SAPLE LAVA STOP NEEM TEL FAVARA STOP","words":16,"cause":"LEAF CURL VIRUS (WHITEFLY)","native":"पांढरी माशी पान गुंडाळणे व्हायरस स्टॉप गुंडाळलेली रोपे उपटून टाका स्टॉप पिवळे चिकट सापळे लावा स्टॉप नीम तेल फवारा"}. Every word in "telegram" except STOP, KVK and numbers must be Marathi. "native" must be Devanagari script.'
      : 'Example: {"telegram":"WHITEFLY LEAF CURL VIRUS STOP UPROOT CURLED PLANTS STOP SET YELLOW STICKY TRAPS STOP SPRAY NEEM OIL STOP","words":14,"cause":"LEAF CURL VIRUS (WHITEFLY)"}')
  );
}

const EN_WORDS = /\b(THE|AND|REMOVE|APPLY|SPRAY|PLANTS?|LEAVES|WATER|SOIL|USE|WITH|FOR|INFECTED|TRAPS?|CROPS?)\b/g;
export function looksEnglish(t) { const w = t.split(/\s+/).filter(x => x && x !== 'STOP'); const hits = (t.match(EN_WORDS) || []).length; return w.length > 0 && hits / w.length > 0.25; }

async function callGroq(apiKey, model, userText, lang, url = GROQ_API_URL) {
  const r = await callGroqOnce(apiKey, model, userText, lang, url);
  if (lang !== 'en' && looksEnglish(r.telegram)) {
    const again = await callGroqOnce(apiKey, model, userText + '\n\n(Reply language: ' + (LANG_NAMES[lang] || lang) + ' in Roman letters, not English.)', lang, url);
    if (!looksEnglish(again.telegram)) return again;
  }
  return r;
}

async function callGroqOnce(apiKey, model, userText, lang, url = GROQ_API_URL) {
  const isGroq = url === GROQ_API_URL;
  const body = JSON.stringify({
    model,
    ...(isGroq ? { reasoning_effort: 'low' } : {}),
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt(lang) },
      { role: 'user', content: userText },
    ],
    max_tokens: isGroq ? 1200 : 3000,
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

  // Validate required fields
  if (typeof parsed.telegram !== 'string') {
    throw new Error('Invalid model JSON shape: missing telegram');
  }
  if (typeof parsed.cause !== 'string' || parsed.cause.trim() === '') {
    throw new Error('Model response missing cause field');
  }

  // Validate native field: must contain at least one Devanagari character
  if (parsed.native !== undefined) {
    if (typeof parsed.native !== 'string' || !/[\u0900-\u097F]/.test(parsed.native)) {
      parsed.native = null; // hide invalid native
    }
  }

  // Count words in code; never trust the model's own count.
  parsed.words = parsed.telegram.toUpperCase().split(/\s+/).filter(w => w !== 'STOP' && w.length > 0).length;

  return parsed;
}

// ---------------------------------------------------------------------------
// KVK data loader (cached in module scope)
// ---------------------------------------------------------------------------
let _kvkData = null;

async function loadKvkData(env) {
  if (_kvkData) return _kvkData;
  try {
    if (env?.ASSETS) {
      const kvkUrl = new URL('/data/kvk.json', 'https://placeholder.internal');
      const res = await env.ASSETS.fetch(new Request(kvkUrl.toString()));
      if (res.ok) {
        _kvkData = await res.json();
      }
    }
  } catch (err) {
    console.warn('Could not load kvk.json via ASSETS:', err.message);
  }
  return _kvkData;
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------
// Per-visitor limit (red-team fix, 2 Nov 2026): /api/telegram calls paid-for-by-quota models, so cap it.
const RL = new Map();
function rateLimited(request, max = 20, windowMs = 10 * 60 * 1000) {
  const ip = (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim();
  const now = Date.now(); const hits = (RL.get(ip) || []).filter(t => now - t < windowMs);
  if (hits.length >= max) { RL.set(ip, hits); return true; }
  hits.push(now); RL.set(ip, hits);
  if (RL.size > 5000) RL.delete(RL.keys().next().value);
  return false;
}

async function handleTelegram(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { text, lang = 'en', state = '', district = '' } = body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return jsonResponse({ error: 'text is required' }, 400);
  }
  if (text.length > 2000) {
    return jsonResponse({ error: 'text must be 2000 characters or fewer' }, 400);
  }
  if (!['en', 'hi', 'mr'].includes(lang)) {
    return jsonResponse({ error: 'lang must be en, hi, or mr' }, 400);
  }

  // Load KVK data and find match
  const kvkData = await loadKvkData(env);
  const kvkMatch = (kvkData && state && district)
    ? findKvk(kvkData, state, district)
    : null;

  // Safety floor — checked BEFORE model call
  const safety = safetyFloor(text, lang, kvkMatch);
  if (safety.blocked) {
    const telegram = safety.telegram;
    const words = telegram.split(/\s+/).filter(w => w !== 'STOP' && w.length > 0).length;
    const morse = morseEncode(telegram);
    return jsonResponse({
      telegram,
      words,
      cost_paise: costPaise(words),
      morse,
      native: safety.native || null,
      kvk: kvkMatch ? { district: kvkMatch.district, kvk: kvkMatch.kvk, host: kvkMatch.host, source: kvkMatch.source } : null,
    });
  }

  // Groq API
  const apiKey = env?.GROQ_API_KEY || '';
  if (!apiKey) {
    return jsonResponse({ error: 'GROQ_API_KEY not configured' }, 503);
  }

  // v2: model chain per language. Outside review + our own A/B (1 Nov 2026): gpt-oss failed JSON
  // validation on Romanized Marathi, gemini-3.5-flash wrote the clearest Marathi telegrams.
  const gem = env?.GEMINI_API_KEY;
  const chain = lang === 'mr'
    ? [[gem, 'gemini-3.5-flash', GEMINI_API_URL], [apiKey, PRIMARY_MODEL, GROQ_API_URL], [gem, 'gemini-3.5-flash-lite', GEMINI_API_URL]]
    : [[apiKey, PRIMARY_MODEL, GROQ_API_URL], [apiKey, FALLBACK_MODEL, GROQ_API_URL], [gem, 'gemini-3.5-flash-lite', GEMINI_API_URL]];
  // Red-team fix (2 Nov 2026): every model above shares one free daily quota; when it is used up the demo
  // answered 502. Two more free routes on separate quotas before giving up.
  chain.push([apiKey, 'qwen/qwen3.8-27b', GROQ_API_URL], [env?.INCEPTION_API_KEY, 'mercury-3', INCEPTION_API_URL]);
  let modelResult, modelUsed, lastErr;
  for (const [key, model, url] of chain) {
    if (!key) continue;
    try { modelResult = await callGroq(key, model, text.trim(), lang, url); modelUsed = model; break; }
    catch (e) { lastErr = e; console.warn('Model failed:', model, e.message); }
  }
  if (!modelResult) {
    console.error('All models failed:', lastErr && lastErr.message);
    const errorTelegram = 'SERVICE UNAVAILABLE STOP TRY AGAIN LATER STOP';
    return jsonResponse({ telegram: errorTelegram, words: 5, cost_paise: costPaise(5), morse: morseEncode(errorTelegram), kvk: null, error: 'Model unavailable' }, 502);
  }

  const { telegram, words, cause } = modelResult;
  const model = modelUsed;

  // Safety floor — checked AFTER model response too
  const postSafety = safetyFloor(telegram, lang, kvkMatch);
  if (postSafety.blocked) {
    const safeTelegram = postSafety.telegram;
    const safeWords = safeTelegram.split(/\s+/).filter(w => w !== 'STOP' && w.length > 0).length;
    return jsonResponse({
      telegram: safeTelegram,
      words: safeWords,
      cost_paise: costPaise(safeWords),
      morse: morseEncode(safeTelegram),
      native: postSafety.native || null,
      kvk: kvkMatch ? { district: kvkMatch.district, kvk: kvkMatch.kvk, host: kvkMatch.host, source: kvkMatch.source } : null,
    });
  }

  const cost_paise = costPaise(words);
  const morse = morseEncode(telegram);

  // Validate native field from model
  const nativeRaw = modelResult.native;
  const native = (typeof nativeRaw === 'string' && /[\u0900-\u097F]/.test(nativeRaw)) ? nativeRaw : null;

  return jsonResponse({
    telegram,
    words,
    cost_paise,
    morse,
    cause: cause || null,
    native,
    model,
    kvk: kvkMatch ? { district: kvkMatch.district, kvk: kvkMatch.kvk, host: kvkMatch.host, source: kvkMatch.source } : null,
  });
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
      if (rateLimited(request)) return jsonResponse({ error: 'Too many telegrams from your network. Please wait a few minutes and try again.' }, 429);
      return handleTelegram(request, env);
    }

    // Static assets
    if (env?.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
