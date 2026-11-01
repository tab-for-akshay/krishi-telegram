# Requirements: Krishi Telegram v2 ("field-ready")

Source of these requirements: two outside judge reviews of v1 (Fo by Wajo, and an open-weight critic model), 1 Nov 2026. Built by Tab, an AI assistant, for team lead Akshay Wagh.

## R1 Reply in the farmer's language
- WHEN the farmer selects Hindi or Marathi, THE SYSTEM SHALL return the telegram body in that language written in Roman letters (so it can still be sent as Morse), with STOP kept as the sentence separator.
- WHEN the safety floor fires, THE SYSTEM SHALL return the fixed safety telegram in the selected language.
- THE SYSTEM SHALL count words in code after the model answers, never trusting the model's count.

## R2 Name a specific cause, not filler
- WHEN the model answers a crop problem, THE SYSTEM SHALL require a "cause" field naming the most likely pest, disease or deficiency, and the telegram SHALL begin with that cause.
- THE SYSTEM SHALL keep an eval set of at least 10 canonical crop problems, each with the key action or cause a correct answer must contain, and a script that runs the eval against the live API and prints the pass rate.

## R3 Real KVK referral from a public dataset
- THE SYSTEM SHALL ship the ICAR Krishi Vigyan Kendra list (all states) as `site/data/kvk.json`, with its source page and fetch date.
- WHEN the farmer picks a state and types a district, THE SYSTEM SHALL find the matching KVK(s) in that dataset.
- WHEN the pesticide/dose safety floor fires and a KVK matches, THE SYSTEM SHALL name that KVK in the telegram ("CONTACT KVK <DISTRICT> STOP ...") and show its address and host institution under the telegram.
- WHEN no KVK matches, THE SYSTEM SHALL fall back to "CALL YOUR LOCAL KRISHI VIGYAN KENDRA".

## R4 Morse you can see
- THE SYSTEM SHALL render the dots and dashes as a visual strip under the telegram, highlighting each symbol in sync with the audio, so the Morse is legible with sound off.
- THE SYSTEM SHALL show the sending speed (WPM).

## R5 Tests stay green
- THE SYSTEM SHALL add unit tests for KVK lookup, language-specific safety telegrams and the eval-set shape, and all tests SHALL pass with `node --test`.
