# Requirements — Last Telegram (Krishi Telegram)

Format: EARS (Easy Approach to Requirements Syntax)

---

## Functional Requirements

### Input & Language
- **REQ-F01** — WHEN a farmer submits a question, the system SHALL accept text in English, Hindi, or Marathi up to 2000 characters.
- **REQ-F02** — WHEN the user selects a language, the system SHALL pass that language hint to the AI model.
- **REQ-F03** — WHERE the input field is empty, the system SHALL disable the send button and display a placeholder prompt.

### Telegram Output
- **REQ-F04** — WHEN the model returns a reply, the system SHALL format it in UPPERCASE with "STOP" separating each sentence, with a maximum of 20 words excluding STOPs.
- **REQ-F05** — WHEN displaying the telegram, the system SHALL show a word count and a cost in Indian paise (₹) calculated at an illustrative rate (50 paise per word, minimum 10 words billed; not the historical tariff).
- **REQ-F06** — WHEN the telegram is generated, the system SHALL display it inside a vintage telegram form styled with sepia paper, a flickering candle, and a ghost operator illustration.

### Morse Audio
- **REQ-F07** — WHEN the telegram is displayed, the system SHALL provide a "Play Morse" button that encodes the telegram text as Morse code and plays it via the Web Audio API.
- **REQ-F08** — WHILE Morse audio is playing, the system SHALL show a "Stop" button to allow the user to cancel playback.
- **REQ-F09** — WHERE the browser does not support Web Audio API, the system SHALL hide the Morse play button gracefully.

### Print
- **REQ-F10** — WHEN the user activates the print action, the system SHALL open the browser print dialog with a print-optimised stylesheet that shows only the telegram form.

### Safety Floor
- **REQ-F11** — WHEN the input contains phrases indicating pesticide or poison ingestion, self-harm, or poisoning symptoms (in English, Hindi, or Marathi), the system SHALL NOT forward the request to the AI model and SHALL immediately return an emergency telegram containing "CALL 108 NOW STOP" and the numbers 112 and 14416 (Tele-MANAS).
- **REQ-F12** — WHEN the input names a specific chemical pesticide or asks for pesticide dosage, the system SHALL return a telegram redirecting the user to consult a KVK (Krishi Vigyan Kendra) expert, and SHALL NOT include any pesticide name or dosage in the response.
- **REQ-F13** — WHEN the safety floor is triggered, the system SHALL log the event (without the user's text) as `SAFETY_FLOOR_TRIGGERED`.

### AI Model
- **REQ-F14** — WHEN calling the AI, the system SHALL use the Groq API with model `openai/gpt-oss-120b` as primary and `openai/gpt-oss-20b` as fallback.
- **REQ-F15** — WHEN the primary model call fails, the system SHALL automatically retry with the fallback model before returning an error.
- **REQ-F16** — WHEN the model responds, the system SHALL enforce JSON mode and parse `{ telegram, words, cost_paise, morse }` from the response.

### Morse Encoding
- **REQ-F17** — The system SHALL encode Morse code in application code (not by the AI model) using standard ITU-R Morse alphabet.
- **REQ-F18** — WHEN encoding, the system SHALL represent dots as 1 unit, dashes as 3 units, intra-character gaps as 1 unit, inter-character gaps as 3 units, and word gaps as 7 units.

---

## Non-Functional Requirements

### Accessibility
- **REQ-NF01** — All form inputs SHALL have associated `<label>` elements.
- **REQ-NF02** — Interactive elements SHALL have visible focus states meeting WCAG 2.1 AA contrast requirements.
- **REQ-NF03** — The layout SHALL be responsive and usable at a viewport width of 390 px.

### Performance
- **REQ-NF04** — The static assets (HTML + CSS + JS) SHALL be under 50 KB combined (uncompressed).
- **REQ-NF05** — The Worker SHALL respond within 10 seconds for the primary model path.

### Disclosure
- **REQ-NF06** — The text "Built by Tab, an AI assistant, using Kiro, for team lead Akshay Wagh." SHALL appear in both the README.md and the application footer/page visible to end users.

### Licensing
- **REQ-NF07** — The project SHALL be released under the MIT licence.
