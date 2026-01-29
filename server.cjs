const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const Database = require('better-sqlite3');
const pdfParse = require('pdf-parse');
const cheerio = require('cheerio');
const cron = require('node-cron');
require('dotenv').config();

// Multi-Agent System
const AgentManager = require('./src/integrations/agents/AgentManager.cjs');

// Clawdbot (Moltbot) Integration
const { ClawdGateway, SkillLoader, ZidniMemory } = require('./src/integrations/clawd/index.cjs');

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3001;

// ==================== CONFIGURATION ====================
const AI_PROVIDER = process.env.AI_PROVIDER || 'demo';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const KIMI_API_KEY = process.env.KIMI_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY;

// KIMI (Moonshot AI) Configuration
const KIMI_BASE_URL = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';

// Tool execution settings
const TOOLS_ENABLED = process.env.TOOLS_ENABLED !== 'false';
const SHELL_ALLOWLIST = (process.env.SHELL_ALLOWLIST || 'ls,cat,echo,pwd,date,whoami,uname,head,tail,grep,find,wc').split(',');
const MAX_SHELL_OUTPUT = 10000;
const MAX_EXECUTION_TIME = 30000;

// Ensure directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const workspaceDir = path.join(__dirname, 'workspace');
const skillsDir = path.join(__dirname, 'skills');
const deployedDir = path.join(__dirname, 'deployed');

async function ensureDirs() {
  for (const dir of [uploadsDir, workspaceDir, skillsDir, deployedDir]) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (e) {}
  }
}
ensureDirs();

// ==================== DATABASE ====================
const db = new Database(path.join(__dirname, 'zidni.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER,
    role TEXT,
    content TEXT,
    tool_calls TEXT,
    attachments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    original_name TEXT,
    mime_type TEXT,
    size INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    value TEXT,
    category TEXT DEFAULT 'general',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    cron_expression TEXT,
    command TEXT,
    enabled INTEGER DEFAULT 1,
    last_run DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS browser_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE,
    url TEXT,
    title TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS deployed_websites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE,
    title TEXT,
    prompt TEXT,
    html_content TEXT,
    views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS channel_messages (
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
  
  CREATE TABLE IF NOT EXISTS channel_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT UNIQUE,
    status TEXT DEFAULT 'disconnected',
    config TEXT,
    qr_code TEXT,
    last_connected DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ==================== MIDDLEWARE ====================
// CORS configuration - allow all in development, specific origins in production
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(uploadsDir));
app.use('/workspace', express.static(workspaceDir));
app.use('/site', express.static(deployedDir));

// Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf', 'text/plain', 'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel', 'text/csv', 'image/jpeg', 'image/png', 'image/webp',
      'application/json', 'text/javascript', 'text/html', 'text/css',
      'text/x-python', 'application/x-httpd-php'
    ];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

// ==================== MULTI-AGENT SYSTEM ====================
const agentManager = new AgentManager({
  db,
  aiProvider: AI_PROVIDER,
  kimiKey: KIMI_API_KEY,
  openaiKey: OPENAI_API_KEY,
  geminiKey: GEMINI_API_KEY,
  maxConcurrentAgents: 25
});

// Agent event listeners
agentManager.on('task:start', ({ taskId, agentId }) => {
  console.log(`🤖 Agent ${agentId} started task ${taskId}`);
});

agentManager.on('task:complete', ({ taskId, result }) => {
  console.log(`✅ Task ${taskId} completed`);
});

agentManager.on('task:error', ({ taskId, error }) => {
  console.log(`❌ Task ${taskId} failed: ${error}`);
});

// ==================== CLAWDBOT (Moltbot) INTEGRATION ====================

// Initialize Clawdbot Gateway (for external AI connection - OPTIONAL)
let clawdGateway;
try {
  clawdGateway = new ClawdGateway({
    url: process.env.CLAWD_GATEWAY_URL || 'ws://localhost:18789',
    apiUrl: process.env.CLAWD_API_URL || 'http://localhost:18789',
    autoReconnect: false  // Don't auto-reconnect if not available
  });

  // Set up event handlers before connecting
  clawdGateway.on('connected', () => {
    console.log('🔗 Connected to Clawdbot gateway');
  });

  clawdGateway.on('message', (message) => {
    console.log('📨 Clawdbot message:', message);
  });

  clawdGateway.on('error', (error) => {
    // Silently handle errors - gateway is optional
  });

  clawdGateway.on('disconnected', () => {
    console.log('🔌 Clawdbot gateway disconnected');
  });

  // Try to connect (non-blocking)
  clawdGateway.connect().catch(() => {
    console.log('⚠️  Clawdbot gateway not available (optional)');
  });
} catch (error) {
  console.log('⚠️  Clawdbot gateway initialization failed (optional)');
  // Create a mock gateway that returns empty responses
  clawdGateway = {
    isConnected: false,
    url: 'not-connected',
    reconnectAttempts: 0,
    connect: async () => false,
    chat: async () => { throw new Error('Gateway not connected'); },
    on: () => {},
    emit: () => {},
    executeSkill: async () => { throw new Error('Gateway not connected'); },
    getSkills: async () => [],
    getSkillInfo: async () => null,
    disconnect: () => {},
    getStatus: () => ({ connected: false })
  };
}

// Initialize Skill Loader
const skillLoader = new SkillLoader({
  skillsDir: path.join(__dirname, 'skills'),
  clawdSkillsDir: path.join(require('os').homedir(), '.clawdbot', 'skills')
});

// Load all available skills
skillLoader.loadAllSkills().then(() => {
  console.log('📚 Skills loaded:', skillLoader.loadedSkills.size);
}).catch(err => {
  console.log('⚠️  No skills loaded (optional):', err.message);
});

// Initialize Zidni Memory (enhanced persistent storage)
const zidniMemory = new ZidniMemory({
  memoryDir: path.join(require('os').homedir(), '.zidni', 'memory'),
  encryptionKey: process.env.MEMORY_ENCRYPTION_KEY
});

console.log('🧠 Zidni Memory initialized');

// ==================== TOOL SYSTEM (Moltbot-style) ====================

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.registerCoreTools();
  }

  register(name, config) {
    this.tools.set(name, config);
  }

  get(name) {
    return this.tools.get(name);
  }

  getAll() {
    return Array.from(this.tools.entries()).map(([name, config]) => ({
      name,
      description: config.description,
      parameters: config.parameters
    }));
  }

  registerCoreTools() {
    // Shell execution tool
    this.register('shell', {
      description: 'تنفيذ أوامر shell في بيئة آمنة',
      parameters: {
        command: { type: 'string', description: 'الأمر المراد تنفيذه' },
        cwd: { type: 'string', description: 'مجلد العمل', optional: true }
      },
      execute: async (params) => await executeShell(params.command, params.cwd)
    });

    // Browser tool
    this.register('browser', {
      description: 'التنقل في الويب واستخراج المحتوى',
      parameters: {
        action: { type: 'string', enum: ['navigate', 'search', 'extract', 'screenshot'], description: 'الإجراء' },
        url: { type: 'string', description: 'الرابط', optional: true },
        query: { type: 'string', description: 'استعلام البحث', optional: true },
        selector: { type: 'string', description: 'محدد CSS', optional: true }
      },
      execute: async (params) => await browserTool(params)
    });

    // File system tool
    this.register('filesystem', {
      description: 'قراءة وكتابة الملفات',
      parameters: {
        action: { type: 'string', enum: ['read', 'write', 'list', 'delete', 'exists'], description: 'الإجراء' },
        path: { type: 'string', description: 'مسار الملف أو المجلد' },
        content: { type: 'string', description: 'المحتوى للكتابة', optional: true }
      },
      execute: async (params) => await filesystemTool(params)
    });

    // Memory tool
    this.register('memory', {
      description: 'حفظ واسترجاع المعلومات من الذاكرة',
      parameters: {
        action: { type: 'string', enum: ['set', 'get', 'delete', 'list'], description: 'الإجراء' },
        key: { type: 'string', description: 'المفتاح', optional: true },
        value: { type: 'string', description: 'القيمة', optional: true },
        category: { type: 'string', description: 'الفئة', optional: true }
      },
      execute: async (params) => await memoryTool(params)
    });

    // Search tool
    this.register('search', {
      description: 'البحث في الويب',
      parameters: {
        query: { type: 'string', description: 'استعلام البحث' },
        num_results: { type: 'number', description: 'عدد النتائج', optional: true }
      },
      execute: async (params) => await searchTool(params)
    });

    // Code execution tool
    this.register('code', {
      description: 'تنفيذ كود JavaScript',
      parameters: {
        code: { type: 'string', description: 'الكود المراد تنفيذه' },
        timeout: { type: 'number', description: 'المدة القصوى بالمللي ثانية', optional: true }
      },
      execute: async (params) => await codeTool(params)
    });
  }
}

