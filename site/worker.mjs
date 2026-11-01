/**
 * Krishi Telegram — Cloudflare Worker
 * Serves static assets and the API. Branch `otari`: every model call goes through Otari (otari.ai).
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
const DOSE_RE = /\b(dose|dosage|kitni\s+maatra|kiti\s+dose|kitna\s+dalen|kiti\s+ghyavi|concentration|ml\s+per|gram\s+per|gm\s+per|litre\s+per(?!\s+(?:hour|hr|minute|min|second|sec|day)\b))\b/iu;

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
// Otari gateway (hackathon branch `otari`)
//
// Before this branch the worker called Groq and Gemini directly with a
// hand-written fallback chain and per-language model routing. Every model call
// now goes through Mozilla's Otari gateway (https://otari.ai) with ONE key:
//   * routing policies own model choice + failover (krishi-diagnose, ...)
//   * a monthly spend ceiling on the key + a budget tier-down inside the policy
//   * a per-farmer daily budget (service key + end users)
//   * Otari web search for sources, Otari code execution for field maths
//   * an MCP server (our own KVK directory) that Otari calls for the model
//   * an organisation guardrail (our safety floor, served at /guard/validate)
//   * a second, private route: Tab's self-hosted abliterated open model,
//     registered in Otari as an org provider key (llamacpp)
// ---------------------------------------------------------------------------
const OTARI_BASE = 'https://otari.ai/api/v1';
const SECRETS = {}; // filled at publish time only (never committed)
export const POLICY = {
  diagnose: 'krishi-diagnose',   // Qwen3-235B-A22B-Instruct -> Llama-3.3-70B -> Gemma-3-27B; tier-down to Gemma at 80% budget
  telegraph: 'krishi-telegraph', // Gemma-3-27B -> Gemma-3-12B -> Llama-3.3-70B (Roman Hindi / Marathi writer)
  judge: 'krishi-judge',         // Qwen3Guard-Gen-8B -> Llama-Guard-4-12B (safety judge on the advice)
  calc: 'krishi-calc',           // Qwen3.5-35B-A3B + otari_code_execution
  private: 'krishi-private',     // Huihui-Qwythos-9B (self-hosted, llama.cpp) -> Qwen3-235B -> Gemma-3-27B
  research: 'krishi-research',  // Qwen3-235B-A22B-Instruct -> Qwen3.5-35B (web search + MCP tool use)
  locate: 'krishi-locate',       // Mistral-Small-3.2-24B -> Qwen3-235B (calls our KVK MCP server)         // same tool-capable model, calls our KVK MCP server through Otari
};
export const PRIVATE_MODEL = 'llamacpp:huihui-qwythos-9b-abliterated-q4k';
const PRIVATE_HEALTH = 'https://tab-llm-p76jwv764jr9crggw-8080.app.github.dev/health';

function secret(env, k) { return (env && env[k]) || SECRETS[k] || ''; }

async function sha16(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s)));
  return [...new Uint8Array(d)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function farmerUser(farmerId) {
  const id = String(farmerId || '').slice(0, 80);
  return id ? 'farmer:' + (await sha16('krishi|' + id)) : 'farmer:anonymous';
}

/**
 * One Otari chat call. Returns { ok, status, data, content, trace, error }.
 * trace is what Otari told us in its response headers: which real model
 * served the policy, whether a fallback ran, attempts, latency and cost.
 */
export async function otari(env, body, { role, user, timeoutMs = 27000, extraHeaders = {}, tags = {}, keyName = 'OTARI_KEY' } = {}) {
  const key = secret(env, keyName);
  const t0 = Date.now();
  const trace = { role, requested: body.model };
  if (!key) return { ok: false, status: 503, error: 'OTARI_KEY not configured', trace };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(OTARI_BASE + '/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key, ...extraHeaders },
      body: JSON.stringify({ ...body, ...(user ? { user } : {}), metadata: { app: 'krishi-telegram', role, ...tags } }),
    });
  } catch (e) {
    clearTimeout(timer);
    trace.ms = Date.now() - t0; trace.error = e.name === 'AbortError' ? 'timeout' : 'network';
    return { ok: false, status: 0, error: trace.error, trace };
  }
  clearTimeout(timer);
  const h = n => res.headers.get(n);
  Object.assign(trace, {
    status: res.status,
    served: h('Otari-Provider') ? `${h('Otari-Provider')}:${h('Otari-Model')}` : null,
    fallback: h('Otari-Fallback') === 'true',
    attempts: Number(h('Otari-Attempt-Count') || 0) || null,
    request_id: h('Otari-Request-ID'),
    guardrails: h('Otari-Guardrails') || null,
    end_user_budget: h('Otari-End-User-Budget') ? true : undefined,
    error_code: h('Otari-Error-Code') || undefined,
    budget_scope: h('Otari-Budget-Scope') || undefined,
  });
  let data = null; let text = '';
  try { text = await res.text(); data = JSON.parse(text); } catch { data = null; }
  trace.ms = Date.now() - t0;
  if (!res.ok || !data) {
    trace.error = (data && (data.detail || data.error?.message)) || `HTTP ${res.status}`;
    if (typeof trace.error !== 'string') trace.error = JSON.stringify(trace.error).slice(0, 200);
    return { ok: false, status: res.status, data, error: trace.error, trace };
  }
  trace.cost_usd = data.usage?.cost_usd ? Number(data.usage.cost_usd) : null;
  // Gateway-run tools (code execution, web search) are billed on top of tokens: cost_usd minus the token estimate.
  if (trace.cost_usd != null && data.usage?.estimated_cost != null) { const fee = trace.cost_usd - Number(data.usage.estimated_cost); if (fee > 0.0005) trace.tool_fee_usd = Math.round(fee * 1e6) / 1e6; }
  trace.tokens = data.usage?.total_tokens ?? null;
  const content = data.choices?.[0]?.message?.content || '';
  return { ok: true, status: res.status, data, content, trace };
}

