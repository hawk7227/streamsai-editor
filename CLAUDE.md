# streamsai-editor — CLAUDE.md

## Architecture

```
streamsai-editor/          ← npm workspace root
├── apps/
│   ├── web/               ← Next.js 14 (streamsai-editor.vercel.app)
│   │   ├── src/app/
│   │   │   ├── studio/    ← 3-panel workspace (LEFT+CENTER+RIGHT)
│   │   │   ├── editor/    ← EditorPro (existing 1115-line component)
│   │   │   └── api/proxy/ ← URL proxy for browser panel
│   │   └── vercel.json
│   └── mobile-chat/       ← Vite+React SPA (separate Vercel deployment)
│       ├── src/
│       │   ├── components/ ← ThreadList, MessageBubble, ChatInput, ChatPane
│       │   ├── store/      ← Zustand (chat.ts)
│       │   ├── db/         ← IndexedDB via idb
│       │   ├── lib/        ← tokens, nanoid, streaming
│       │   └── types/      ← Domain types (Message, Thread, ModelId…)
│       └── vercel.json
```

## Build Gate

Both must pass before any commit:
```
npm run build:chat   # must exit 0
npm run build:web    # must exit 0
npm run typecheck    # must exit 0
```

## Dev

```bash
npm install
npm run dev          # starts web:3000 + mobile-chat:3001
```

## Deploy

Each app has its own `vercel.json`. Two separate Vercel projects:
- `apps/web`         → streamsai-editor.vercel.app
- `apps/mobile-chat` → streams-mobile-chat.vercel.app (new project)

Set `NEXT_PUBLIC_MOBILE_CHAT_URL` in apps/web Vercel env to the mobile-chat deployment URL.

## Rules

- **MINIMAL CHANGES**: fix X = only X. Never remove existing code.
- **STRICT TYPES**: no `any`. All boundaries validated.
- **NO LONG TASKS IN HTTP**: streaming goes direct from browser to AI provider.
- **ZERO ASSUMPTION**: grep before using any import/prop/column.
- **VERTICAL SLICE**: every delivery includes UI → logic → storage → error handling.
- **4-STATE RENDER**: every component handles loading / error / empty / success.

## Panel wiring

| Panel  | Content                        | Env var                        |
|--------|--------------------------------|--------------------------------|
| LEFT   | mobile-chat iframe             | NEXT_PUBLIC_MOBILE_CHAT_URL    |
| CENTER | proxy iframe (/api/proxy?url=) | none (uses existing route)     |
| RIGHT  | /editor iframe (EditorPro)     | none (same-origin)             |

## Data flow

- Chat messages: Zustand (in-memory) ↔ IndexedDB (persistent)
- API keys: IndexedDB only — never leave the browser
- Streaming: direct browser → Anthropic/OpenAI (no proxy)
- Browser proxy: Next.js /api/proxy route (existing)
