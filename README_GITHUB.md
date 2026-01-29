# 🚀 How to Push Zidni to GitHub

## Option 1: Quick Setup Script (Recommended)

```bash
cd /path/to/zidni
chmod +x GIT_SETUP.sh
./GIT_SETUP.sh
```

## Option 2: Manual Setup

### Step 1: Initialize Git
```bash
cd /path/to/zidni
git init
git branch -m main
```

### Step 2: Configure Git
```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### Step 3: Add Files
```bash
git add .
```

### Step 4: Commit
```bash
git commit -m "Initial commit: Zidni - Arabic AI Assistant"
```

### Step 5: Create GitHub Repository
1. Go to https://github.com/new
2. Enter repository name: `zidni`
3. Choose: Public or Private
4. Click "Create repository"

### Step 6: Add Remote and Push
```bash
git remote add origin https://github.com/YOUR_USERNAME/zidni.git
git push -u origin main
```

---

## 📋 What Gets Uploaded

### ✅ Included
- All source code (React, Express, integrations)
- Configuration files
- Documentation (README, guides)
- Docker files
- Database schema

### ❌ Excluded (via .gitignore)
- `node_modules/` - Dependencies (use npm install)
- `.env` - Environment variables (create manually)
- `*.db` - SQLite database (auto-created)
- `uploads/` - User uploads
- `dist/` - Build output (auto-generated)
- Log files

---

## 🔐 Environment Variables to Set on Server

After cloning on your server, create `.env`:

```bash
# AI Provider
AI_PROVIDER=kimi
KIMI_API_KEY=sk-your-kimi-key
KIMI_MODEL=moonshot-v1-8k

# Optional: Other providers
# OPENAI_API_KEY=sk-...
# GEMINI_API_KEY=...

# Server
PORT=3001
CORS_ORIGIN=https://your-domain.com

# Features
TOOLS_ENABLED=true
```

---

## 🐳 Docker Deployment from GitHub

```bash
# Clone from GitHub
git clone https://github.com/YOUR_USERNAME/zidni.git
cd zidni

# Create .env
cp .env.example .env
nano .env  # Edit with your keys

# Run with Docker
docker-compose up -d
```

---

## 📁 Project Structure on GitHub

```
zidni/
├── 📁 src/                    # Frontend React code
│   ├── components/           # UI components
│   ├── features/             # Feature pages
│   ├── integrations/         # Clawdbot, channels
│   └── services/             # API clients
├── 📄 server.cjs             # Express backend
├── 📄 package.json           # Dependencies
├── 📄 Dockerfile             # Docker config
├── 📄 docker-compose.yml     # Docker orchestration
├── 📄 .env.example           # Environment template
├── 📄 README.md              # Main documentation
├── 📄 DEPLOY.md              # Deployment guide
├── 📄 CLAWDBOT_GUIDE.md      # Clawdbot usage
└── 📄 FEATURES_TEST.md       # Feature verification
```

---

## 🔄 Keeping Updated

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Restart server
pm2 restart zidni-backend
```

---

## 🆘 Troubleshooting

### Large File Error
```bash
# If some files are too large
git rm --cached node_modules -r
git commit -m "Remove node_modules"
```

### Authentication Issues
```bash
# Use SSH instead of HTTPS
git remote set-url origin git@github.com:YOUR_USERNAME/zidni.git
```

### Merge Conflicts
```bash
git pull origin main --rebase
# Fix conflicts, then:
git add .
git rebase --continue
git push
```