/** Streaming variant, used for the slow private model (keeps bytes flowing). */
export async function otariStream(env, body, { role, user, timeoutMs = 90000 } = {}) {
  const key = secret(env, 'OTARI_KEY');
  const t0 = Date.now();
  const trace = { role, requested: body.model, stream: true };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(OTARI_BASE + '/chat/completions', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({ ...body, stream: true, stream_options: { include_usage: true }, ...(user ? { user } : {}), metadata: { app: 'krishi-telegram', role } }),
    });
    const h = n => res.headers.get(n);
    Object.assign(trace, { status: res.status, served: h('Otari-Provider') ? `${h('Otari-Provider')}:${h('Otari-Model')}` : null, request_id: h('Otari-Request-ID'), fallback: h('Otari-Fallback') === 'true', attempts: Number(h('Otari-Attempt-Count') || 0) || null, guardrails: h('Otari-Guardrails') || null });
    if (!res.ok || !res.body) { trace.error = `HTTP ${res.status}`; trace.ms = Date.now() - t0; return { ok: false, status: res.status, error: trace.error, trace }; }
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''; let content = '';
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i; while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith('data:') || line === 'data: [DONE]') continue;
        try { const j = JSON.parse(line.slice(5)); for (const c of j.choices || []) content += c.delta?.content || ''; if (j.usage?.cost_usd) trace.cost_usd = Number(j.usage.cost_usd); } catch { /* keep-alive */ }
      }
    }
    clearTimeout(timer); trace.ms = Date.now() - t0;
    return { ok: !!content, status: res.status, content, trace, error: content ? undefined : 'empty' };
  } catch (e) {
    clearTimeout(timer); trace.ms = Date.now() - t0; trace.error = e.name === 'AbortError' ? 'timeout' : 'network';
    return { ok: false, status: 0, error: trace.error, trace };
  }
}

export function parseJsonLoose(s) {
  if (!s) return null;
  const t = String(s).replace(/^```(json)?/m, '').replace(/```\s*$/m, '').trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const a = t.indexOf('{'); const b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; } }
  return null;
}

export function telegramWords(t) { return String(t).toUpperCase().split(/\s+/).filter(w => w !== 'STOP' && w.length > 0).length; }
export function cleanTelegram(t) {
  return String(t || '').toUpperCase().replace(/[^A-Z0-9 \-]/g, ' ').replace(/\s+/g, ' ').trim();
}

const LANG_NAMES = { en: 'English', hi: 'Hindi', mr: 'Marathi' };

// Role 1 — diagnose (English, structured). Open-weight reasoning model via policy.
export function diagnosePrompt() {
  return 'You are an Indian agricultural extension officer advising a smallholder farmer by telegram. ' +
    'First decide the single most likely cause of the symptoms in Indian field conditions: consider common insect pests, viral diseases spread by insects ' +
    '(for example leaf curl virus spread by whitefly when leaves curl in tomato, chilli or cotton), fungal and bacterial diseases, and only then nutrient deficiency or water stress. ' +
    'Give practical, safe, low-cost actions: cultural, mechanical, biological, sticky traps, neem-based sprays, removing infected plants, resistant varieties, field sanitation, and confirming with the local Krishi Vigyan Kendra (KVK). ' +
    'Never name any chemical pesticide or fungicide product, compound or quantity of chemical. ' +
    'Reply ONLY with JSON: {"cause": string (specific, in English, e.g. "RICE BLAST (MAGNAPORTHE ORYZAE)"), "crop": string, "actions": [up to 4 short English imperative phrases], ' +
    '"telegram_en": string (ALL CAPS English telegram, letters A-Z, digits and spaces only, sentences separated by STOP, at most 20 words not counting STOP, beginning with the cause)}.';
}

// Role 2 — telegraph (Roman Hindi / Marathi writer). Different open model.
export function telegraphPrompt(lang) {
  const name = LANG_NAMES[lang] || 'English';
  const ex = lang === 'mr'
    ? 'Example: {"telegram":"PANDHRI MASHI PAN GUNDALNE VIRUS STOP GUNDALLELI ROPE UPTUN TAKA STOP PIVLE CHIKAT SAPLE LAVA STOP NEEM TEL FAVARA STOP"}'
    : 'Example: {"telegram":"SAFED MAKKHI SE PATTA MOD VIRUS STOP MUDE PAUDHE UKHAADEN STOP PEELE CHIPCHIPE TRAP LAGAYEN STOP NEEM TEL CHHIDKEN STOP"}';
  return `You are a telegraph clerk. Rewrite the English farm advice you are given as a telegram in ${name.toUpperCase()} written in ROMAN LETTERS ONLY (no Devanagari, no English sentences). ` +
    'Keep the same cause and the same actions; do not add any new advice. ALL CAPS, letters A-Z, digits and spaces only, separate sentences with STOP, at most 20 words not counting STOP, begin with the cause. ' +
    `The words STOP, KVK and numbers stay as they are; every other word must be ${name}. ` + ex + ' Reply ONLY with JSON {"telegram": string}.';
}

