const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  attachments?: number[];
  tool_calls?: ToolResult[];
}

export interface ToolResult {
  tool: string;
  params: Record<string, unknown>;
  result: unknown;
}

export interface ChatResponse {
  response: string;
  demo?: boolean;
  provider?: string;
  toolResults?: ToolResult[];
  searchResults?: SearchResult[];
  error?: string;
}

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    optional?: boolean;
    enum?: string[];
  }>;
}

export interface HealthResponse {
  status: string;
  provider: string;
  configured: boolean;
  tools: {
    enabled: boolean;
    available: string[];
  };
  features: {
    chat: boolean;
    fileUpload: boolean;
    webSearch: boolean;
    codeExecution: boolean;
    database: boolean;
    shell: boolean;
    browser: boolean;
    filesystem: boolean;
    memory: boolean;
  };
  message: string;
}

export interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface FileUpload {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  content: string;
}

export interface MemoryEntry {
  id: number;
  key: string;
  value: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface DeployedWebsite {
  id: number;
  slug: string;
  title: string;
  prompt: string;
  views: number;
  created_at: string;
}

export interface DeployResponse {
  success: boolean;
  slug: string;
  url: string;
  fullUrl: string;
}

// ==================== FETCH HELPERS ====================

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 60000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ==================== HEALTH & TOOLS ====================

export async function checkHealth(): Promise<HealthResponse> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, 3000);
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  } catch (error) {
    return {
      status: 'error',
      provider: 'demo',
      configured: false,
      tools: { enabled: false, available: [] },
      features: {
        chat: true, fileUpload: false, webSearch: false,
        codeExecution: false, database: false,
        shell: false, browser: false, filesystem: false, memory: false
      },
      message: 'الخادم غير متاح',
    };
  }
}

export async function getTools(): Promise<Tool[]> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/tools`, {}, 3000);
    if (!response.ok) throw new Error('Failed to fetch tools');
    const data = await response.json();
    return data.tools;
  } catch (error) {
    return [];
  }
}

export async function executeTool(name: string, params: Record<string, unknown>): Promise<unknown> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/tools/${name}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    60000
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Tool execution failed');
  }

  return response.json();
}

// ==================== CONVERSATIONS ====================

export async function getConversations(): Promise<Conversation[]> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/conversations`);
  if (!response.ok) throw new Error('Failed to fetch conversations');
  const data = await response.json();
  return data.conversations;
}

export async function createConversation(title?: string): Promise<Conversation> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title || 'محادثة جديدة' }),
  });
  if (!response.ok) throw new Error('Failed to create conversation');
  return response.json();
}

export async function deleteConversation(id: number): Promise<void> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/conversations/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete conversation');
}

export async function getMessages(conversationId: number): Promise<ChatMessage[]> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/conversations/${conversationId}/messages`);
  if (!response.ok) throw new Error('Failed to fetch messages');
  const data = await response.json();
  return data.messages;
}

// ==================== CHAT ====================

export interface KIMISettings {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
  stream?: boolean;
}

export interface ChatOptions {
  conversationId?: number;
  history?: ChatMessage[];
  files?: number[];
  webSearch?: boolean;
  agent?: 'default' | 'code' | 'research' | 'writer';
  useTools?: boolean;
  tools?: string[];
  kimiSettings?: KIMISettings;
}

export async function sendMessage(
  message: string,
  options: ChatOptions = {}
): Promise<ChatResponse> {
  // Load KIMI settings from localStorage if not provided
  let kimiSettings = options.kimiSettings;
  if (!kimiSettings) {
    const saved = localStorage.getItem('kimi_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      kimiSettings = {
        model: parsed.model,
        temperature: parsed.temperature,
        maxTokens: parsed.maxTokens,
        topP: parsed.topP,
        frequencyPenalty: parsed.frequencyPenalty,
        presencePenalty: parsed.presencePenalty,
        systemPrompt: parsed.systemPrompt,
      };
    }
  }

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationId: options.conversationId,
        history: options.history || [],
        files: options.files || [],
        webSearch: options.webSearch || false,
        agent: options.agent || 'default',
        useTools: options.useTools || false,
        tools: options.tools || ['shell', 'browser', 'filesystem', 'search', 'code'],
        // KIMI-specific options
        ...kimiSettings,
      }),
    },
    120000
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send message');
  }

  return response.json();
}

// ==================== KIMI API ====================

export interface KIMIModel {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  recommended: boolean;
}

export async function getKIMIModels(): Promise<{ models: KIMIModel[]; currentModel: string }> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/kimi/models`, {}, 5000);
    if (!response.ok) throw new Error('Failed to fetch KIMI models');
    return response.json();
  } catch (error) {
    // Return default models if API fails
    return {
      models: [
        { id: 'moonshot-v1-8k', name: 'Moonshot v1 (8K)', description: 'نموذج سريع مع سياق 8K', contextWindow: 8192, recommended: true },
        { id: 'moonshot-v1-32k', name: 'Moonshot v1 (32K)', description: 'نموذج متوسط مع سياق 32K', contextWindow: 32768, recommended: false },
        { id: 'moonshot-v1-128k', name: 'Moonshot v1 (128K)', description: 'نموذج قوي مع سياق 128K', contextWindow: 131072, recommended: false },
      ],
      currentModel: 'moonshot-v1-8k'
    };
  }
}

export async function getKIMIStats(): Promise<{ provider: string; model: string; status: string }> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/kimi/stats`, {}, 5000);
    if (!response.ok) throw new Error('Failed to fetch KIMI stats');
    return response.json();
  } catch (error) {
    return { provider: 'kimi', model: 'unknown', status: 'error' };
  }
}

// ==================== FILE UPLOAD ====================

export async function uploadFile(file: File): Promise<FileUpload> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/upload`,
    { method: 'POST', body: formData },
    120000
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload file');
  }

  return response.json();
}

// ==================== MEMORY ====================

export async function getMemory(category?: string): Promise<MemoryEntry[]> {
  const url = category 
    ? `${API_BASE_URL}/memory?category=${encodeURIComponent(category)}`
    : `${API_BASE_URL}/memory`;
  
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error('Failed to fetch memory');
  const data = await response.json();
  return data.entries;
}

export async function setMemory(key: string, value: string, category = 'general'): Promise<void> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/memory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value, category }),
  });
  if (!response.ok) throw new Error('Failed to set memory');
}

export async function getMemoryValue(key: string): Promise<string | null> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/memory/${key}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.value;
}

// ==================== CODE EXECUTION ====================

export interface CodeExecutionResult {
  output: string;
  error: string | null;
}

export async function executeCode(code: string, language = 'javascript'): Promise<CodeExecutionResult> {
  return executeTool('code', { code, language }) as Promise<CodeExecutionResult>;
}

// ==================== WEB SEARCH ====================

export async function webSearch(query: string, numResults = 5): Promise<{ results: SearchResult[]; error?: string }> {
  return executeTool('search', { query, num_results: numResults }) as Promise<{ results: SearchResult[]; error?: string }>;
}

// ==================== WEBSITE DEPLOYMENT ====================

export async function deployWebsite(title: string, prompt: string, html: string): Promise<DeployResponse> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/deploy`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, prompt, html }),
    },
    30000
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Deployment failed');
  }

  return response.json();
}

export async function getDeployedWebsites(): Promise<DeployedWebsite[]> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/deploy`);
  if (!response.ok) throw new Error('Failed to fetch deployed websites');
  const data = await response.json();
  return data.websites;
}

export async function deleteDeployedWebsite(slug: string): Promise<void> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/deploy/${slug}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete website');
}
