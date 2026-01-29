# 🤖 زِدْني (Zidni) - Arabic AI Assistant

[![AI Providers](https://img.shields.io/badge/AI-KIMI%20%7C%20OpenAI%20%7C%20Gemini-blue)](https://platform.moonshot.cn/)
[![Agents](https://img.shields.io/badge/Agents-25%20Parallel-green)](https://github.com/yourusername/zidni)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **زِدْني** (Zidni) is a full-stack Arabic AI assistant with 25 parallel agents, Clawdbot (Moltbot) integration, and a complete feature set inspired by modern AI platforms.

![Zidni Screenshot](https://via.placeholder.com/800x400/1e293b/ffffff?text=Zidni+Arabic+AI+Assistant)

## ✨ Features

### 🤖 25 AI Agents Working Simultaneously
- General Assistant, Code Expert, Researcher, Writer
- Translator, Teacher, Legal Advisor, Doctor
- Designer, Marketer, Data Analyst, SEO Expert
- Social Media Manager, Copywriter, Project Manager
- Accountant, Chef, Fitness Coach, Therapist
- Travel Agent, Historian, Philosopher, Poet
- Comedian, Detective

### 🔧 Clawdbot (Moltbot) Integration
- **Gateway Connector** - WebSocket connection to external AI
- **Skill System** - 4+ built-in skills (browser, code, github, search)
- **Enhanced Memory** - Persistent storage with encryption & TTL

### 🛠️ Tool System
| Tool | Description |
|------|-------------|
| `shell` | Execute shell commands with allowlist |
| `browser` | Web scraping with Puppeteer |
| `filesystem` | Read/write files in sandbox |
| `memory` | Save/retrieve information |
| `search` | Web search with Serper API |
| `code` | Execute JavaScript code |

### 📱 Multi-Channel Messaging
- **WhatsApp** - QR code authentication
- **Telegram** - Bot API integration
- **Discord** - Bot with slash commands

### 🌐 Additional Features
- 💻 **Website Generator** - AI-powered sites with deployment
- 📊 **Spreadsheet Editor** - Excel-style grid with XLSX support
- 📑 **Presentation Generator** - PPTX creation
- 🔍 **Deep Research** - Web search + AI analysis
- 💻 **Code Playground** - JavaScript execution
- 📁 **File Management** - Upload, view, download
- 🧠 **Memory System** - Persistent conversation context

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- (Optional) Docker

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/zidni.git
cd zidni

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start development
npm run dev        # Frontend
npm run server     # Backend
```

### Environment Variables

```env
# AI Provider (kimi, openai, gemini, demo)
AI_PROVIDER=kimi
KIMI_API_KEY=sk-your-kimi-key
KIMI_MODEL=moonshot-v1-8k

# Optional: Other providers
# OPENAI_API_KEY=sk-...
# GEMINI_API_KEY=...

# Server
PORT=3001
CORS_ORIGIN=http://localhost:5173

# Features
TOOLS_ENABLED=true
SERPER_API_KEY=your-serper-key  # Optional for web search
```

## 🐳 Docker Deployment

```bash
# Build and run
docker-compose up -d

# Or with Nginx
docker-compose --profile with-nginx up -d
```

## ☁️ Azure VPS Deployment

See [DEPLOY.md](DEPLOY.md) for detailed instructions.

```bash
# On your Azure VPS
git clone https://github.com/yourusername/zidni.git
cd zidni
npm install

# Configure
nano .env

# Start with PM2
npm install -g pm2
pm2 start server.cjs --name "zidni-backend"
pm2 save
pm2 startup
```

## 📡 API Endpoints

### Health & Config
- `GET /api/health` - System status
- `GET /api/tools` - Available tools
- `GET /api/kimi/models` - KIMI model list

### Chat
- `POST /api/chat` - Send message with optional tool usage

### Conversations
- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Create conversation

### Agents (25)
- `GET /api/agents` - List all 25 agents
- `POST /api/agents/:id/task` - Assign task
- `POST /api/agents/parallel` - Run agents in parallel
- `POST /api/agents/discussion` - Collaborative discussion

### Clawdbot
- `GET /api/clawdbot/status` - Gateway & skills status
- `POST /api/clawdbot/chat` - Chat via gateway
- `GET /api/clawdbot/skills` - List skills
- `POST /api/clawdbot/memory` - Save to memory

### Channels
- `GET /api/channels/status` - Channel status
- `POST /api/channels/whatsapp/init` - Initialize WhatsApp
- `POST /api/channels/telegram/init` - Initialize Telegram
- `POST /api/channels/discord/init` - Initialize Discord

### Files & Deployment
- `POST /api/upload` - Upload files
- `POST /api/deploy` - Deploy website
- `GET /api/deploy` - List deployed sites

## 🏗️ Project Structure

```
zidni/
├── src/
│   ├── components/         # React UI components
│   ├── features/          # Feature pages
│   │   ├── AgentManager.tsx      # 25 agents UI
│   │   ├── ChannelManager.tsx    # WhatsApp/Telegram/Discord
│   │   ├── WebsiteGenerator.tsx
│   │   ├── SpreadsheetEditor.tsx
│   │   ├── PPTGenerator.tsx
│   │   ├── DeepResearch.tsx
│   │   └── CodePlayground.tsx
│   ├── integrations/      # Clawdbot & channels
│   │   ├── clawd/        # Gateway, Skills, Memory
│   │   └── channels/     # WhatsApp, Telegram, Discord
│   └── services/         # API clients
├── server.cjs            # Express backend
├── Dockerfile            # Docker image
├── docker-compose.yml    # Docker orchestration
├── nginx.conf            # Reverse proxy config
└── DEPLOY.md             # Deployment guide
```

## 🧪 Testing

```bash
# Run feature verification
node test-features.cjs

# Test API
curl http://localhost:3001/api/health
```

## 🌍 Arabic RTL Support

Full right-to-left support with Noto Sans Arabic font.

## 🔐 Security

- Shell commands use allowlist
- Filesystem is sandboxed
- File uploads are size-limited (50MB)
- CORS configured for production
- Optional memory encryption

## 📝 Documentation

- [Deployment Guide](DEPLOY.md) - Azure VPS setup
- [Clawdbot Guide](CLAWDBOT_GUIDE.md) - Clawdbot usage
- [GitHub Setup](README_GITHUB.md) - Push to GitHub

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Inspired by KIMI, Claude, and modern AI assistants
- Clawdbot (Moltbot) architecture
- Moonshot AI (KIMI) for Arabic language support

---

<p align="center">
  Made with ❤️ for the Arabic-speaking AI community
</p>
