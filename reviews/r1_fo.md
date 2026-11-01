# Round 1 — Fo (Wajo), 1 Nov 2026 19:30Z

Reviewed it as a judge would: I loaded the live site, actually sent a question ("My tomato leaves are curling and turning yellow"), read the repo, and confirmed the video is up on YouTube. Demo works end to end: 200 on the API, an 11-word telegram came back in seconds with word count, price, and both buttons. Good bones. Now the blunt part.

Scores as it stands: Potential Impact 6, Technological Implementation 6, Design 7, Innovation 5, Presentation 5.

Top 6, ordered by score impact:

Kill the TODO in the Devpost text. Presentation, 5→8. Replace "Video: TODO — Akshay uploads" with the real YouTube URL and embed it first, plus two screenshots. The video exists already; a judge who opens the submission and reads "TODO" marks it unfinished before watching anything. This is five minutes of work protecting the whole entry.

Reply in the language the farmer picked. Potential Impact, 6→8. Right now the Hindi/Marathi selector only changes the question handling; the reply comes back as English CAPS. Pass the selected language into the Groq prompt and require the telegram body in that language (Romanized is fine), then recompute the word count after. A Marathi farmer getting English telegrams contradicts the entire accessibility story, and it's a one-line prompt change.

Wire the KVK referral to a real dataset. Innovation, 5→8, Impact up too. The judging criteria literally name "public datasets combined uniquely" and the entry uses none. Fetch the ICAR/data.gov.in KVK directory and have a pesticide referral print "CONTACT KVK <NAME>, <DISTRICT>" instead of the generic "SHOW LEAF TO KVK". That single lookup turns a gimmick into infrastructure and is the only move that can carry Innovation.

Show Kiro working on camera. Technological Implementation, 6→8. Judges score what they see, not what the README claims. Spend 20–30 seconds of the video screen-capturing: the EARS requirements, a tasks.md box being ticked, and the test-on-save hook firing. Also worth adding one more Kiro surface, since the criteria enumerate hooks, MCP, powers and Kiro Crew and the entry uses steering + spec + one hook. Even an agent hook that runs the safety tests on save is visible breadth.

Fix the advisory boilerplate with an eval set. Impact, Implementation. My live test for curling + yellow tomato leaves returned "APPLY ORGANIC FERTILIZER STOP ENSURE GOOD DRAINAGE STOP ROTATE CROPS STOP". That's LLM filler, and for the most common causes (leaf curl virus via whitefly) fertilizer advice is actively wrong. Add ten canonical crop problems with the one action a correct answer must contain, test it in CI, and force the prompt to name a specific disease or cause. This is the difference between a themed toy and an advisory, and it's the first thing an agriculture-literate judge probes.

Make the Morse legible without sound. Design 7→8, Presentation. Judges skim videos muted. Render the dots-and-dashes strip under the reply, synced with the audio, with a WPM note, and keep the telegraph click. Right now the audio is unverifiable in a skim and the resurrection's headline gimmick reads as a button that does nothing.

One honest caveat outside the six: the safety floor and per-word pricing are genuinely good ideas and worth featuring more prominently in the video, because they're currently underweighted relative to their value. Want me to draft the revised Devpost text with the video link and screenshots dropped in?