/**
 * Multi-Agent System for Zidni
 * Manages 25+ AI agents working simultaneously
 */

const { EventEmitter } = require('events');
const axios = require('axios');

class AgentManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxConcurrentAgents = options.maxConcurrentAgents || 25;
    this.agents = new Map();
    this.tasks = new Map();
    this.results = new Map();
    this.workerPool = [];
    this.taskQueue = [];
    this.isProcessing = false;
    this.db = options.db || null;
    
    // AI Provider configuration
    this.aiProvider = options.aiProvider || process.env.AI_PROVIDER || 'demo';
    this.kimiKey = options.kimiKey || process.env.KIMI_API_KEY;
    this.openaiKey = options.openaiKey || process.env.OPENAI_API_KEY;
    this.geminiKey = options.geminiKey || process.env.GEMINI_API_KEY;
    
    // Initialize default agents
    this.initializeDefaultAgents();
    
    // Start worker pool
    this.initializeWorkerPool();
  }

  // 25 Pre-configured Agent Types
  getAgentTemplates() {
    return [
      { id: 'general', name: 'زِدْني العام', icon: '🤖', description: 'مساعد عام متعدد الاستخدامات', systemPrompt: 'أنت زِدْني، مساعد ذكاء اصطناعي متقدم.' },
      { id: 'code', name: 'مبرمج الكود', icon: '💻', description: 'متخصص في البرمجة وتطوير البرمجيات', systemPrompt: 'أنت مبرمج خبير. اكتب كود نظيف، موثق، وخالي من الأخطاء.' },
      { id: 'researcher', name: 'الباحث', icon: '🔬', description: 'باحث علمي ومحلل بيانات', systemPrompt: 'أنت باحث علمي. قدم معلومات دقيقة مع مصادر.' },
      { id: 'writer', name: 'الكاتب', icon: '✍️', description: 'كاتب محتوى وروائي', systemPrompt: 'أنت كاتب محترف. اكتب بأسلوب جذاب وسلس.' },
      { id: 'translator', name: 'المترجم', icon: '🌐', description: 'مترجم متعدد اللغات', systemPrompt: 'أنت مترجم محترف. ترجم بدقة مع الحفاظ على المعنى.' },
      { id: 'teacher', name: 'المعلم', icon: '📚', description: 'معلم وموجه تعليمي', systemPrompt: 'أنت معلم متخصص. اشرح المفاهيم ببساطة ووضوح.' },
      { id: 'lawyer', name: 'المستشار القانوني', icon: '⚖️', description: 'خبير قانوني ومستشار', systemPrompt: 'أنت مستشار قانوني. قدم نصائح قانونية دقيقة.' },
      { id: 'doctor', name: 'الطبيب', icon: '🏥', description: 'استشارات طبية عامة', systemPrompt: 'أنت طبيب. قدم معلومات طبية عامة مع التوصية باستشارة مختص.' },
      { id: 'designer', name: 'المصمم', icon: '🎨', description: 'مصمم جرافيك وواجهات', systemPrompt: 'أنت مصمم محترف. قدم أفكار تصميمية مبتكرة.' },
      { id: 'marketer', name: 'المسوّق', icon: '📈', description: 'خبير تسويق وإعلان', systemPrompt: 'أنت خبير تسويق. قدم استراتيجيات تسويقية فعالة.' },
      { id: 'data_analyst', name: 'محلل البيانات', icon: '📊', description: 'تحليل البيانات وإنشاء تقارير', systemPrompt: 'أنت محلل بيانات. حلل البيانات وقدم رؤى قيمة.' },
      { id: 'seo_expert', name: 'خبير SEO', icon: '🔍', description: 'تحسين محركات البحث', systemPrompt: 'أنت خبير SEO. قدم توصيات لتحسين الظهور في البحث.' },
      { id: 'social_media', name: 'مدير سوشيال', icon: '📱', description: 'إدارة حسابات التواصل', systemPrompt: 'أنت مدير سوشيال ميديا. قدم محتوى جذاب ومناسب.' },
      { id: 'copywriter', name: 'كتابة إعلانية', icon: '✨', description: 'كتابة نصوص تسويقية', systemPrompt: 'أنت كاتب إعلاني. اكتب نصوصاً مقنعة وجذابة.' },
      { id: 'project_manager', name: 'مدير المشاريع', icon: '📋', description: 'إدارة وتخطيط المشاريع', systemPrompt: 'أنت مدير مشاريع. نظم المهام وحدد الأولويات.' },
      { id: 'accountant', name: 'المحاسب', icon: '💰', description: 'محاسبة ومالية', systemPrompt: 'أنت محاسب. قدم تحليلات مالية دقيقة.' },
      { id: 'chef', name: 'الطاهي', icon: '👨‍🍳', description: 'وصفات ونصائح طبخ', systemPrompt: 'أنت طاهٍ محترف. قدم وصفات لذيذة ونصائح مطبخ.' },
      { id: 'fitness_coach', name: 'مدرب اللياقة', icon: '💪', description: 'تدريب ولياقة بدنية', systemPrompt: 'أنت مدرب لياقة. قدم برامج تدريبية مناسبة.' },
      { id: 'therapist', name: 'المستشار', icon: '🧠', description: 'دعم نفسي واستشارات', systemPrompt: 'أنت مستشار. قدم دعماً إيجابياً ونصائح مفيدة.' },
      { id: 'travel_agent', name: 'وكيل سفر', icon: '✈️', description: 'تخطيط رحلات وسفر', systemPrompt: 'أنت وكيل سفر. قدم توصيات سفر ممتازة.' },
      { id: 'historian', name: 'المؤرخ', icon: '🏛️', description: 'تاريخ وحضارات', systemPrompt: 'أنت مؤرخ. قدم معلومات تاريخية دقيقة.' },
      { id: 'philosopher', name: 'الفيلسوف', icon: '🤔', description: 'فلسفة وتفكير نقدي', systemPrompt: 'أنت فيلسوف. قدم تحليلات فلسفية عميقة.' },
      { id: 'poet', name: 'الشاعر', icon: '🌹', description: 'شعر وأدب', systemPrompt: 'أنت شاعر. اكتب شعراً جميلاً ومؤثراً.' },
      { id: 'comedian', name: 'المضحك', icon: '😄', description: 'فكاهة وترفيه', systemPrompt: 'أنت فكاهي. قدم محتوى مضحك وخفيف.' },
      { id: 'detective', name: 'المحقق', icon: '🔎', description: 'تحليل وحل ألغاز', systemPrompt: 'أنت محقق. حلل المعلومات وتوصل لاستنتاجات منطقية.' }
    ];
  }

  initializeDefaultAgents() {
    const templates = this.getAgentTemplates();
    templates.forEach(template => {
      this.agents.set(template.id, {
        ...template,
        status: 'idle',
        currentTask: null,
        taskCount: 0,
        createdAt: Date.now(),
        config: {
          temperature: 0.7,
          maxTokens: 4000,
          model: 'moonshot-v1-8k'
        }
      });
    });
  }

  initializeWorkerPool() {
    // Create worker pool for parallel processing
    for (let i = 0; i < this.maxConcurrentAgents; i++) {
      this.workerPool.push({
        id: `worker-${i}`,
        status: 'idle',
        currentAgent: null
      });
    }
  }

  // Get all agents
  getAllAgents() {
    return Array.from(this.agents.values());
  }

  // Get agent by ID
  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  // Update agent configuration
  updateAgent(agentId, config) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.config = { ...agent.config, ...config };
      this.agents.set(agentId, agent);
      return true;
    }
    return false;
  }

  // Create a custom agent
  createCustomAgent(name, description, systemPrompt, config = {}) {
    const id = `custom-${Date.now()}`;
    const agent = {
      id,
      name,
      icon: '🔧',
      description,
      systemPrompt,
      status: 'idle',
      currentTask: null,
      taskCount: 0,
      createdAt: Date.now(),
      isCustom: true,
      config: {
        temperature: 0.7,
        maxTokens: 4000,
        model: 'moonshot-v1-8k',
        ...config
      }
    };
    this.agents.set(id, agent);
    return agent;
  }

  // Assign task to agent
  async assignTask(agentId, task, options = {}) {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const taskObj = {
      id: taskId,
      agentId,
      content: task,
      status: 'queued',
      priority: options.priority || 'normal',
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
      context: options.context || {},
      callbacks: options.callbacks || {}
    };

    this.tasks.set(taskId, taskObj);
    this.taskQueue.push(taskObj);
    
    // Sort queue by priority
    this.taskQueue.sort((a, b) => {
      const priorityMap = { high: 0, normal: 1, low: 2 };
      return priorityMap[a.priority] - priorityMap[b.priority];
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return taskId;
  }

  // Process task queue
  async processQueue() {
    if (this.isProcessing || this.taskQueue.length === 0) return;
    
    this.isProcessing = true;
    this.emit('processing:start', { queueLength: this.taskQueue.length });

    while (this.taskQueue.length > 0) {
      // Find available workers
      const availableWorkers = this.workerPool.filter(w => w.status === 'idle');
      
      if (availableWorkers.length === 0) {
        // Wait for a worker to become available
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      // Get next task
      const task = this.taskQueue.shift();
      const worker = availableWorkers[0];

      // Execute task
      this.executeTask(task, worker);
    }

    this.isProcessing = false;
    this.emit('processing:end');
  }

  // Execute a single task
  async executeTask(task, worker) {
    worker.status = 'busy';
    worker.currentAgent = task.agentId;
    
    task.status = 'running';
    task.startedAt = Date.now();
    
    const agent = this.agents.get(task.agentId);
    if (agent) {
      agent.status = 'busy';
      agent.currentTask = task.id;
    }

    this.emit('task:start', { taskId: task.id, agentId: task.agentId });

    try {
      // Call AI API
      const result = await this.callAI(task.content, agent, task.context);
      
      task.status = 'completed';
      task.completedAt = Date.now();
      task.result = result;
      
      this.results.set(task.id, result);
      
      if (task.callbacks.onComplete) {
        task.callbacks.onComplete(result, task);
      }

      this.emit('task:complete', { taskId: task.id, result });

    } catch (error) {
      task.status = 'failed';
      task.completedAt = Date.now();
      task.error = error.message;
      
      if (task.callbacks.onError) {
        task.callbacks.onError(error, task);
      }

      this.emit('task:error', { taskId: task.id, error: error.message });
    }

    // Update agent stats
    if (agent) {
      agent.status = 'idle';
      agent.currentTask = null;
      agent.taskCount++;
    }

    worker.status = 'idle';
    worker.currentAgent = null;
  }

  // Call AI API based on provider
  async callAI(message, agent, context = {}) {
    const messages = [
      { role: 'system', content: agent.systemPrompt },
      ...(context.history || []),
      { role: 'user', content: message }
    ];

    let response;

    switch (this.aiProvider) {
      case 'kimi':
        response = await this.callKIMI(messages, agent.config);
        break;
      case 'openai':
        response = await this.callOpenAI(messages, agent.config);
        break;
      case 'gemini':
        response = await this.callGemini(messages, agent.config);
        break;
      default:
        response = `[Demo Mode] Agent ${agent.name} would respond to: "${message.substring(0, 100)}..."`;
    }

    return response;
  }

  async callKIMI(messages, config) {
    const response = await axios.post(
      'https://api.moonshot.cn/v1/chat/completions',
      {
        model: config.model || 'moonshot-v1-8k',
        messages,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.kimiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000
      }
    );
    return response.data.choices[0].message.content;
  }

  async callOpenAI(messages, config) {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: config.model || 'gpt-4o-mini',
        messages,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.openaiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000
      }
    );
    return response.data.choices[0].message.content;
  }

  async callGemini(messages, config) {
    const contents = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiKey}`,
      {
        contents,
        generationConfig: {
          temperature: config.temperature || 0.7,
          maxOutputTokens: config.maxTokens || 4000
        }
      },
      { timeout: 60000 }
    );

    return response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // Run multiple agents in parallel on the same task
  async runParallelAgents(agentIds, task, options = {}) {
    const promises = agentIds.map(agentId => 
      this.assignTask(agentId, task, options)
    );

    const taskIds = await Promise.all(promises);

    // Wait for all to complete
    const waitForCompletion = async () => {
      const checkComplete = () => {
        return taskIds.every(id => {
          const task = this.tasks.get(id);
          return task && (task.status === 'completed' || task.status === 'failed');
        });
      };

      while (!checkComplete()) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return taskIds.map(id => ({
        taskId: id,
        ...this.tasks.get(id)
      }));
    };

    return waitForCompletion();
  }

  // Collaborative agent discussion
  async collaborativeDiscussion(agentIds, topic, rounds = 3) {
    const discussion = [];
    let currentContext = topic;

    for (let round = 0; round < rounds; round++) {
      const roundResponses = [];

      for (const agentId of agentIds) {
        const agent = this.agents.get(agentId);
        if (!agent) continue;

        const prompt = `الجولة ${round + 1}: ${currentContext}\n\nما هو رأيك في هذا الموضوع؟`;
        
        const taskId = await this.assignTask(agentId, prompt, {
          context: { discussion: discussion.slice(-5) }
        });

        // Wait for this agent
        await new Promise(resolve => {
          const check = setInterval(() => {
            const task = this.tasks.get(taskId);
            if (task && (task.status === 'completed' || task.status === 'failed')) {
              clearInterval(check);
              resolve();
            }
          }, 100);
        });

        const task = this.tasks.get(taskId);
        roundResponses.push({
          agent: agent.name,
          response: task.result,
          round: round + 1
        });
      }

      discussion.push({
        round: round + 1,
        responses: roundResponses
      });

      // Update context for next round
      currentContext = `ملخص الجولة ${round + 1}:\n` + 
        roundResponses.map(r => `${r.agent}: ${r.response.substring(0, 200)}...`).join('\n');
    }

    return discussion;
  }

  // Get task status
  getTaskStatus(taskId) {
    return this.tasks.get(taskId);
  }

  // Get all tasks
  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  // Get agent statistics
  getAgentStats() {
    const stats = {
      totalAgents: this.agents.size,
      activeAgents: 0,
      idleAgents: 0,
      totalTasks: this.tasks.size,
      completedTasks: 0,
      failedTasks: 0,
      queuedTasks: this.taskQueue.length
    };

    for (const agent of this.agents.values()) {
      if (agent.status === 'busy') stats.activeAgents++;
      else stats.idleAgents++;
    }

    for (const task of this.tasks.values()) {
      if (task.status === 'completed') stats.completedTasks++;
      else if (task.status === 'failed') stats.failedTasks++;
    }

    return stats;
  }

  // Cancel a task
  cancelTask(taskId) {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'queued') {
      task.status = 'cancelled';
      this.taskQueue = this.taskQueue.filter(t => t.id !== taskId);
      return true;
    }
    return false;
  }

  // Clear completed tasks
  clearCompletedTasks() {
    for (const [id, task] of this.tasks) {
      if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
        this.tasks.delete(id);
        this.results.delete(id);
      }
    }
  }
}

module.exports = AgentManager;