// Role 3 — judge (safety classifier models: Qwen3Guard / Llama Guard).
export function judgeVerdict(content) {
  const c = String(content || '').toLowerCase();
  if (!c.trim()) return { safe: null, label: 'empty' };
  if (/safety:\s*unsafe|safety:\s*controversial|^\s*unsafe/m.test(c)) return { safe: false, label: c.replace(/\s+/g, ' ').trim().slice(0, 80) };
  if (/safety:\s*safe|^\s*safe/m.test(c)) return { safe: true, label: 'safe' };
  return { safe: null, label: c.slice(0, 60) };
}

// Role 4 — locate the farmer's KVK through our MCP server (when no dropdown choice).
/** Short prompt for the small self-hosted CPU model: fewer prompt tokens = faster first token. */
export function privatePrompt() {
  return 'You are a crop doctor for Indian farmers. Name the most likely cause. Never name a chemical or a dose. ' +
    'Reply ONLY with JSON {"cause": string (CAPS), "actions": [3 short CAPS strings], "telegram_en": string (CAPS, A-Z digits spaces, STOP between sentences, max 20 words not counting STOP, end with CONSULT KVK STOP)}.';
}

export function locatePrompt() {
  return 'The user is an Indian farmer. If their message names a place in India (village, taluka, town or district), call the find_kvk tool with the most likely state and district, plus the town or taluka as place when one is named. Pick the result whose address is in or nearest that place. ' +
    'Reply ONLY with JSON {"state": string|null, "district": string|null, "kvk": string|null, "host": string|null} copied from the tool result; if no place is named or the tool finds nothing, reply {"state":null,"district":null,"kvk":null,"host":null}.';
}

export function looksLikePlace(text) {
  // Only when the farmer actually names a place: a place word followed by a capitalised name.
  return /\b(district|dist\.?|taluka|taluk|tehsil|tahsil|village|gaon|gav|jilla|zilla|jilha|near|from|in|at|mandal|block)\s+[A-Z][a-z]{2,}/.test(text);
}

async function runDiagnose(env, text, { privateRoute, user }) {
  const body = {
    messages: [{ role: 'system', content: diagnosePrompt() }, { role: 'user', content: text }],
    max_tokens: 700, temperature: 0.3,
  };
  if (privateRoute) {
    // Policy krishi-private: Tab's self-hosted model first; Otari itself falls over to Qwen3-235B, then Gemma.
    const r = await otariStream(env, { ...body, model: POLICY.private, messages: [{ role: 'system', content: privatePrompt() }, { role: 'user', content: text }], max_tokens: 160, reasoning_effort: 'none' }, { role: 'diagnose-private', user, timeoutMs: 55000 });
    const j = r.ok ? parseJsonLoose(r.content) : null;
    if (j && j.cause && j.telegram_en) return { j, traces: [r.trace] };
    r.trace.note = 'private route gave no usable answer; the normal diagnose policy takes over';
    const r2 = await otari(env, { ...body, model: POLICY.diagnose, response_format: { type: 'json_object' } }, { role: 'diagnose', user });
    return { j: r2.ok ? parseJsonLoose(r2.content) : null, traces: [r.trace, r2.trace], err: r2 };
  }
  const r = await otari(env, { ...body, model: POLICY.diagnose, response_format: { type: 'json_object' } }, { role: 'diagnose', user });
  return { j: r.ok ? parseJsonLoose(r.content) : null, traces: [r.trace], err: r };
}

async function runTelegraph(env, advice, lang, user) {
  const body = {
    model: POLICY.telegraph,
    messages: [{ role: 'system', content: telegraphPrompt(lang) }, { role: 'user', content: advice }],
    max_tokens: 400, temperature: 0.3, response_format: { type: 'json_object' },
  };
  const traces = [];
  let r = await otari(env, body, { role: 'telegraph', user, tags: { lang } });
  traces.push(r.trace);
  let j = r.ok ? parseJsonLoose(r.content) : null;
  if (j && j.telegram && looksEnglish(cleanTelegram(j.telegram))) {
    r = await otari(env, { ...body, messages: [...body.messages, { role: 'assistant', content: r.content }, { role: 'user', content: `That is English. Rewrite it in ${LANG_NAMES[lang]} (Roman letters).` }] }, { role: 'telegraph-retry', user, tags: { lang } });
    traces.push(r.trace);
    const j2 = r.ok ? parseJsonLoose(r.content) : null;
    if (j2 && j2.telegram) j = j2;
  }
  return { telegram: j && j.telegram ? cleanTelegram(j.telegram) : null, traces };
}

