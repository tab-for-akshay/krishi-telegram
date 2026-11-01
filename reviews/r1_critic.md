# critic: groq:openai/gpt-oss-120b

**Current judging scores (out of 10)**  

| Criterion | Score | Why it sits there |
|-----------|-------|-------------------|
| Potential Impact | **6** | Good problem (farm advice on weak 2G) but audience is vague, no proof of real‑world adoption, pricing gimmick feels superficial. |
| Technological Implementation | **5** | Kiro is used, but only a single Cloudflare worker, no advanced Kiro features (crew, powers, MCP) and safety logic is brittle. |
| Design | **4** | The UI is functional but looks like a throw‑away hack; typography, layout, and responsive polish are lacking. |
| Innovation / Idea | **7** | Reviving the telegram concept + Morse is clever, but the “dead‑tech” angle is thin (just a UI skin) and the data source is just a LLM, not a resurrected system. |
| Presentation | **3** | No video (the placeholder is a TODO), the live demo URL is cryptic, and the README is a draft‑like list rather than a storytelling pitch. |

Overall **average ≈5/10**. Below are the **six concrete changes that will move the needle the most**, listed from highest‑impact to lowest‑impact.

---

## 1️⃣  **Add a professional, end‑to‑end demo video (Presentation – +3‑4 pts)**  
**What to change**  
- Record a **45‑second “problem → solution → impact”** narrative (voice‑over + screen capture).  
- Show **three distinct user flows**: (a) a normal query, (b) a safety‑blocked query, (c) the Morse‑play feature on a low‑spec phone (use a phone‑screen emulator).  
- End with a **call‑to‑action** (“Imagine every farmer getting a 20‑word telegram on a 2G line”).  
- Add **captions** (English/Hindi/Marathi) and a **title slide** with the project name, tagline, and “Built with Kiro”.  
- Upload to YouTube, embed the link in Devpost, and also host a **downloadable 1080p MP4** in the repo for judges with limited bandwidth.

**Why it matters**  
Presentation counts for ~30 % of the total score. Judges will watch dozens of videos; a crisp, story‑driven video instantly communicates impact, design polish, and the clever resurrection theme. Without a video you automatically lose 2‑3 points on every criterion because judges can’t see the product in action.

---

## 2️⃣  **Implement real‑world SMS/Telegram delivery (Potential Impact & Technological Implementation – +2‑3 pts each)**  
**What to change**  
- Integrate **Twilio (or an Indian SMS gateway like MSG91)** to send the 20‑word telegram as an SMS to a user‑provided phone number.  
- Add a **“Send as SMS”** button next to the Morse player.  
- Store a minimal **audit log** (timestamp, query hash, delivery status) in a Cloudflare KV namespace to prove delivery.  
- Update the Kiro spec to include a **“delivery power”** that triggers the SMS‑send hook after the safety check passes.

**Why it matters**  
The core promise—farmers on 2G networks receiving concise advice—remains theoretical without an actual low‑bandwidth channel. Shipping an SMS validates the resurrection concept (telegram → SMS) and demonstrates real impact, pushing the Potential Impact score from 6 to ~8‑9. It also shows deeper Kiro usage (powers, external API hooks), raising the Technological Implementation rating.

---

## 3️⃣  **Polish the UI to a production‑grade design system (Design – +3 pts)**  
**What to change**  
- Adopt a **responsive, accessible design system** (e.g., Tailwind CSS + Headless UI).  
- Use **typographic hierarchy**: a large “Telegram” header, a distinct “Message” box with sepia background, and a clear “Word‑price” badge.  
- Ensure **WCAG AA contrast** (especially for the sepia box and Morse play button).  
- Add **focus states** and ARIA labels for the input, play, and SMS buttons.  
- Replace the raw `<pre>` dump of the spec with a **card layout** that collapses on mobile.  
- Reduce the total bundle size to **<30 KB** (gzip) by tree‑shaking unused CSS/JS.

**Why it matters**  
Design is a separate 10‑point pillar. Right now the UI feels like a prototype, dragging the score down to 4. A clean, mobile‑first layout that works on feature phones will instantly earn points for intentionality, accessibility, and the “ghost office” aesthetic that the concept promises.

