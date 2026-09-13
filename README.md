# Nova 3.0 — AI Workspace

A local-first, multi-account AI workspace powered by Google Gemini.

## What's new in this update

- **Real login system.** Every visitor must sign in (username + password,
  email/phone optional). Passwords are hashed with Node's built-in `scrypt`
  (no native dependency — works fine on Termux). Duplicate usernames are
  rejected, and weak passwords are rejected (8+ chars, upper+lower+number+
  special character required).
- **Separate accounts, separate everything.** Conversations, memory,
  settings, and usage are now stored per account instead of one shared file.
- **Real usage bar.** The ⚡ bar at the top now reflects actual Gemini token
  usage against a daily quota you configure (`DAILY_TOKEN_QUOTA` in `.env`),
  not an arbitrary countdown. It resets every 24 hours automatically.
- **Mood slider.** Settings → "حالت Nova" is now a 5-stop slider (باهوش /
  خودمونی / با استیکر / جدی / تحقیق کردن), each backed by a real, distinct
  system-prompt instruction in `server/openai.js`.
- **Automatic memory.** After each reply, Nova runs a small, cheap check —
  "was there a durable fact worth remembering here?" — and only saves real
  hits, tagged by category (personal / preferences / work / projects). You
  can toggle memory on/off, toggle categories, or wipe it all from Settings.
- **Custom names, avatars, and system prompt** — for both Nova and the user
  — carried over and now saved per account.
- **Animation control.** Settings → "انیمیشن" lets each user pick off /
  reduced / normal / extra motion intensity.
- **Voice.** A mic button does speech-to-text (browser's Web Speech API);
  a 🔊 button on any reply reads it aloud, plus an auto-speak toggle in
  Settings. Both are free and run entirely in the browser — no API cost,
  but browser support varies (best on Chrome desktop/Android).
- **Smarter chat naming.** New conversations get a real AI-generated title
  after the first exchange (in addition to manual rename, now available
  directly from the chat list via the ✎ button).
- **Brand identity.** Nova now consistently identifies as built by "Team
  Nova AI." If asked directly about its underlying infrastructure, it
  honestly discloses that its language model runs on Google's Gemini
  technology — transparent rather than pretending to be independent, while
  keeping the Nova brand and personality front and center.

## Two real bugs fixed from the previous version

1. **`.env.example` didn't match the code.** It listed `OPENAI_*` variables,
   but the server only ever reads `GEMINI_API_KEY` / `GEMINI_MODEL` / etc.
   Anyone following the old `.env.example` literally would have gotten
   "GEMINI_API_KEY is not configured" errors. Fixed.
2. **Image generation was reading the wrong response shape.** The code
   expected `result.data[0].b64_json` (that's OpenAI's format), but the
   Gemini SDK actually returns the image at
   `result.candidates[0].content.parts[].inlineData.data`. Both are now
   checked, so image generation actually returns an image.

## Run it

```bash
npm install
cp .env.example .env      # then paste your Gemini key
npm start
```

Get a **free** Gemini API key at https://aistudio.google.com/apikey — no
credit card required for the free tier, which is what makes this whole
project able to run at no cost.

Open `http://localhost:3000`, create an account, and start chatting.

### Termux → GitHub → Render

1. `pkg install nodejs git` in Termux, then `git init && git add -A && git commit -m "Nova"`.
2. Push to a new GitHub repo (`git remote add origin <url> && git push -u origin main`).
3. On Render: New → Web Service → connect the repo → Build command
   `npm install`, Start command `npm start`.
4. In Render's Environment tab, add every variable from `.env.example`
   (at minimum `GEMINI_API_KEY` and a real `SESSION_SECRET`).
5. Deploy. Render gives you a public HTTPS URL — that's your domain.

## Migrating existing local data

This update introduces multi-user accounts, which didn't exist before. Any
`data/nova.json` from the old single-user version won't automatically
attach to a new account (there was no account to attach it to). Register
your account first; old conversations/memories from before this update stay
in the file but aren't loaded — check `data/nova.json` directly if you need
to manually recover any of that text.

## Security notes

- Sessions are stored in a signed cookie (`cookie-session`); set
  `SESSION_SECRET` to a long random value in production
  (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
- Code execution is intentionally not implemented on the main Node process.
  A production coding-runner should be an isolated Docker/Firecracker-style
  sandbox with CPU, memory, time, filesystem, and network restrictions.
- This is a small/personal-scale app (file-based JSON storage). For real
  multi-user production traffic, swap `server/store.js` for a real database
  to avoid write-race conditions under concurrent load.

## Features (full list)

- Login / registration, per-account data isolation
- Real Gemini streaming chat with auto text/coding/image intent routing
- Optional Google Search grounding tool ("جستجوی وب")
- Image generation/editing endpoint (Gemini image model)
- File upload + text extraction (txt/md/csv/json/code files, PDF)
- Persistent per-user conversations, settings, profile, memory
- Automatic + manual memory, with category filters and a clear-all option
- Custom Nova name/avatar and user profile
- Custom permanent system prompt
- Personality mood slider (5 modes)
- Theme presets + custom accent color, light/dark mode
- User-adjustable animation intensity
- Voice input (speech-to-text) and voice output (text-to-speech)
- Real, live ⚡ usage meter with daily reset
- Mobile sidebar, keyboard-safe composer, scroll-reveal message animation
- Retry and stop generation, per-chat rename and AI auto-titling
