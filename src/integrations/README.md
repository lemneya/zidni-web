# Clawdbot (Moltbot) Integration for Zidni

This directory contains the full Clawdbot integration for Zidni, providing multi-channel messaging capabilities and skill execution.

## Overview

Clawdbot (formerly Moltbot) is an open-source AI assistant framework with 8k+ GitHub stars. This integration brings Clawdbot's capabilities to Zidni, including:

- **Multi-channel messaging** (WhatsApp, Telegram, Discord)
- **Skill execution system**
- **Persistent memory**
- **WebSocket gateway connection**

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Zidni                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   Chat UI   │  │  Features   │  │  Channel Manager │ │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘ │
│         │                │                   │          │
│  ┌──────▼────────────────▼───────────────────▼────────┐ │
│  │                    Backend API                      │ │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────────┐ │ │
│  │  │  Clawd   │ │  Skills  │ │  Channel Connectors │ │ │
│  │  │ Gateway  │ │  Loader  │ │  (WhatsApp/Te/Dis) │ │ │
│  │  └────┬─────┘ └────┬─────┘ └────────┬───────────┘ │ │
│  └───────┼────────────┼────────────────┼─────────────┘ │
│          │            │                │               │
└──────────┼────────────┼────────────────┼───────────────┘
           │            │                │
           ▼            ▼                ▼
    ┌────────────┐ ┌─────────┐  ┌──────────────────┐
    │  Clawdbot  │ │  Skills │  │  WhatsApp Web    │
    │  Gateway   │ │  Repo   │  │  Telegram Bot    │
    │  (WS)      │ │         │  │  Discord Bot     │
    └────────────┘ └─────────┘  └──────────────────┘
```

## Components

### 1. Gateway (`clawd/gateway.cjs`)
WebSocket connector to Clawdbot gateway for real-time AI communication.

```javascript
const { ClawdGateway } = require('./src/integrations/clawd');

const gateway = new ClawdGateway({
  url: 'ws://localhost:18789',
  apiUrl: 'http://localhost:18789'
});

await gateway.connect();
const response = await gateway.chat('Hello!');
```

### 2. Skills Loader (`clawd/skills.cjs`)
Loads and executes Clawdbot skills from SKILL.md files.

```javascript
const { SkillLoader } = require('./src/integrations/clawd');

const loader = new SkillLoader();
await loader.loadAllSkills();

const result = await loader.executeSkill('web_search', { query: 'AI news' });
```

### 3. Memory (`clawd/memory.cjs`)
Persistent storage for conversations and user data.

```javascript
const { ZidniMemory } = require('./src/integrations/clawd');

const memory = new ZidniMemory();
await memory.set('user_preference', { theme: 'dark' });
const pref = await memory.get('user_preference');
```

### 4. Channel Manager (`channels/index.cjs`)
Unified interface for WhatsApp, Telegram, and Discord.

```javascript
const { ChannelManager } = require('./src/integrations/clawd');

const channels = new ChannelManager({ db });

// Initialize channels
await channels.initializeWhatsApp();
await channels.initializeTelegram({ token: 'YOUR_BOT_TOKEN' });
await channels.initializeDiscord({ token: 'YOUR_BOT_TOKEN' });

// Send message
await channels.sendMessage('whatsapp', '1234567890', 'Hello!');
```

## Channel Connectors

### WhatsApp (`channels/whatsapp.cjs`)
- Uses Baileys library for WhatsApp Web integration
- Supports QR code authentication
- Handles text, media, and document messages

### Telegram (`channels/telegram.cjs`)
- Uses Telegram Bot API
- Supports polling and webhook modes
- Handles commands, inline keyboards, and media

### Discord (`channels/discord.cjs`)
- Uses discord.js library
- Supports slash commands
- Handles embeds, reactions, and guild management

## API Endpoints

### Channel Management
- `GET /api/channels/status` - Get all channel statuses
- `POST /api/channels/whatsapp/init` - Initialize WhatsApp
- `POST /api/channels/telegram/init` - Initialize Telegram
- `POST /api/channels/discord/init` - Initialize Discord
- `GET /api/channels/whatsapp/qr` - Get WhatsApp QR code
- `POST /api/channels/:channel/send` - Send message
- `GET /api/channels/messages` - Get message history
- `POST /api/channels/stop` - Stop all channels

## Environment Variables

```bash
# Clawdbot Gateway
CLAWD_GATEWAY_URL=ws://localhost:18789
CLAWD_API_URL=http://localhost:18789

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token

# Discord
DISCORD_BOT_TOKEN=your_bot_token

# WhatsApp (no token needed, uses QR)
```

## Usage

### Frontend - Channel Manager UI
Navigate to `/channels` in the Zidni interface to:
- Connect WhatsApp via QR code
- Connect Telegram with bot token
- Connect Discord with bot token
- Send messages through any channel
- View incoming message history

### Backend - Programmatic Usage
```javascript
const ChannelManager = require('./src/integrations/channels');

const manager = new ChannelManager({ db });

// Set up AI handler for automatic responses
manager.setAIHandler(async ({ message, channel, userId, username }) => {
  // Process with your AI
  return { text: `Hello ${username}! You said: ${message}` };
});

// Start channels
await manager.initializeWhatsApp();
await manager.initializeTelegram({ token: process.env.TELEGRAM_BOT_TOKEN });
```

## Database Schema

### channel_messages
```sql
CREATE TABLE channel_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT,
  message_id TEXT,
  user_id TEXT,
  username TEXT,
  content TEXT,
  type TEXT DEFAULT 'text',
  is_outgoing INTEGER DEFAULT 0,
  chat_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### channel_sessions
```sql
CREATE TABLE channel_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT UNIQUE,
  status TEXT DEFAULT 'disconnected',
  config TEXT,
  qr_code TEXT,
  last_connected DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Security Considerations

1. **Token Storage**: Store bot tokens securely in environment variables
2. **Rate Limiting**: Built-in rate limiting for message sending
3. **Message Validation**: All incoming messages are validated before processing
4. **QR Code Expiry**: WhatsApp QR codes expire after a short time

## Troubleshooting

### WhatsApp Not Connecting
- Ensure phone has internet connection
- Check that WhatsApp Web works on the phone
- Try reinitializing to get a new QR code

### Telegram Bot Not Responding
- Verify bot token is correct
- Check that bot is not blocked by user
- Ensure webhook URL is accessible (if using webhook mode)

### Discord Bot Offline
- Verify bot token is correct
- Check bot permissions in the server
- Ensure required intents are enabled

## License

This integration follows the same license as Zidni and Clawdbot (MIT).
