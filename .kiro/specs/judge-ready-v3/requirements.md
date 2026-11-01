# Requirements: Krishi Telegram v3 ("judge-ready")

Source: round-2 outside reviews of v2 on 1 Nov 2026 (Fo by Wajo; Skydive agent "Arden"; open-weight critic gpt-oss-120b). Built by Tab, an AI assistant, for team lead Akshay Wagh.

## R1 Ten-second path to a real result
- THE SYSTEM SHALL show 5 one-tap example chips above the input: an English crop problem ("wheat leaves turning yellow"), a Hindi one in Roman script, a Marathi one in Roman script, a pesticide-dose question (which shows the KVK referral), and one safety-floor phrase. Tapping a chip SHALL fill the form (language included) and send it.
- THE SYSTEM SHALL put a visible "Find my KVK" control on the landing screen that opens the state/district picker and shows the matching KVK card(s) from site/data/kvk.json without needing a model call.

## R2 Native script on screen
- WHEN the language is Hindi or Marathi, THE SYSTEM SHALL ask the model for an extra field `native` holding the same telegram in Devanagari, and show it under the Roman telegram (Morse and the word count still use the Roman body).
- THE SYSTEM SHALL offer a Roman / देवनागरी toggle for the printed telegram form; the choice is kept in localStorage.
- IF the model's `native` field is missing or not Devanagari, THE SYSTEM SHALL simply hide that line (never show garbage).
- The safety-floor telegrams SHALL have fixed Devanagari versions for HI and MR written in code.

## R3 Delivery to a feature phone, at no cost
- THE SYSTEM SHALL show "Send as SMS" (an sms: link whose body is the Roman telegram) and "Copy" buttons under every telegram, so the advice can be forwarded to any phone. No SMS gateway, no phone numbers stored.

## R4 Prove the low-bandwidth claim
- THE SYSTEM SHALL include scripts/weight.mjs that sums the bytes of index.html, app.js, styles.css and any other asset the landing page loads (excluding kvk.json, which loads only on demand), raw and gzip, and writes site/weight.json.
- THE SYSTEM SHALL print the measured gzip weight in the page footer as "PAGE WEIGHS N KB STOP" read from site/weight.json.
- IF any landing asset can be cut without losing a feature (unused CSS, fonts), THE SYSTEM SHALL cut it.

## R5 A hook that guards the safety floor
- THE SYSTEM SHALL add .kiro/hooks/safety-floor-guard.json: on save of site/worker.mjs, run `node --test test/safety-guard.test.mjs`.
- test/safety-guard.test.mjs SHALL assert that the emergency numbers 108, 112 and 14416 and the KVK referral path are still present and that the safety floor runs both before and after the model call.

## R6 Evidence where judges look
- THE SYSTEM SHALL keep README sections: "Kiro evidence" (links to both specs, the 3 steering files, both hooks, eval set), "Tests" (the exact pass count from `node --test`), and "Live eval" (link to eval/last_run.txt).
- Accessibility: every button and input has a label or aria-label; text contrast at least 4.5:1; layout works at 360 px wide.
