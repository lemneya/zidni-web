# زِدْني - Azure VPS Deployment Guide

## Quick Start

### 1. Prepare Your Azure VPS

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Git (optional)
sudo apt install -y git
```

### 2. Upload Zidni to VPS

**Option A: Using SCP**
```bash
# From your local machine
scp -r /path/to/zidni user@your-vps-ip:/home/user/
```

**Option B: Using Git**
```bash
# On VPS
git clone https://your-repo.com/zidni.git
```

**Option C: Using SFTP**
Use FileZilla or similar to upload the `app` folder to `/home/user/zidni`

### 3. Configure Environment

```bash
cd /home/user/zidni

# Create .env file
nano .env
```

Add your configuration:
```env
# AI Provider
AI_PROVIDER=kimi
KIMI_API_KEY=sk-your-kimi-key-here
KIMI_MODEL=moonshot-v1-8k

# Optional: Other providers
# OPENAI_API_KEY=sk-...
# GEMINI_API_KEY=...

# Server
PORT=3001

# CORS - Your frontend URL
CORS_ORIGIN=https://your-frontend-domain.com

# Optional: Web search
SERPER_API_KEY=your-serper-key

# Optional: Telegram/Discord bots
TELEGRAM_BOT_TOKEN=...
DISCORD_BOT_TOKEN=...
```

### 4. Install Dependencies & Start

```bash
# Install dependencies
npm install

# Test start
npm run server

# If working, stop and start with PM2
Ctrl+C
pm2 start server.cjs --name "zidni-backend"
pm2 save
pm2 startup
```

### 5. Configure Firewall

```bash
# Allow port 3001
sudo ufw allow 3001/tcp

# Or if using Nginx reverse proxy
sudo ufw allow 'Nginx Full'
```

### 6. Setup Nginx (Recommended)

```bash
sudo apt install nginx

# Create config
sudo nano /etc/nginx/sites-available/zidni
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Increase upload size
    client_max_body_size 50M;
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/zidni /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Setup SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 8. Update Frontend

Edit `src/config.ts`:
```typescript
export const API_BASE_URL = 'https://your-domain.com'; // or http://your-vps-ip:3001
```

Rebuild:
```bash
npm run build
```

Deploy the `dist` folder to your static hosting (or serve from VPS).

---

## Docker Deployment (Alternative)

### 1. Create Dockerfile

```dockerfile
FROM node:20-slim

WORKDIR /app

# Install dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "server.cjs"]
```

### 2. Build & Run

```bash
# Build image
docker build -t zidni-backend .

# Run container
docker run -d \
  --name zidni \
  -p 3001:3001 \
  -e AI_PROVIDER=kimi \
  -e KIMI_API_KEY=your-key \
  -v $(pwd)/zidni.db:/app/zidni.db \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/workspace:/app/workspace \
  zidni-backend
```

---

## Verification

Test your backend:
```bash
curl http://your-vps-ip:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "provider": "kimi",
  "configured": true,
  "availableProviders": ["kimi"]
}
```

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs zidni-backend

# Check port usage
sudo lsof -i :3001

# Kill process on port
sudo kill -9 $(sudo lsof -t -i:3001)
```

### CORS errors
Update `CORS_ORIGIN` in `.env` to match your frontend URL exactly.

### Database locked
```bash
# Fix permissions
chmod 666 zidni.db
```

### Out of memory
Add swap:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Updating

```bash
cd /home/user/zidni

# Pull latest changes
git pull

# Or upload new files

# Install new dependencies
npm install

# Restart
pm2 restart zidni-backend
```

---

## Monitoring

```bash
# View logs
pm2 logs zidni-backend

# Monitor resources
pm2 monit

# View status
pm2 status
```
