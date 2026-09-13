# Nova 2.0

A local-first AI workspace with a professional responsive UI.

## Features
- Real OpenAI Responses API chat with streaming
- Auto routing: text / coding / image intent
- Optional web search tool when requested
- Image generation/editing endpoint
- File upload endpoint and text extraction for common text/code formats
- Persistent conversations/settings/profile/memory in `data/`
- Custom Nova name/avatar and user profile
- Custom system prompt + personality
- Theme presets + custom accent
- Linear ⚡ limit meter with 80/50/30 thresholds
- Mobile sidebar and keyboard-safe composer
- Nova ON/OFF guard
- Retry and stop generation

## Run
1. `npm install`
2. Copy `.env.example` to `.env`
3. Put your OpenAI key in `.env`
4. `npm start`
5. Open `http://localhost:3000`

Real OpenAI requests require your own API key. The local UI and persistence work without one.


## Security note
Code execution is intentionally not implemented on the main Node process. A production coding-runner should be an isolated Docker/Firecracker-style sandbox with CPU, memory, time, filesystem and network restrictions. On Termux, use Nova for code generation/inspection; do not execute untrusted generated code directly in the Nova server process.


## Nova UI Motion Update
- Scroll-reveal animations with staggered entry
- Smooth message scrolling
- Animated Nova typing indicator
- Subtle avatar/message depth and hover/press motion
- Reduced-motion accessibility support
- Gemini-compatible streaming preserved