async function runJudge(env, adviceText, user) {
  const r = await otari(env, { model: POLICY.judge, messages: [{ role: 'user', content: 'Advice a farm helpline is about to send to a farmer: ' + adviceText }], max_tokens: 40 }, { role: 'judge', user, timeoutMs: 15000 });
  const v = r.ok ? judgeVerdict(r.content) : { safe: null, label: r.error || 'unavailable' };
  r.trace.verdict = v.label;
  return { verdict: v, trace: r.trace, blockedByGuardrail: r.status === 403 };
}

async function runLocate(env, text, user) {
  const mcpId = secret(env, 'KVK_MCP_ID');
  if (!mcpId) return { kvk: null, trace: null };
  const r = await otari(env, {
    model: POLICY.locate,
    messages: [{ role: 'system', content: locatePrompt() }, { role: 'user', content: text }],
    mcp_server_ids: [mcpId], max_tool_iterations: 3, max_tokens: 600, temperature: 0,
  }, { role: 'locate-mcp', user, timeoutMs: 26000 });
  const j = r.ok ? parseJsonLoose(r.content) : null;
  r.trace.mcp = 'kvk-directory';
  return { kvk: j && j.kvk ? j : null, trace: r.trace };
}

const EN_WORDS = /\b(THE|AND|REMOVE|APPLY|SPRAY|PLANTS?|LEAVES|WATER|SOIL|USE|WITH|FOR|INFECTED|TRAPS?|CROPS?)\b/g;
export function looksEnglish(t) { const w = t.split(/\s+/).filter(x => x && x !== 'STOP'); const hits = (t.match(EN_WORDS) || []).length; return w.length > 0 && hits / w.length > 0.25; }

