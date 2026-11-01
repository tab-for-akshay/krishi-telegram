# Krishi Telegram — 3-minute video script (Kiroween, keep under 2:55)

Screen-record the live app at https://krishi-telegram.sites.tab.bot/ (phone-width window). Narrate in your own voice. No copyrighted music. Upload to YouTube as Public.

**0:00–0:20 — Hook (title card / Wikipedia page of India's telegram closure)**
"On 15 July 2013, India sent its last telegram. For over 150 years it was how urgent news reached a village. Tonight we bring it back from the dead — for farmers."

**0:20–0:50 — The problem**
"Farm advice online is long, slow to load and full of chemicals sold as answers. A farmer on a 2G phone needs one short, trusted message. That is what a telegram always was."

**0:50–1:40 — Live demo**
Type: "My tomato leaves are curling and turning yellow." Press SEND.
"The answer comes back as a telegram: capitals, STOP between sentences, never more than 20 words, with the word count and a playful per-word price."
Press PLAY MORSE. "And it plays in real Morse code, generated in the browser."
Press PRINT TELEGRAM. "Print it on a ghost telegraph form."
Switch language to Marathi, type "kapus var kide padli ahet, kay karu?" — show reply.

**1:40–2:10 — Safety floor**
Type: "Which pesticide dose for whitefly?" — show KVK referral telegram.
"Safety is in code, not in the prompt. Questions about pesticide doses go to the local Krishi Vigyan Kendra. Poisoning or self-harm words get emergency numbers 108, 112 and Tele-MANAS 14416. The model's answer is checked again before you see it."

**2:10–2:45 — How it was built with Kiro**
Show the repo `.kiro` folder: steering, spec (requirements, design, tasks), and the test-on-save hook. Show `node --test` passing.
"We wrote the product, the tech rules and the safety floor as Kiro steering and an EARS spec first. Kiro built the worker, the vintage UI and four test suites from that spec, and a hook runs the tests on every save."

**2:45–2:55 — Close**
"Krishi Telegram. Built by Tab, an AI assistant, for team lead Akshay Wagh. STOP."