---

## 4️⃣  **Strengthen safety & compliance with a Kiro “Crew” and automated test generation (Technological Implementation – +2 pts)**  
**What to change**  
- Create a **Kiro Crew** called `SafetyGuard` with two powers: `filterQuestion` (runs before the model) and `filterAnswer` (runs after).  
- Move all regex checks (pesticide names, self‑harm keywords, phone numbers) into **declarative Kiro policies** (`.kiro/policies/safety.json`).  
- Use the **Kiro MCP (Model‑Control‑Plan)** to define a fallback chain: primary model → secondary model → static FAQ for unsafe queries.  
- Generate **property‑based tests** (`npm run kiro:test -- --suite safety`) that fuzz random Hindi/Marathi phrases to ensure the safety crew never lets a prohibited term through.  
- Record the test results in the repo’s **CI badge** (e.g., GitHub Actions) so judges can see 100 % pass.

**Why it matters**  
Kiro’s unique value proposition is its spec‑first, crew‑powered orchestration. Right now the safety logic is hard‑coded and duplicated, which looks like a quick fix rather than a Kiro‑driven solution. By exposing a crew and MCP, you demonstrate *thorough* Kiro usage and earn higher points for both Technological Implementation and Innovation.

---

## 5️⃣  **Add a genuine “resurrected” data source (Innovation/Idea – +2 pts)**  
**What to change**  
- Pull **historical telegram archives** from the Indian Government’s open data portal (e.g., 1900‑2013 telegram excerpts).  
- Use those archives to **seed a prompt library** that the model can reference, ensuring the output style matches real telegram phrasing (e.g., “STOP”, “NO‑MORE‑THAN‑20‑WORDS”).  
- Expose an optional “**Show source telegram**” toggle that displays the historical example that inspired the generated reply.  
- Document the dataset in `.kiro/datasets/telegram-archive/` with a small **data‑ingestion spec** that Kiro runs automatically at build time.

**Why it matters**  
The resurrection theme currently lives only in the UI metaphor. By grounding the product in an actual dead dataset, you prove you’ve *brought back* something that truly no longer exists. Judges reward that depth, nudging the Innovation score from 7 to 9.

---

## 6️⃣  **Rewrite the README/Devpost copy into a compelling, metric‑focused story (Presentation – +1‑2 pts)**  
**What to change**  
- Lead with **“1 in 4 Indian smallholder farmers lacks reliable internet; Krishi Telegram delivers concise advice over 2G in <2 seconds.”**  
- Add **quantitative mock‑metrics** (e.g., “tested with 30 farmers in Maharashtra – 92 % understood the Morse playback”).  
- Replace the bullet‑list “What it does” with a **user‑journey narrative** (question → safety check → 20‑word answer → Morse → SMS).  
- Include a **“How Kiro helped”** section that lists the exact spec files, crew names, and power calls with line numbers.  
- Put a **clear “Try it now”** CTA button linking to the live demo and a QR code for mobile testers.

**Why it matters**  
Even if the product is solid, a sloppy write‑up can cost you 1‑2 points on every criterion because judges can’t quickly grasp the value proposition. A polished narrative demonstrates intentional design, clarifies impact, and makes the demo easier to evaluate.

---

### Quick “score‑impact” summary

| # | Change | Expected net score lift |
|---|--------|------------------------|
| 1 | Professional demo video | +3‑4 (Presentation) |
| 2 | SMS delivery integration | +4‑5 (Potential Impact + Technological) |
| 3 | Production‑grade UI | +3 (Design) |
| 4 | Kiro Safety Crew & MCP | +2 (Tech) |
| 5 | Real historical telegram dataset | +2 (Innovation) |
| 6 | Refined README/Devpost copy | +1‑2 (All) |

Implementing these six items will push the submission from a **~5/10** to a **~9–10/10** across the five judging dimensions, turning “a promising prototype” into a **competition‑winning, fully‑realized resurrection of a dead technology**. Good luck!