# STATE.md - Current System Status

> Single Source of Truth for Zidni Web Platform

## Current Status: IMPORTED

**Last Updated:** 2026-01-28
**Branch:** main
**Source:** Kimi Export (zidni_kimi_export_2026-01-28.zip)

---

## What Works

### Core Features
- [x] **Chat Interface** - Arabic RTL support with Noto Sans Arabic
- [x] **25 AI Agents** - Parallel agent system (General, Code, Research, etc.)
- [x] **Tool System** - shell, browser, filesystem, memory, search, code
- [x] **Clawdbot Integration** - Gateway connector, skills, enhanced memory

### AI Providers
- [x] **KIMI (Primary)** - moonshot-v1-8k model
- [x] **OpenAI** - GPT-4 fallback
- [x] **Demo Mode** - Works without API keys

### Multi-Channel
- [x] **WhatsApp** - QR code auth via Baileys
- [x] **Telegram** - Bot API integration
- [x] **Discord** - Slash commands support

### Features
- [x] Website Generator with deployment
- [x] Spreadsheet Editor (XLSX support)
- [x] Presentation Generator (PPTX)
- [x] Deep Research (web search + AI)
- [x] Code Playground (JS execution)
- [x] File Management (upload/download)
- [x] i18n (Arabic/English)

---

## How to Run

### Prerequisites
- Node.js 18+
- npm

### Development
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start development
npm run dev        # Frontend (Vite) - http://localhost:5173
npm run server     # Backend (Express) - http://localhost:3001

# Or run both
npm run dev:full
```

### Production
```bash
npm run build
npm run server
```

### Docker
```bash
docker-compose up -d
```

---

## Known Issues

1. **No Tests** - Unit/integration tests not yet implemented
2. **Package Name** - Still shows "my-app" in package.json
3. **GitHub URLs** - README references placeholder `yourusername`
4. **CORS** - May need adjustment for production deployment

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_PROVIDER` | No | kimi, openai, gemini, demo (default: demo) |
| `KIMI_API_KEY` | If using KIMI | Moonshot API key |
| `OPENAI_API_KEY` | If using OpenAI | OpenAI API key |
| `PORT` | No | Backend port (default: 3001) |
| `TOOLS_ENABLED` | No | Enable tool system (default: true) |
| `SERPER_API_KEY` | No | For web search feature |

---

## Repository

- **GitHub:** https://github.com/lemneya/zidni-web
- **Visibility:** Public
- **License:** MIT