const toolRegistry = new ToolRegistry();

// ==================== TOOL IMPLEMENTATIONS ====================

async function executeShell(command, cwd = workspaceDir) {
  if (!TOOLS_ENABLED) {
    return { error: 'الأدوات معطلة', output: '' };
  }

  // Security: Check allowlist
  const baseCommand = command.trim().split(' ')[0];
  if (!SHELL_ALLOWLIST.includes(baseCommand)) {
    return { 
      error: `الأمر "${baseCommand}" غير مسموح. الأوامر المسموحة: ${SHELL_ALLOWLIST.join(', ')}`,
      output: '' 
    };
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: MAX_EXECUTION_TIME,
      maxBuffer: MAX_SHELL_OUTPUT
    });
    
    return {
      output: stdout.substring(0, MAX_SHELL_OUTPUT),
      error: stderr || null
    };
  } catch (error) {
    return {
      output: error.stdout?.substring(0, MAX_SHELL_OUTPUT) || '',
      error: error.message
    };
  }
}

// Browser automation (lazy-load puppeteer)
let puppeteer;
let browserInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    puppeteer = require('puppeteer');
    browserInstance = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserInstance;
}

async function browserTool(params) {
  if (!TOOLS_ENABLED) {
    return { error: 'الأدوات معطلة' };
  }

  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    switch (params.action) {
      case 'navigate':
        await page.goto(params.url, { waitUntil: 'networkidle2', timeout: 30000 });
        const title = await page.title();
        const content = await page.evaluate(() => document.body.innerText.substring(0, 5000));
        await page.close();
        return { title, content, url: params.url };

      case 'search':
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(params.query)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        const results = await page.evaluate(() => {
          const items = [];
          document.querySelectorAll('div.g').forEach(el => {
            const title = el.querySelector('h3')?.textContent;
            const link = el.querySelector('a')?.href;
            const snippet = el.querySelector('div.VwiC3b')?.textContent;
            if (title && link) items.push({ title, link, snippet });
          });
          return items.slice(0, 5);
        });
        await page.close();
        return { results };

      case 'extract':
        await page.goto(params.url, { waitUntil: 'networkidle2', timeout: 30000 });
        const extracted = params.selector 
          ? await page.evaluate(sel => document.querySelector(sel)?.textContent, params.selector)
          : await page.evaluate(() => document.body.innerText.substring(0, 10000));
        await page.close();
        return { content: extracted };

      default:
        await page.close();
        return { error: 'إجراء غير معروف' };
    }
  } catch (error) {
    return { error: error.message };
  }
}