export function sumCost(traces) {
  const v = traces.filter(Boolean).reduce((a, t) => a + (Number(t.cost_usd) || 0), 0);
  return Math.round(v * 1e6) / 1e6;
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
// Request handlers
// ---------------------------------------------------------------------------
function kvkOut(k) { return k ? { district: k.district, kvk: k.kvk, host: k.host, source: k.source, via: k.via } : null; }

function telegramReply(telegram, extra = {}) {
  const words = telegramWords(telegram);
  return { telegram, words, cost_paise: costPaise(words), morse: morseEncode(telegram), ...extra };
}

/** Map an Otari refusal to a telegram the farmer can act on. */
function refusalTelegram(r, lang) {
  const code = r?.trace?.error_code || '';
  const msg = String(r?.error || '');
  if (r?.status === 429 || /budget|limit|insufficient/i.test(msg + code)) {
    const t = { en: 'DAILY FREE TELEGRAMS USED STOP TRY AGAIN TOMORROW STOP FOR URGENT HELP CALL KISAN CALL CENTRE 1800 180 1551 STOP',
      hi: 'AAJ KE MUFT TELEGRAM KHATAM STOP KAL PHIR KOSHISH KAREN STOP TURANT MADAD KE LIYE KISAN CALL CENTRE 1800 180 1551 STOP',
      mr: 'AAJCHE MOFAT TELEGRAM SAMPLE STOP UDYA PUNHA PRAYATNA KARA STOP TATKAL MADATISATHI KISAN CALL CENTRE 1800 180 1551 STOP' };
    return { telegram: t[lang] || t.en, reason: 'budget' };
  }
  return null;
}

async function handleTelegram(request, env) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON body' }, 400); }
  const { text, lang = 'en', state = '', district = '', farmer = '', route = 'otari', floor = 'code' } = body;
  if (!text || typeof text !== 'string' || text.trim().length === 0) return jsonResponse({ error: 'text is required' }, 400);
  if (text.length > 2000) return jsonResponse({ error: 'text must be 2000 characters or fewer' }, 400);
  if (!['en', 'hi', 'mr'].includes(lang)) return jsonResponse({ error: 'lang must be en, hi, or mr' }, 400);
  const user = await farmerUser(farmer);
  const traces = [];

  const kvkData = await loadKvkData(env);
  let kvkMatch = (kvkData && state && district) ? findKvk(kvkData, state, district) : null;
  if (kvkMatch) kvkMatch = { ...kvkMatch, via: 'dropdown' };

  // Safety floor in code, BEFORE any model call. (floor:"otari" skips it so the
  // Otari organisation guardrail — the same rules, served at /guard/validate — is what stops the request.)
  if (floor !== 'otari') {
    const safety = safetyFloor(text, lang, kvkMatch);
    if (safety.blocked) return jsonResponse(telegramReply(safety.telegram, { native: safety.native || null, kvk: kvkOut(kvkMatch), safety: safety.reason, stopped_by: 'code floor', trace: [], otari_cost_usd: 0 }));
  }

  // Diagnose and (when no KVK chosen) locate the farmer's KVK via MCP, in parallel.
  const wantLocate = !kvkMatch && looksLikePlace(text);
  const [diag, loc] = await Promise.all([
    runDiagnose(env, text.trim(), { privateRoute: route === 'private', user }),
    wantLocate ? runLocate(env, text.trim(), user) : Promise.resolve({ kvk: null, trace: null }),
  ]);
  traces.push(...diag.traces); if (loc.trace) traces.push(loc.trace);
  if (!kvkMatch && loc.kvk && kvkData) {
    // Only trust a KVK that really exists in our directory: re-find the one the model picked.
    const cands = kvkSearch(kvkData, loc.kvk.state || '', loc.kvk.district || '');
    const picked = String(loc.kvk.kvk || '').toLowerCase().slice(0, 40);
    const real = cands.find(k => picked && (k.kvk || '').toLowerCase().startsWith(picked)) || cands[0] || null;
    if (real) kvkMatch = { ...real, via: 'mcp' };
  }

  if (!diag.j || !diag.j.cause || !diag.j.telegram_en) {
    const err = diag.err || {};
    if (err.status === 403 && /guardrail/i.test(String(err.error) + JSON.stringify(err.data || ''))) {
      const s = safetyFloor(text, lang, kvkMatch);
      const t = s.blocked ? s.telegram : SAFETY_TELEGRAMS.kvk[lang];
      return jsonResponse(telegramReply(t, { kvk: kvkOut(kvkMatch), safety: s.reason || 'guardrail', stopped_by: 'Otari guardrail', trace: traces, otari_cost_usd: sumCost(traces) }));
    }
    const ref = refusalTelegram(err, lang);
    if (ref) return jsonResponse(telegramReply(ref.telegram, { kvk: kvkOut(kvkMatch), refused: ref.reason, trace: traces, otari_cost_usd: sumCost(traces) }));
    const t = 'SERVICE UNAVAILABLE STOP TRY AGAIN LATER STOP';
    return jsonResponse(telegramReply(t, { kvk: kvkOut(kvkMatch), error: 'Model unavailable: ' + (err.error || 'bad response'), trace: traces, otari_cost_usd: sumCost(traces) }), 502);
  }
  const d = diag.j;
  const cause = String(d.cause).toUpperCase().slice(0, 80);
  const telegramEn = cleanTelegram(d.telegram_en);
  const actions = Array.isArray(d.actions) ? d.actions.slice(0, 4).map(a => String(a).slice(0, 120)) : [];
  const adviceEn = `Cause: ${cause}. Actions: ${actions.join('; ')}. Telegram: ${telegramEn}`;

  // Translate (different open model) and judge (safety classifier) in parallel.
  const [tg, jd] = await Promise.all([
    lang === 'en' ? Promise.resolve({ telegram: telegramEn, traces: [] }) : runTelegraph(env, adviceEn, lang, user),
    runJudge(env, adviceEn, user),
  ]);
  traces.push(...tg.traces, jd.trace);
  let telegram = tg.telegram || telegramEn;

  // Judge says unsafe, or the Otari guardrail refused the judge's input -> referral telegram.
  if (jd.verdict.safe === false || jd.blockedByGuardrail) {
    const s = safetyFloor(adviceEn, lang, kvkMatch);
    const t = s.blocked ? s.telegram : (kvkMatch ? KVK_NAMED[lang](cleanTelegram(kvkMatch.district || '')) : SAFETY_TELEGRAMS.kvk[lang]);
    return jsonResponse(telegramReply(t, { cause, kvk: kvkOut(kvkMatch), safety: 'judge', stopped_by: jd.blockedByGuardrail ? 'Otari guardrail' : 'judge model (' + jd.verdict.label + ')', trace: traces, otari_cost_usd: sumCost(traces) }));
  }
  // Code floor AFTER the models too.
  const post = safetyFloor(telegram + ' ' + adviceEn, lang, kvkMatch);
  if (post.blocked) return jsonResponse(telegramReply(post.telegram, { native: post.native || null, cause, kvk: kvkOut(kvkMatch), safety: post.reason, stopped_by: 'code floor (output)', trace: traces, otari_cost_usd: sumCost(traces) }));

  return jsonResponse(telegramReply(telegram, {
    cause, actions, telegram_en: telegramEn, kvk: kvkOut(kvkMatch),
    model: diag.traces[diag.traces.length - 1]?.served || null,
    judge: jd.verdict.label, trace: traces, otari_cost_usd: sumCost(traces),
  }));
}

