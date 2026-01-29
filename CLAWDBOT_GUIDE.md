# 🤖 Clawdbot (Moltbot) Integration Guide

## Overview

Clawdbot (formerly Moltbot) is an open-source AI assistant framework integrated into Zidni. It provides:

- **Gateway Connector** - WebSocket connection to external AI services
- **Skill System** - Load and execute reusable AI skills
- **Enhanced Memory** - Persistent storage with encryption and TTL
- **25 Built-in Skills** - Ready-to-use capabilities

---

## ✅ Current Status

| Component | Status | Details |
|-----------|--------|---------|
| Gateway | ⚠️ Optional | Connects to external Clawdbot server (default: localhost:18789) |
| Skills | ✅ 4 Loaded | browser, code, github, search |
| Memory | ✅ Working | Persistent storage with cache |
| API Endpoints | ✅ All Working | Full REST API available |

---

## 🔌 API Endpoints

### Gateway Status
```bash
GET /api/clawdbot/status
```

Response:
```json
{
  "gateway": {
    "connected": false,
    "url": "ws://localhost:18789",
    "reconnectAttempts": 7
  },
  "skills": {
    "loaded": 4,
    "available": ["browser", "code", "github", "search"]
  },
  "memory": {
    "initialized": true,
    "cacheSize": 0
  }
}
```

### Chat Through Clawdbot
```bash
POST /api/clawdbot/chat
Content-Type: application/json

{
  "message": "Hello Clawdbot!",
  "options": {
    "timeout": 60000
  }
}
```

### List Skills
```bash
GET /api/clawdbot/skills
```

Response:
```json
{
  "skills": [
    { "name": "browser", "description": "", "tools": [] },
    { "name": "code", "description": "", "tools": [] },
    { "name": "github", "description": "", "tools": [] },
    { "name": "search", "description": "", "tools": [] }
  ],
  "count": 4
}
```

### Execute Skill
```bash
POST /api/clawdbot/skills/:name/execute
Content-Type: application/json

{
  "input": { "query": "AI news" }
}
```

### Memory Operations

**Save to Memory:**
```bash
POST /api/clawdbot/memory
Content-Type: application/json

{
  "key": "user_preference",
  "value": { "theme": "dark", "language": "ar" },
  "category": "settings",
  "ttl": 86400000,  // 24 hours in ms (optional)
  "encrypt": false   // encrypt value (optional)
}
```

**Get from Memory:**
```bash
GET /api/clawdbot/memory/:key?category=settings
```

**Delete from Memory:**
```bash
DELETE /api/clawdbot/memory/:key?category=settings
```

**Search Memory:**
```bash
GET /api/clawdbot/memory?search=preference
```

**Get by Category:**
```bash
GET /api/clawdbot/memory?category=settings
```

**Clear Cache:**
```bash
POST /api/clawdbot/memory/clear
```

---

## 🛠️ How to Use Clawdbot

### 1. Using Clawdbot Memory (Recommended)

The enhanced memory system is the most useful Clawdbot feature:

```javascript
// Save user preferences
fetch('/api/clawdbot/memory', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: 'user_theme',
    value: 'dark',
    category: 'preferences'
  })
});

// Retrieve later
const response = await fetch('/api/clawdbot/memory/user_theme?category=preferences');
const { value } = await response.json();
// value = 'dark'
```

### 2. Using Skills

Execute pre-built skills:

```javascript
// Execute search skill
const response = await fetch('/api/clawdbot/skills/search/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: { query: 'latest AI developments' }
  })
});
```

### 3. Using Gateway (Requires External Server)

To use the full Clawdbot gateway, you need to run a Clawdbot server:

```bash
# Install Clawdbot (if available)
npm install -g clawdbot

# Start Clawdbot gateway
clawdbot gateway --port 18789
```

Then configure Zidni:

```bash
# In .env
CLAWD_GATEWAY_URL=ws://localhost:18789
CLAWD_API_URL=http://localhost:18789
```

---

## 📁 Skill Development

### Creating Custom Skills

Create a `SKILL.md` file in the `skills/` directory:

```markdown
# My Custom Skill

## Metadata
- Name: my_skill
- Description: Does something useful
- Version: 1.0.0

## Tools
- tool_name: Description of tool

## Handler
```javascript
module.exports = async (input, context) => {
  // Your skill logic here
  return { result: "Success!" };
};
```
```

### Loading Skills

Skills are automatically loaded on server startup:

```
📚 Skills loaded: 4
```

---

## 🔐 Memory Security

### Encryption

Enable encryption for sensitive data:

```bash
# Set encryption key in .env
MEMORY_ENCRYPTION_KEY=your-secret-key-32-chars-long!!
```

```javascript
// Save encrypted value
fetch('/api/clawdbot/memory', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: 'api_key',
    value: 'secret-api-key',
    encrypt: true
  })
});
```

### TTL (Time-To-Live)

Auto-expire memories:

```javascript
// Expires after 1 hour
fetch('/api/clawdbot/memory', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: 'temp_token',
    value: 'abc123',
    ttl: 3600000  // 1 hour in milliseconds
  })
});
```

---

## 🔄 Integration with 25 Agents

Clawdbot memory works seamlessly with the 25-agent system:

```javascript
// Agent saves to shared memory
await agentManager.assignTask('general', 'Remember that user likes dark mode', {
  callbacks: {
    onComplete: async (result) => {
      // Save to Clawdbot memory
      await fetch('/api/clawdbot/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'user_theme',
          value: 'dark',
          category: 'preferences'
        })
      });
    }
  }
});
```

---

## 🧪 Testing Clawdbot

Run the test suite:

```bash
cd /mnt/okcomputer/output/app
node test-features.cjs
```

Test individual endpoints:

```bash
# Status
curl http://localhost:3001/api/clawdbot/status

# Skills
curl http://localhost:3001/api/clawdbot/skills

# Memory - Save
curl -X POST http://localhost:3001/api/clawdbot/memory \
  -H "Content-Type: application/json" \
  -d '{"key": "test", "value": "hello", "category": "test"}'

# Memory - Retrieve
curl http://localhost:3001/api/clawdbot/memory/test?category=test
```

---

## 📊 Comparison: Regular Memory vs Clawdbot Memory

| Feature | Regular Memory | Clawdbot Memory |
|---------|---------------|-----------------|
| Storage | SQLite | File-based + Cache |
| Encryption | ❌ | ✅ Optional |
| TTL | ❌ | ✅ Optional |
| Categories | ✅ | ✅ |
| Search | ❌ | ✅ |
| Cache | ❌ | ✅ In-memory |

---

## 🚀 Advanced Usage

### Memory Categories

Organize memories by category:

```javascript
// User preferences
{ key: 'theme', value: 'dark', category: 'user_prefs' }

// Conversation context
{ key: 'last_topic', value: 'AI', category: 'context' }

// API keys (encrypted)
{ key: 'openai_key', value: 'sk-...', category: 'secrets', encrypt: true }
```

### Batch Operations

```javascript
// Save multiple memories
const memories = [
  { key: 'pref1', value: 'val1', category: 'prefs' },
  { key: 'pref2', value: 'val2', category: 'prefs' }
];

await Promise.all(memories.map(m => 
  fetch('/api/clawdbot/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(m)
  })
));
```

---

## 📝 Environment Variables

```bash
# Clawdbot Gateway (optional)
CLAWD_GATEWAY_URL=ws://localhost:18789
CLAWD_API_URL=http://localhost:18789

# Memory Encryption (optional)
MEMORY_ENCRYPTION_KEY=your-32-char-secret-key

# Skills Directory (optional)
SKILLS_DIR=./skills
```

---

## ✅ Summary

| Feature | Status | How to Use |
|---------|--------|------------|
| Gateway | ⚠️ Optional | Requires external Clawdbot server |
| Skills | ✅ Ready | `GET /api/clawdbot/skills` |
| Memory | ✅ Ready | `POST /api/clawdbot/memory` |
| Encryption | ✅ Ready | Set `encrypt: true` |
| TTL | ✅ Ready | Set `ttl: milliseconds` |

**Clawdbot is fully integrated and ready to use!** The memory system and skills work without needing an external gateway server.