async function filesystemTool(params) {
  if (!TOOLS_ENABLED) {
    return { error: 'الأدوات معطلة' };
  }

  const targetPath = path.join(workspaceDir, params.path);
  
  // Security: Ensure path is within workspace
  if (!targetPath.startsWith(workspaceDir)) {
    return { error: 'مسار غير مسموح' };
  }

  try {
    switch (params.action) {
      case 'read':
        const content = await fs.readFile(targetPath, 'utf-8');
        return { content: content.substring(0, 50000) };

      case 'write':
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, params.content);
        return { success: true, path: params.path };

      case 'list':
        const entries = await fs.readdir(targetPath, { withFileTypes: true });
        return { 
          entries: entries.map(e => ({
            name: e.name,
            type: e.isDirectory() ? 'directory' : 'file'
          }))
        };

      case 'delete':
        await fs.unlink(targetPath);
        return { success: true };

      case 'exists':
        try {
          await fs.access(targetPath);
          return { exists: true };
        } catch {
          return { exists: false };
        }

      default:
        return { error: 'إجراء غير معروف' };
    }
  } catch (error) {
    return { error: error.message };
  }
}

async function memoryTool(params) {
  try {
    switch (params.action) {
      case 'set':
        db.prepare(`
          INSERT INTO memory (key, value, category) 
          VALUES (?, ?, ?) 
          ON CONFLICT(key) DO UPDATE SET value=?, updated_at=CURRENT_TIMESTAMP
        `).run(params.key, params.value, params.category || 'general', params.value);
        return { success: true };

      case 'get':
        const row = db.prepare('SELECT * FROM memory WHERE key = ?').get(params.key);
        return { value: row?.value || null, category: row?.category };

      case 'delete':
        db.prepare('DELETE FROM memory WHERE key = ?').run(params.key);
        return { success: true };

      case 'list':
        const rows = db.prepare('SELECT * FROM memory WHERE category = ? OR ? IS NULL')
          .all(params.category, params.category);
        return { entries: rows };

      default:
        return { error: 'إجراء غير معروف' };
    }
  } catch (error) {
    return { error: error.message };
  }
}

async function searchTool(params) {
  if (!SERPER_API_KEY) {
    return { error: 'مفتاح البحث غير مكون', results: [] };
  }

  try {
    const response = await axios.post('https://google.serper.dev/search', {
      q: params.query,
      num: params.num_results || 5,
      hl: 'ar',
      gl: 'sa'
    }, {
      headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' }
    });

    return {
      results: response.data.organic?.map(r => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet
      })) || []
    };
  } catch (error) {
    return { error: error.message, results: [] };
  }
}

async function codeTool(params) {
  try {
    const logs = [];
    const mockConsole = {
      log: (...args) => logs.push(args.map(a => String(a)).join(' ')),
      error: (...args) => logs.push('Error: ' + args.map(a => String(a)).join(' ')),
      warn: (...args) => logs.push('Warn: ' + args.map(a => String(a)).join(' '))
    };

    const func = new Function('console', params.code);
    func(mockConsole);

    return { output: logs.join('\n'), error: null };
  } catch (error) {
    return { output: '', error: error.message };
  }
}

// ==================== AI INTEGRATION WITH TOOLS ====================

async function callWithTools(messages, tools) {
  const toolDefinitions = tools.map(name => {
    const tool = toolRegistry.get(name);
    return {
      type: 'function',
      function: {
        name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters,
          required: Object.entries(tool.parameters)
            .filter(([_, p]) => !p.optional)
            .map(([k]) => k)
        }
      }
    };
  });

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `أنت زِدْني، مساعد ذكاء اصطناعي متقدم. لديك أدوات متاحة للاستخدام.
          عندما تحتاج إلى استخدام أداة، استدعها بالصيغة المناسبة.
          الأدوات المتاحة: ${tools.join(', ')}`
        },
        ...messages
      ],
      tools: toolDefinitions,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 4000,
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.choices[0];
}