// Sources: Otari web search (one search, Indian extension sources preferred).
export const TRUSTED_SOURCE_RE = /(\.gov\.in|\.nic\.in|\.ac\.in|\.res\.in|\.edu\.in|icar\.org\.in|icar-[a-z]+\.in|vikaspedia\.in|tnau\.ac\.in)(\/|$)/i;
export function pickSources(toolCalls) {
  const all = [];
  for (const c of toolCalls || []) if (c.type === 'web_search' && c.status === 'completed') for (const s of c.sources || []) all.push({ url: s.url, title: s.title });
  const seen = new Set(); const uniq = all.filter(s => s.url && !seen.has(s.url) && seen.add(s.url));
  let host = u => { try { return new URL(u).hostname; } catch { return ''; } };
  const trusted = uniq.filter(s => TRUSTED_SOURCE_RE.test(host(s.url) + '/'));
  return { trusted, other: uniq.filter(s => !trusted.includes(s)) };
}
async function handleSource(request, env) {
  let b; try { b = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON body' }, 400); }
  const cause = String(b.cause || '').slice(0, 120); const crop = String(b.crop || '').slice(0, 60);
  if (!cause) return jsonResponse({ error: 'cause is required' }, 400);
  const user = await farmerUser(b.farmer);
  const r = await otari(env, {
    model: POLICY.research,
    messages: [{ role: 'system', content: 'Search once for an Indian public agricultural extension page (ICAR institute, state agricultural university, KVK, Vikaspedia or a government agriculture department) on managing the named crop problem. Then reply in one short plain English sentence (no markdown) saying what the best source recommends first. Never recommend a chemical product or quantity.' },
      { role: 'user', content: `${cause}${crop ? ' in ' + crop : ''}, India` }],
    tools: [{ type: 'otari_web_search', max_uses: 1 }], max_tokens: 1200,
  }, { role: 'source-websearch', user, timeoutMs: 27000 });
  if (!r.ok) { const ref = refusalTelegram(r, 'en'); return jsonResponse({ error: ref ? 'Daily allowance used' : (r.error || 'search failed'), trace: [r.trace] }, ref ? 429 : 502); }
  const { trusted, other } = pickSources(r.data.otari_tool_calls);
  let summary = String(r.content || '').replace(/[*_#`]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (safetyFloor(summary).blocked) summary = '';
  return jsonResponse({ summary, sources: trusted.slice(0, 3), other_sources: other.slice(0, 2), trace: [r.trace], otari_cost_usd: sumCost([r.trace]) });
}

// Field maths: Otari code execution does the arithmetic, the model only explains.
export function calcPrompt() {
  return 'You help an Indian farmer with field arithmetic: land area conversions, plant counts from spacing, drip or sprinkler run time, and similar sums. ' +
    'Always use the code execution tool to compute every number; never do arithmetic in your head. Units: 1 acre = 40 guntha = 4046.86 square metres; 1 hectare = 10000 square metres = 2.47105 acres. ' +
    'If a number the calculation needs is missing, say which one in the answer instead of guessing. Do not give any pesticide or fertiliser quantity. ' +
    'Reply ONLY with JSON {"answer_en": string (one or two plain sentences with the results and units), "telegram_en": string (ALL CAPS English telegram, A-Z digits and spaces, STOP between sentences, at most 15 words not counting STOP), "python": string (the code you ran)}.';
}
async function handleCalc(request, env) {
  let b; try { b = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON body' }, 400); }
  const q = String(b.question || '').trim(); const lang = ['en', 'hi', 'mr'].includes(b.lang) ? b.lang : 'en';
  if (!q || q.length > 600) return jsonResponse({ error: 'question is required (max 600 chars)' }, 400);
  const floor = safetyFloor(q, lang);
  if (floor.blocked) return jsonResponse(telegramReply(floor.telegram, { safety: floor.reason, stopped_by: 'code floor', trace: [] }));
  const user = await farmerUser(b.farmer);
  const r = await otari(env, { model: POLICY.calc, messages: [{ role: 'system', content: calcPrompt() }, { role: 'user', content: q }], tools: [{ type: 'otari_code_execution' }], max_tokens: 2500, temperature: 0 }, { role: 'calc-code-exec', user, timeoutMs: 28000 });
  const traces = [r.trace];
  const j = r.ok ? parseJsonLoose(r.content) : null;
  if (!j || !j.telegram_en) { const ref = refusalTelegram(r, lang); if (ref) return jsonResponse(telegramReply(ref.telegram, { refused: ref.reason, trace: traces }));
    return jsonResponse({ error: 'Could not compute: ' + (r.error || 'bad response'), trace: traces }, 502); }
  let telegram = cleanTelegram(j.telegram_en);
  if (lang !== 'en') { const tg = await runTelegraph(env, j.answer_en + ' Telegram: ' + telegram, lang, user); traces.push(...tg.traces); if (tg.telegram) telegram = tg.telegram; }
  const post = safetyFloor(telegram + ' ' + j.answer_en, lang);
  if (post.blocked) return jsonResponse(telegramReply(post.telegram, { safety: post.reason, trace: traces }));
  return jsonResponse(telegramReply(telegram, { answer_en: String(j.answer_en).slice(0, 400), python: String(j.python || '').slice(0, 1500), trace: traces, otari_cost_usd: sumCost(traces) }));
}

// MCP server: our KVK directory, which Otari connects to as a workspace MCP server.
export const MCP_TOOLS = [{
  name: 'find_kvk',
  description: 'Find the ICAR Krishi Vigyan Kendra (KVK, farm science centre) for an Indian state and district. Returns up to 3 matches with the KVK address, host institution and the ICAR source page.',
  inputSchema: { type: 'object', properties: { state: { type: 'string', description: 'Indian state, e.g. Maharashtra' }, district: { type: 'string', description: 'District, e.g. Pune' }, place: { type: 'string', description: 'Optional town, taluka or village the farmer named, e.g. Baramati; KVKs located there are listed first' } }, required: ['state', 'district'] },
}];
export function kvkSearch(kvkData, state, district, place = '') {
  if (!kvkData) return [];
  const s = String(state || '').toLowerCase().trim(); const dd = String(district || '').toLowerCase().trim(); const pl = String(place || '').toLowerCase().trim();
  if (!dd) return [];
  const hits = kvkData.kvks.filter(k => (!s || (k.state || '').toLowerCase() === s) && (((k.district || '').toLowerCase().includes(dd)) || (k.kvk || '').toLowerCase().includes(dd)));
  if (pl.length >= 3) hits.sort((a, b) => Number(((b.kvk || '') + ' ' + (b.host || '')).toLowerCase().includes(pl)) - Number(((a.kvk || '') + ' ' + (a.host || '')).toLowerCase().includes(pl)));
  return hits.slice(0, 3);
}
async function handleMcp(request, env) {
  const tok = secret(env, 'MCP_TOKEN');
  if (tok && request.headers.get('Authorization') !== 'Bearer ' + tok) return new Response('unauthorized', { status: 401 });
  if (request.method === 'GET') return new Response('method not allowed', { status: 405 });
  let m; try { m = await request.json(); } catch { return jsonResponse({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400); }
  const reply = async (msg) => {
    if (!msg || msg.id === undefined || msg.id === null) return null; // notification
    const ok = result => ({ jsonrpc: '2.0', id: msg.id, result });
    switch (msg.method) {
      case 'initialize': return ok({ protocolVersion: msg.params?.protocolVersion || '2025-03-26', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'kvk-directory', version: '1.0.0' } });
      case 'ping': return ok({});
      case 'tools/list': return ok({ tools: MCP_TOOLS });
      case 'tools/call': {
        if (msg.params?.name !== 'find_kvk') return { jsonrpc: '2.0', id: msg.id, error: { code: -32602, message: 'Unknown tool' } };
        const a = msg.params.arguments || {};
        const hits = kvkSearch(await loadKvkData(env), a.state, a.district, a.place);
        return ok({ content: [{ type: 'text', text: JSON.stringify(hits.length ? hits : { found: 0, note: 'No KVK matched; try the district headquarters name.' }) }], isError: false });
      }
      default: return { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Method not found' } };
    }
  };
  if (Array.isArray(m)) { const out = (await Promise.all(m.map(reply))).filter(Boolean); return out.length ? jsonResponse(out) : new Response(null, { status: 202 }); }
  const out = await reply(m);
  return out ? jsonResponse(out) : new Response(null, { status: 202 });
}

// Guardrails service contract (POST /validate) so Otari can mandate our safety floor.
async function handleGuard(request, env) {
  const tok = secret(env, 'GUARD_TOKEN');
  if (tok && request.headers.get('Authorization') !== 'Bearer ' + tok) return new Response('unauthorized', { status: 401 });
  if (request.method === 'GET') return jsonResponse([{ name: 'krishi-safety-floor', guardrail_name: 'krishi_safety_floor' }]);
  let b; try { b = await request.json(); } catch { return jsonResponse({ error: 'bad json' }, 400); }
  const s = safetyFloor(String(b.input_text || ''));
  return jsonResponse({ profile: b.profile || 'krishi-safety-floor', result: { valid: !s.blocked, explanation: s.blocked ? s.reason : null, score: s.blocked ? 1 : 0 } });
}


// ---------------------------------------------------------------------------
// /api/proof: run one Otari feature live and return the raw Otari-* evidence.
// ---------------------------------------------------------------------------
const DIARY_LINE = 'Day note: rows 1 to 40 look even, no new spots, soil moist after irrigation, a few aphids on the border rows. ';
export const PROOF_FEATURES = ['routing', 'guardrail', 'user_budget', 'mcp', 'web_search', 'code_execution'];
async function handleProof(request, env) {
  const url = new URL(request.url); const f = url.searchParams.get('f') || '';
  if (!PROOF_FEATURES.includes(f)) return jsonResponse({ error: 'f must be one of ' + PROOF_FEATURES.join(', ') }, 400);
  const rand = (await sha16(String(Date.now()) + Math.random())).slice(0, 10);
  const user = 'proof-' + rand;
  const steps = [];
  const step = (label, r, extra = {}) => { steps.push({ label, status: r.status, ...r.trace, ...extra }); return r; };
  if (f === 'routing') {
    // A long field diary is beyond the self-hosted model's context window: Otari falls over to the next target.
    const diary = DIARY_LINE.repeat(500);
    const r = await otari(env, { model: POLICY.private, messages: [{ role: 'system', content: 'Summarise this farm diary for the farmer in one plain English sentence.' }, { role: 'user', content: diary }], max_tokens: 60, reasoning_effort: 'none' }, { role: 'proof-routing', user, timeoutMs: 28000 });
    step('policy krishi-private with a 10,000-word diary', r, { answer: (r.content || '').slice(0, 200) });
    return jsonResponse({ feature: f, expect: 'Otari-Fallback: true and Otari-Attempt-Count: 2 (the self-hosted model refuses a prompt longer than its context; Otari moves on inside the same request)', steps });
  }
  if (f === 'guardrail') {
    const r = await otari(env, { model: POLICY.telegraph, messages: [{ role: 'user', content: 'My brother drank pesticide in the field, what do we do' }], max_tokens: 20 }, { role: 'proof-guardrail', user });
    step('poisoning message sent straight to Otari (app code floor skipped)', r, { body: r.data || null });
    const ok = await otari(env, { model: POLICY.telegraph, messages: [{ role: 'user', content: 'Reply with one word: OK' }], max_tokens: 5 }, { role: 'proof-guardrail', user });
    step('ordinary message', ok, { answer: ok.content || '' });
    return jsonResponse({ feature: f, expect: 'first call 403 guardrail_violation from Otari (our krishi-safety-floor service, block mode); second call 200 with valid:true', steps });
  }
  if (f === 'user_budget') {
    for (let i = 1; i <= 2; i++) {
      const r = await otari(env, { model: 'nebius:google/gemma-3-27b-it', messages: [{ role: 'user', content: 'Reply with one word: OK' }], max_tokens: 3 }, { role: 'proof-user-budget', user, keyName: 'DEMO_KEY' });
      step(`call ${i} from the same new farmer id`, r, { body: r.ok ? undefined : (r.data || null) });
    }
    return jsonResponse({ feature: f, expect: 'demo key with an end-user budget of 1 request per farmer per day: call 1 is 200, call 2 is 403 budget_exceeded with Otari-Budget-Scope: user. (The live app key allows 40 requests and US$0.05 per farmer per day.)', steps });
  }
  if (f === 'mcp') {
    const loc = await runLocate(env, 'I farm sugarcane near Baramati, Pune district, Maharashtra.', user);
    steps.push({ label: 'model asked to find the KVK; it calls find_kvk on our MCP server through Otari', ...(loc.trace || {}), answer: loc.kvk });
    return jsonResponse({ feature: f, expect: 'the KVK at Baramati (Sharda Nagar, Malegaon Colony) comes back from our MCP tool', steps });
  }
  if (f === 'web_search') {
    const res = await handleSource(new Request('https://x/api/source', { method: 'POST', body: JSON.stringify({ cause: 'RICE BLAST', farmer: user }) }), env);
    const j = await res.json();
    return jsonResponse({ feature: f, expect: 'links that came back from Otari web search (Indian extension sites first)', steps: (j.trace || []).map(t => ({ label: 'otari_web_search, one search', ...t, answer: j.summary, sources: j.sources })) });
  }
  if (f === 'code_execution') {
    const res = await handleCalc(new Request('https://x/api/calc', { method: 'POST', body: JSON.stringify({ question: 'Field is 2 acre 25 guntha. Onion rows 15 cm apart, plants 10 cm apart, 70% of land usable. How many seedlings?', lang: 'en', farmer: user }) }), env);
    const j = await res.json();
    return jsonResponse({ feature: f, expect: 'about 495,740 seedlings, computed by code that ran in Otari code execution', steps: (j.trace || []).map(t => ({ label: 'otari_code_execution', ...t, answer: j.answer_en, python: j.python })) });
  }
  return jsonResponse({ error: 'unreachable' }, 500);
}

async function handlePrivateStatus() {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 4000);
  try { const r = await fetch(PRIVATE_HEALTH, { signal: ctrl.signal, redirect: 'manual' }); clearTimeout(t); const ok = r.status === 200 && /ok/i.test(await r.text()); return jsonResponse({ awake: ok }); }
  catch { clearTimeout(t); return jsonResponse({ awake: false }); }
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

// Per-farmer allowance: read this farmer's Otari end user with the service key (GET /end-users/{id}).
export const FARMER_DAILY = { requests: 40, usd: 0.05 };
async function handleAllowance(request, env) {
  const url = new URL(request.url);
  const user = await farmerUser(url.searchParams.get('farmer') || '');
  const key = secret(env, 'OTARI_KEY');
  if (!key || user === 'farmer:anonymous') return jsonResponse({ known: false });
  try {
    const r = await fetch(OTARI_BASE + '/end-users/' + encodeURIComponent(user), { headers: { Authorization: 'Bearer ' + key } });
    if (r.status === 404) return jsonResponse({ known: true, used_requests: 0, limit_requests: FARMER_DAILY.requests, spend_usd: 0, limit_usd: FARMER_DAILY.usd, source: 'otari end user (not created yet)' });
    if (!r.ok) return jsonResponse({ known: false, status: r.status });
    const j = await r.json();
    return jsonResponse({ known: true, used_requests: j.current_requests ?? 0, limit_requests: FARMER_DAILY.requests, spend_usd: Number(j.spend || 0), limit_usd: FARMER_DAILY.usd, blocked: !!j.blocked, resets_at: j.next_budget_reset_at || null, source: 'GET /api/v1/end-users/{id} on Otari' });
  } catch { return jsonResponse({ known: false }); }
}

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id' } });
    }
    if (request.method === 'POST' && url.pathname === '/api/telegram') return handleTelegram(request, env);
    if (request.method === 'POST' && url.pathname === '/api/source') return handleSource(request, env);
    if (request.method === 'POST' && url.pathname === '/api/calc') return handleCalc(request, env);
    if (url.pathname === '/api/private-status') return handlePrivateStatus();
    if (url.pathname === '/api/allowance') return handleAllowance(request, env);
    if (url.pathname === '/api/proof') return handleProof(request, env);
    if (url.pathname === '/mcp') return handleMcp(request, env);
    if (url.pathname === '/guard/validate' || url.pathname === '/guard/profiles') return handleGuard(request, env);
    if (env?.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};
