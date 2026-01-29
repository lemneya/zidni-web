#!/bin/bash
# Zidni GitHub Setup Script
# Run this script to push Zidni to your GitHub repository

echo "🚀 Setting up Zidni for GitHub..."

# 1. Initialize git (if not already done)
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    git branch -m main
fi

# 2. Configure git (replace with your info)
echo "⚙️  Configure git user..."
read -p "Enter your GitHub username: " username
read -p "Enter your email: " email
git config user.name "$username"
git config user.email "$email"

# 3. Add all files
echo "📁 Adding files to git..."
git add .

# 4. Commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: Zidni - Arabic AI Assistant with 25 Agents and Clawdbot Integration

Features:
- 25 AI agents working simultaneously
- Multi-provider AI support (KIMI, OpenAI, Gemini)
- Clawdbot (Moltbot) integration
- Website generator with deployment
- Spreadsheet editor (Excel-style)
- Presentation generator (PPTX)
- Deep research with web search
- Code playground (JavaScript execution)
- Channel manager (WhatsApp, Telegram, Discord)
- File upload and document management
- Tool system (shell, browser, filesystem, memory, search, code)
- Full Arabic RTL interface

Tech Stack:
- React + TypeScript + Vite
- Express.js + SQLite
- Tailwind CSS
- Docker support"

# 5. Add remote repository
echo "🔗 Adding GitHub remote..."
read -p "Enter your GitHub repo URL (e.g., https://github.com/username/zidni.git): " repo_url
git remote add origin "$repo_url"

# 6. Push to GitHub
echo "📤 Pushing to GitHub..."
git push -u origin main

echo "✅ Done! Zidni is now on GitHub: $repo_url"