async function processToolCalls(choice) {
  const toolCalls = choice.message.tool_calls;
  if (!toolCalls || toolCalls.length === 0) {
    return { content: choice.message.content, toolResults: [] };
  }

  const results = [];
  for (const call of toolCalls) {
    const toolName = call.function.name;
    const params = JSON.parse(call.function.arguments);
    const tool = toolRegistry.get(toolName);
    
    if (tool) {
      const result = await tool.execute(params);
      results.push({
        tool: toolName,
        params,
        result
      });
    }
  }

  return {
    content: choice.message.content,
    toolResults: results
  };
}

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
  const isConfigured = AI_PROVIDER === 'demo' || 
    (AI_PROVIDER === 'openai' && OPENAI_API_KEY) ||
    (AI_PROVIDER === 'gemini' && GEMINI_API_KEY) ||
    (AI_PROVIDER === 'kimi' && KIMI_API_KEY);

  // Check which providers are available
  const availableProviders = [];
  if (OPENAI_API_KEY) availableProviders.push('openai');
  if (GEMINI_API_KEY) availableProviders.push('gemini');
  if (KIMI_API_KEY) availableProviders.push('kimi');

  res.json({
    status: 'ok',
    provider: AI_PROVIDER,
    configured: isConfigured,
    availableProviders,
    tools: {
      enabled: TOOLS_ENABLED,
      available: toolRegistry.getAll().map(t => t.name)
    },
    features: {
      chat: true,
      fileUpload: true,
      webSearch: !!SERPER_API_KEY,
      codeExecution: true,
      database: true,
      shell: TOOLS_ENABLED,
      browser: TOOLS_ENABLED,
      filesystem: TOOLS_ENABLED,
      memory: true
    },
    message: isConfigured ? 'زِدْني جاهز مع الأدوات!' : 'وضع العرض التوضيحي نشط'
  });
});

// Get available tools
app.get('/api/tools', (req, res) => {
  res.json({ tools: toolRegistry.getAll() });
});

// Get KIMI models
app.get('/api/kimi/models', (req, res) => {
  const models = [
    {
      id: 'moonshot-v1-8k',
      name: 'Moonshot v1 (8K)',
      description: 'نموذج سريع مع سياق 8K مناسب للمحادثات العامة',
      contextWindow: 8192,
      recommended: true
    },
    {
      id: 'moonshot-v1-32k',
      name: 'Moonshot v1 (32K)',
      description: 'نموذج متوسط مع سياق 32K مناسب للمستندات الطويلة',
      contextWindow: 32768,
      recommended: false
    },
    {
      id: 'moonshot-v1-128k',
      name: 'Moonshot v1 (128K)',
      description: 'نموذج قوي مع سياق 128K مناسب للمستندات الكبيرة جداً',
      contextWindow: 131072,
      recommended: false
    }
  ];
  
  res.json({ 
    models,
    currentModel: process.env.KIMI_MODEL || 'moonshot-v1-8k',
    provider: 'kimi'
  });
});

// Get KIMI usage/stats (placeholder - KIMI doesn't have a usage endpoint yet)
app.get('/api/kimi/stats', (req, res) => {
  res.json({
    provider: 'kimi',
    model: process.env.KIMI_MODEL || 'moonshot-v1-8k',
    status: KIMI_API_KEY ? 'connected' : 'not_configured'
  });
});

// Execute a tool directly
app.post('/api/tools/:name', async (req, res) => {
  const tool = toolRegistry.get(req.params.name);
  if (!tool) {
    return res.status(404).json({ error: 'الأداة غير موجودة' });
  }

  try {
    const result = await tool.execute(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat with tools
app.post('/api/chat', async (req, res) => {
  try {
    const { 
      message, 
      conversationId, 
      history = [], 
      files = [],
      webSearch = false,
      agent = 'default',
      useTools = false,
      tools = ['shell', 'browser', 'filesystem', 'search', 'code'],
      // KIMI-specific options
      stream = false,
      model,
      temperature,
      maxTokens,
      systemPrompt,
      topP,
      frequencyPenalty,
      presencePenalty
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'الرسالة مطلوبة' });
    }

    // Get file contents
    let fileContents = '';
    for (const fileId of files) {
      const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId);
      if (file) {
        fileContents += `\n\n--- ملف: ${file.original_name} ---\n${file.content?.substring(0, 5000)}\n---`;
      }
    }

    let fullMessage = message + fileContents;

    // Build messages
    const messages = [...history, { role: 'user', content: fullMessage }];

    // KIMI options
    const kimiOptions = {
      model,
      temperature,
      maxTokens,
      systemPrompt,
      topP,
      frequencyPenalty,
      presencePenalty,
      stream
    };

    let responseText;
    let toolResults = [];
    let isDemo = false;

    // Handle streaming for KIMI
    if (stream && AI_PROVIDER === 'kimi' && KIMI_API_KEY) {
      return await kimiChatStream(messages, res, kimiOptions);
    }

    // Use AI with tools if enabled
    if (useTools && OPENAI_API_KEY && TOOLS_ENABLED) {
      try {
        const choice = await callWithTools(messages, tools);
        const processed = await processToolCalls(choice);
        responseText = processed.content || 'تم تنفيذ الأدوات';
        toolResults = processed.toolResults;
      } catch (error) {
        console.error('Tool call error:', error.message);
        // Fallback to regular chat
        responseText = await openAIChat(messages);
      }
    } else if (AI_PROVIDER === 'openai' && OPENAI_API_KEY) {
      responseText = await openAIChat(messages);
    } else if (AI_PROVIDER === 'gemini' && GEMINI_API_KEY) {
      responseText = await geminiChat(messages);
    } else if (AI_PROVIDER === 'kimi' && KIMI_API_KEY) {
      responseText = await kimiChat(messages, kimiOptions);
    } else {
      responseText = `مرحباً! أنا زِدْني في وضع العرض.\n\nالأدوات المتاحة:\n- shell: تنفيذ أوامر\n- browser: تصفح الويب\n- filesystem: إدارة الملفات\n- search: البحث\n- code: تنفيذ كود\n\nأضف KIMI_API_KEY أو OPENAI_API_KEY للحصول على ردود ذكية.`;
      isDemo = true;
    }

    // Save to database
    if (conversationId) {
      db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
        .run(conversationId, 'user', message);
      
      const toolCallsJson = toolResults.length > 0 ? JSON.stringify(toolResults) : null;
      db.prepare('INSERT INTO messages (conversation_id, role, content, tool_calls) VALUES (?, ?, ?, ?)')
        .run(conversationId, 'model', responseText, toolCallsJson);
      
      db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(conversationId);
    }

    res.json({
      response: responseText,
      toolResults: toolResults.length > 0 ? toolResults : undefined,
      demo: isDemo,
      provider: AI_PROVIDER,
      model: model || process.env.KIMI_MODEL || 'moonshot-v1-8k'
    });

  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions for AI
async function openAIChat(messages) {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'أنت زِدْني، مساعد ذكاء اصطناعي متقدم.' },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 4000,
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.choices[0].message.content;
}

async function geminiChat(messages) {
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
  const contents = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const response = await axios.post(
    `${GEMINI_API_URL}/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 4000 }
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  return response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم يتم إنشاء رد';
}

// KIMI (Moonshot AI) Chat - OpenAI-compatible API
async function kimiChat(messages, options = {}) {
  const response = await axios.post(
    `${KIMI_BASE_URL}/chat/completions`,
    {
      model: options.model || process.env.KIMI_MODEL || 'moonshot-v1-8k',
      messages: [
        { role: 'system', content: options.systemPrompt || 'أنت زِدْني، مساعد ذكاء اصطناعي متقدم.' },
        ...messages
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 4000,
      top_p: options.topP ?? 1,
      frequency_penalty: options.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? 0,
      stream: options.stream || false,
    },
    {
      headers: {
        'Authorization': `Bearer ${KIMI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      responseType: options.stream ? 'stream' : 'json',
    }
  );
  
  if (options.stream) {
    return response.data; // Return stream for handling
  }
  
  return response.data.choices[0].message.content;
}

// KIMI Streaming Chat
async function kimiChatStream(messages, res, options = {}) {
  try {
    const response = await axios.post(
      `${KIMI_BASE_URL}/chat/completions`,
      {
        model: options.model || process.env.KIMI_MODEL || 'moonshot-v1-8k',
        messages: [
          { role: 'system', content: options.systemPrompt || 'أنت زِدْني، مساعد ذكاء اصطناعي متقدم.' },
          ...messages
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 4000,
        stream: true,
      },
      {
        headers: {
          'Authorization': `Bearer ${KIMI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
      }
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            res.write('data: [DONE]\n\n');
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          } catch (e) {}
        }
      }
    });

    response.data.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });

    response.data.on('error', (error) => {
      console.error('KIMI stream error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('KIMI streaming error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// ==================== CONVERSATIONS ====================

app.get('/api/conversations', (req, res) => {
  const conversations = db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all();
  res.json({ conversations });
});

app.post('/api/conversations', (req, res) => {
  const { title } = req.body;
  const result = db.prepare('INSERT INTO conversations (title) VALUES (?)')
    .run(title || 'محادثة جديدة');
  res.json({ id: result.lastInsertRowid, title: title || 'محادثة جديدة' });
});

app.delete('/api/conversations/:id', (req, res) => {
  db.prepare('DELETE FROM conversations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/conversations/:id/messages', (req, res) => {
  const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(req.params.id);
  res.json({ 
    messages: messages.map(m => ({
      ...m,
      attachments: m.attachments ? JSON.parse(m.attachments) : null,
      tool_calls: m.tool_calls ? JSON.parse(m.tool_calls) : null
    }))
  });
});

// ==================== FILE UPLOAD ====================

async function extractFileContent(filePath, mimeType) {
  try {
    if (mimeType === 'application/pdf') {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.text;
    }
    if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      return await fs.readFile(filePath, 'utf-8');
    }
    return `[ملف: ${path.basename(filePath)}]`;
  } catch (error) {
    return `[خطأ في قراءة الملف]`;
  }
}

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
    
    const content = await extractFileContent(req.file.path, req.file.mimetype);
    
    const result = db.prepare(
      'INSERT INTO files (filename, original_name, mime_type, size, content) VALUES (?, ?, ?, ?, ?)'
    ).run(req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, content);
    
    res.json({
      id: result.lastInsertRowid,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      content: content.substring(0, 1000)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MEMORY ====================

app.get('/api/memory', (req, res) => {
  const { category } = req.query;
  const rows = category 
    ? db.prepare('SELECT * FROM memory WHERE category = ?').all(category)
    : db.prepare('SELECT * FROM memory').all();
  res.json({ entries: rows });
});

app.post('/api/memory', (req, res) => {
  const { key, value, category = 'general' } = req.body;
  db.prepare(`
    INSERT INTO memory (key, value, category) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value=?, updated_at=CURRENT_TIMESTAMP
  `).run(key, value, category, value);
  res.json({ success: true });
});

app.get('/api/memory/:key', (req, res) => {
  const row = db.prepare('SELECT * FROM memory WHERE key = ?').get(req.params.key);
  res.json(row || { value: null });
});

// ==================== WEBSITE DEPLOYMENT ====================

// Deploy a website
app.post('/api/deploy', async (req, res) => {
  try {
    const { title, prompt, html } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'HTML content required' });
    }

    // Generate unique slug
    const slug = 'site-' + Date.now().toString(36);
    
    // Save to database
    db.prepare(
      'INSERT INTO deployed_websites (slug, title, prompt, html_content) VALUES (?, ?, ?, ?)'
    ).run(slug, title || 'Untitled Website', prompt || '', html);
    
    // Save HTML file
    const filePath = path.join(deployedDir, `${slug}.html`);
    await fs.writeFile(filePath, html);
    
    res.json({
      success: true,
      slug,
      url: `/site/${slug}.html`,
      fullUrl: `http://localhost:${PORT}/site/${slug}.html`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List deployed websites
app.get('/api/deploy', (req, res) => {
  try {
    const websites = db.prepare(
      'SELECT id, slug, title, prompt, views, created_at FROM deployed_websites ORDER BY created_at DESC'
    ).all();
    res.json({ websites });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single deployed website
app.get('/api/deploy/:slug', (req, res) => {
  try {
    const website = db.prepare('SELECT * FROM deployed_websites WHERE slug = ?').get(req.params.slug);
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }
    
    // Increment views
    db.prepare('UPDATE deployed_websites SET views = views + 1 WHERE slug = ?').run(req.params.slug);
    
    res.json({ website });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete deployed website
app.delete('/api/deploy/:slug', (req, res) => {
  try {
    const website = db.prepare('SELECT * FROM deployed_websites WHERE slug = ?').get(req.params.slug);
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }
    
    // Delete from database
    db.prepare('DELETE FROM deployed_websites WHERE slug = ?').run(req.params.slug);
    
    // Delete file
    const filePath = path.join(deployedDir, `${req.params.slug}.html`);
    fs.unlink(filePath).catch(() => {});
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CHANNEL MANAGEMENT ====================

const ChannelManager = require('./src/integrations/channels/index.cjs');

const channelManager = new ChannelManager({ db });

// Set up AI handler for channel messages
channelManager.setAIHandler(async ({ message, channel, userId, username, history, metadata }) => {
  try {
    // Build conversation context
    const messages = [
      { 
        role: 'system', 
        content: `أنت زِدْني، مساعد ذكي متكامل. أنت تتحدث الآن مع ${username} عبر ${channel}.` 
      },
      ...history.map(h => ({
        role: h.from === 'bot' ? 'assistant' : 'user',
        content: h.content
      })),
      { role: 'user', content: message }
    ];

    // Get AI response
    let response;
    if (AI_PROVIDER === 'openai' && OPENAI_API_KEY) {
      response = await openAIChat(messages);
    } else if (AI_PROVIDER === 'gemini' && GEMINI_API_KEY) {
      response = await geminiChat(messages);
    } else if (AI_PROVIDER === 'kimi' && KIMI_API_KEY) {
      // Use smaller model for channel messages for speed
      response = await kimiChat(messages, { 
        model: 'moonshot-v1-8k',
        maxTokens: 1000,
        systemPrompt: `أنت زِدْني، مساعد ذكي متكامل. أنت تتحدث الآن مع ${username} عبر ${channel}. كن مختصراً ومفيداً.`
      });
    } else {
      response = `مرحباً ${username}! تلقيت رسالتك: "${message}"\n\n(وضع العرض التجريبي - قم بإعداد مفتاح KIMI أو OpenAI أو Gemini للحصول على ردود AI حقيقية)`;
    }

    return { text: response };
  } catch (error) {
    console.error('AI handler error:', error);
    return { text: 'عذراً، حدث خطأ أثناء معالجة رسالتك.' };
  }
});

// Channel event listeners
channelManager.on('whatsapp:qr', (qr) => {
  console.log('📱 WhatsApp QR code received');
  // Store QR in database for frontend to display
  db.prepare(`
    INSERT INTO channel_sessions (channel, status, qr_code) 
    VALUES ('whatsapp', 'awaiting_qr', ?)
    ON CONFLICT(channel) DO UPDATE SET qr_code=?, status='awaiting_qr'
  `).run(qr, qr);
});

channelManager.on('whatsapp:connected', () => {
  console.log('📱 WhatsApp connected');
  db.prepare(`
    INSERT INTO channel_sessions (channel, status, last_connected) 
    VALUES ('whatsapp', 'connected', CURRENT_TIMESTAMP)
    ON CONFLICT(channel) DO UPDATE SET status='connected', last_connected=CURRENT_TIMESTAMP, qr_code=NULL
  `).run();
});

channelManager.on('telegram:started', (bot) => {
  console.log('📱 Telegram bot started:', bot.username);
  db.prepare(`
    INSERT INTO channel_sessions (channel, status, config) 
    VALUES ('telegram', 'connected', ?)
    ON CONFLICT(channel) DO UPDATE SET status='connected', config=?
  `).run(JSON.stringify(bot), JSON.stringify(bot));
});

channelManager.on('discord:ready', (info) => {
  console.log('📱 Discord bot ready:', info.tag);
  db.prepare(`
    INSERT INTO channel_sessions (channel, status, config) 
    VALUES ('discord', 'connected', ?)
    ON CONFLICT(channel) DO UPDATE SET status='connected', config=?
  `).run(JSON.stringify(info), JSON.stringify(info));
});

// ==================== CHANNEL API ENDPOINTS ====================

// Get channel status
app.get('/api/channels/status', (req, res) => {
  try {
    const status = channelManager.getStatus();
    const sessions = db.prepare('SELECT * FROM channel_sessions').all();
    res.json({ 
      connectors: status,
      sessions: sessions.map(s => ({
        ...s,
        config: s.config ? JSON.parse(s.config) : null
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize WhatsApp
app.post('/api/channels/whatsapp/init', async (req, res) => {
  try {
    const result = await channelManager.initializeWhatsApp(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize Telegram
app.post('/api/channels/telegram/init', async (req, res) => {
  try {
    const { token } = req.body;
    const result = await channelManager.initializeTelegram({ token });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize Discord
app.post('/api/channels/discord/init', async (req, res) => {
  try {
    const { token } = req.body;
    const result = await channelManager.initializeDiscord({ token });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get WhatsApp QR code
app.get('/api/channels/whatsapp/qr', (req, res) => {
  try {
    const session = db.prepare("SELECT qr_code FROM channel_sessions WHERE channel = 'whatsapp'").get();
    if (session?.qr_code) {
      res.json({ qr: session.qr_code });
    } else {
      res.json({ qr: null, message: 'No QR code available' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message through channel
app.post('/api/channels/:channel/send', async (req, res) => {
  try {
    const { channel } = req.params;
    const { to, content, options } = req.body;
    
    const result = await channelManager.sendMessage(channel, to, content, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get channel message history
app.get('/api/channels/:channel/history', (req, res) => {
  try {
    const { channel } = req.params;
    const { userId } = req.query;
    
    const history = channelManager.getHistory(channel, userId);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all channel messages from database
app.get('/api/channels/messages', (req, res) => {
  try {
    const { channel, limit = 100 } = req.query;
    
    let messages;
    if (channel) {
      messages = db.prepare(
        'SELECT * FROM channel_messages WHERE channel = ? ORDER BY created_at DESC LIMIT ?'
      ).all(channel, parseInt(limit));
    } else {
      messages = db.prepare(
        'SELECT * FROM channel_messages ORDER BY created_at DESC LIMIT ?'
      ).all(parseInt(limit));
    }
    
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Telegram webhook handler
app.post('/api/channels/telegram/webhook', async (req, res) => {
  try {
    await channelManager.handleTelegramWebhook(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(200); // Always return 200 to Telegram
  }
});

// Stop all channels
app.post('/api/channels/stop', async (req, res) => {
  try {
    await channelManager.stopAll();
    db.prepare("UPDATE channel_sessions SET status = 'disconnected'").run();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MULTI-AGENT SYSTEM API ====================

// Get all 25 agents
app.get('/api/agents', (req, res) => {
  try {
    const agents = agentManager.getAllAgents();
    const stats = agentManager.getAgentStats();
    res.json({ agents, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent templates
app.get('/api/agents/templates', (req, res) => {
  try {
    const templates = agentManager.getAgentTemplates();
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single agent
app.get('/api/agents/:id', (req, res) => {
  try {
    const agent = agentManager.getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ agent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update agent configuration
app.put('/api/agents/:id', (req, res) => {
  try {
    const { config } = req.body;
    const success = agentManager.updateAgent(req.params.id, config);
    if (!success) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ success: true, message: 'Agent updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create custom agent
app.post('/api/agents/custom', (req, res) => {
  try {
    const { name, description, systemPrompt, config } = req.body;
    const agent = agentManager.createCustomAgent(name, description, systemPrompt, config);
    res.json({ success: true, agent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign task to agent
app.post('/api/agents/:id/task', async (req, res) => {
  try {
    const { task, priority, context } = req.body;
    const taskId = await agentManager.assignTask(req.params.id, task, {
      priority: priority || 'normal',
      context: context || {}
    });
    res.json({ success: true, taskId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run multiple agents in parallel
app.post('/api/agents/parallel', async (req, res) => {
  try {
    const { agentIds, task, options } = req.body;
    const taskIds = await Promise.all(
      agentIds.map(agentId => agentManager.assignTask(agentId, task, options))
    );
    res.json({ success: true, taskIds });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Collaborative discussion between agents
app.post('/api/agents/discussion', async (req, res) => {
  try {
    const { agentIds, topic, rounds } = req.body;
    const discussion = await agentManager.collaborativeDiscussion(
      agentIds,
      topic,
      rounds || 3
    );
    res.json({ success: true, discussion });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get task status
app.get('/api/agents/tasks/:taskId', (req, res) => {
  try {
    const task = agentManager.getTaskStatus(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all tasks
app.get('/api/agents/tasks', (req, res) => {
  try {
    const tasks = agentManager.getAllTasks();
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel task
app.post('/api/agents/tasks/:taskId/cancel', (req, res) => {
  try {
    const success = agentManager.cancelTask(req.params.taskId);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear completed tasks
app.post('/api/agents/tasks/clear', (req, res) => {
  try {
    agentManager.clearCompletedTasks();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent statistics
app.get('/api/agents/stats', (req, res) => {
  try {
    const stats = agentManager.getAgentStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CLAWDBOT (Moltbot) API ====================

// Get Clawdbot gateway status
app.get('/api/clawdbot/status', (req, res) => {
  try {
    res.json({
      gateway: {
        connected: clawdGateway.isConnected,
        url: clawdGateway.url,
        reconnectAttempts: clawdGateway.reconnectAttempts
      },
      skills: {
        loaded: skillLoader.loadedSkills.size,
        available: Array.from(skillLoader.loadedSkills.keys())
      },
      memory: {
        initialized: true,
        cacheSize: zidniMemory.cache.size
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat through Clawdbot gateway
app.post('/api/clawdbot/chat', async (req, res) => {
  try {
    const { message, options = {} } = req.body;
    
    if (!clawdGateway.isConnected) {
      return res.status(503).json({ 
        error: 'Clawdbot gateway not connected',
        message: 'Gateway is not available. Using fallback AI.'
      });
    }

    const response = await clawdGateway.chat(message, options);
    res.json({ response, source: 'clawdbot' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List available skills
app.get('/api/clawdbot/skills', (req, res) => {
  try {
    const skills = Array.from(skillLoader.loadedSkills.entries()).map(([name, skill]) => ({
      name,
      description: skill.description,
      tools: skill.tools,
      entryPoint: skill.entryPoint
    }));
    res.json({ skills, count: skills.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute a skill
app.post('/api/clawdbot/skills/:name/execute', async (req, res) => {
  try {
    const { name } = req.params;
    const { input } = req.body;
    
    const result = await skillLoader.executeSkill(name, input);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Zidni Memory operations
app.get('/api/clawdbot/memory/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { category } = req.query;
    
    const value = await zidniMemory.get(key, category || 'general');
    res.json({ key, value, found: value !== null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clawdbot/memory', async (req, res) => {
  try {
    const { key, value, category, ttl, encrypt } = req.body;
    
    await zidniMemory.set(key, value, {
      category: category || 'general',
      ttl,
      encrypt
    });
    
    res.json({ success: true, key, category: category || 'general' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/clawdbot/memory/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { category } = req.query;
    
    await zidniMemory.delete(key, category || 'general');
    res.json({ success: true, key });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clawdbot/memory', async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let entries;
    if (search) {
      entries = await zidniMemory.search(search, category);
    } else if (category) {
      entries = await zidniMemory.getByCategory(category);
    } else {
      entries = await zidniMemory.getAll();
    }
    
    res.json({ entries, count: entries.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear memory cache
app.post('/api/clawdbot/memory/clear', async (req, res) => {
  try {
    zidniMemory.cache.clear();
    res.json({ success: true, message: 'Memory cache cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== START SERVER ====================

// Determine active AI provider
let activeProvider = AI_PROVIDER;
if (AI_PROVIDER === 'openai' && !OPENAI_API_KEY) activeProvider = 'demo';
if (AI_PROVIDER === 'gemini' && !GEMINI_API_KEY) activeProvider = 'demo';
if (AI_PROVIDER === 'kimi' && !KIMI_API_KEY) activeProvider = 'demo';

app.listen(PORT, () => {
  console.log(`🚀 زِدْني server running on port ${PORT}`);
  console.log(`🤖 AI Provider: ${activeProvider.toUpperCase()}`);
  console.log(`🔧 Tools enabled: ${TOOLS_ENABLED}`);
  console.log(`🤖 Multi-Agent System: 25 agents ready`);
  console.log(`🦀 Clawdbot Integration: Gateway, Skills, Memory`);
  console.log(`📡 Available tools: ${toolRegistry.getAll().map(t => t.name).join(', ')}`);
  console.log(`\n📡 API endpoints:`);
  console.log(`   - GET  /api/health`);
  console.log(`   - GET  /api/tools`);
  console.log(`   - POST /api/tools/:name`);
  console.log(`   - POST /api/chat (AI: ${activeProvider})`);
  console.log(`   - POST /api/upload`);
  console.log(`   - GET  /api/memory`);
  console.log(`   - GET  /api/channels/status`);
  console.log(`   - POST /api/channels/:channel/init`);
  console.log(`   - GET  /api/agents (25 agents)`);
  console.log(`   - POST /api/agents/:id/task`);
  console.log(`   - POST /api/agents/parallel`);
  console.log(`   - POST /api/agents/discussion`);
  console.log(`   - GET  /api/clawdbot/status`);
  console.log(`   - POST /api/clawdbot/chat`);
  console.log(`   - GET  /api/clawdbot/skills`);
  console.log(`   - GET  /api/clawdbot/memory`);
  console.log(`\n📝 To use KIMI AI: Set AI_PROVIDER=kimi and KIMI_API_KEY=your_key`);
  console.log(`📝 Clawdbot Gateway: Set CLAWD_GATEWAY_URL=ws://localhost:18789 (optional)`);
});
