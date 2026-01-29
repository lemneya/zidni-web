import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { FileAttachments } from './FileAttachments';
import { SearchResults } from './SearchResults';
import { CodeExecutor } from './CodeExecutor';
import { ToolsPanel } from './ToolsPanel';
import {
  sendMessage,
  checkHealth,
  uploadFile,
  webSearch,
  createConversation,
  type ChatMessage as ChatMessageType,
  type SearchResult,
  type HealthResponse,
} from '../services/zidniApi';
import { ZidniLogo } from './ZidniLogo';

type AgentType = 'default' | 'code' | 'research' | 'writer';

interface AttachedFile {
  id: number;
  name: string;
  type: string;
}

export function Chat() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const [apiStatus, setApiStatus] = useState<HealthResponse | null>(null);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [showCodeExecutor, setShowCodeExecutor] = useState(false);
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('default');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [useTools, setUseTools] = useState(false);
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check API health on mount
  useEffect(() => {
    checkHealth().then((health) => {
      setApiStatus(health);
      setIsDemo(!health.configured);
      setAvailableTools(health.tools?.available || []);
    });
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: ChatMessageType = {
      role: 'user',
      content,
      attachments: attachedFiles.map((f) => f.id),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setSearchResults(null);

    try {
      // Create conversation if needed
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        const conv = await createConversation(content.substring(0, 50));
        currentConversationId = conv.id;
        setConversationId(currentConversationId);
      }

      // Send to API
      const response = await sendMessage(content, {
        conversationId: currentConversationId,
        history: messages,
        files: attachedFiles.map((f) => f.id),
        webSearch: webSearchEnabled,
        agent: selectedAgent,
        useTools,
        tools: availableTools,
      });

      // Add model response
      const modelMessage: ChatMessageType = {
        role: 'model',
        content: response.response,
      };
      setMessages((prev) => [...prev, modelMessage]);

      // Update demo status
      if (response.demo !== undefined) {
        setIsDemo(response.demo);
      }

      // Show search results if any
      if (response.searchResults && response.searchResults.length > 0) {
        setSearchResults(response.searchResults);
      }

      // Clear attached files after sending
      setAttachedFiles([]);
    } catch (error) {
      const errorMessage: ChatMessageType = {
        role: 'model',
        content: `${t('errors.generic')}: ${error instanceof Error ? error.message : t('errors.generic')}. ${isRTL ? 'يرجى المحاولة مرة أخرى.' : 'Please try again.'}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const uploaded = await uploadFile(file);
        setAttachedFiles((prev) => [
          ...prev,
          { id: uploaded.id, name: uploaded.originalName, type: uploaded.mimeType },
        ]);
      } catch (error) {
        console.error('Upload error:', error);
        alert(`${isRTL ? 'فشل رفع الملف' : 'Failed to upload file'}: ${file.name}`);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (fileId: number) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSearch = async (query: string) => {
    try {
      const results = await webSearch(query);
      setSearchResults(results.results);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md,.doc,.docx,.xlsx,.csv,.json,.js,.html,.css,.py,.php,image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* API Status & Tools */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-kimi-border">
        <div className="flex items-center gap-2">
          {apiStatus && (
            <>
              {!apiStatus.configured ? (
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded ${isRTL ? 'font-arabic' : ''}`}>
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  {t('chat.demoMode')}
                </span>
              ) : (
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 text-xs rounded ${isRTL ? 'font-arabic' : ''}`}>
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  {apiStatus.provider === 'openai' ? 'OpenAI' : apiStatus.provider === 'kimi' ? 'KIMI' : 'Gemini'}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Agent Selector */}
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value as AgentType)}
            className={`text-sm border border-kimi-border rounded-lg px-3 py-1.5 bg-white ${isRTL ? 'font-arabic' : ''}`}
          >
            <option value="default">{t('chat.agents.general')}</option>
            <option value="code">{t('chat.agents.code')}</option>
            <option value="research">{t('chat.agents.researcher')}</option>
            <option value="writer">{t('chat.agents.writer')}</option>
          </select>

          {/* Web Search Toggle */}
          {apiStatus?.features.webSearch && (
            <button
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${isRTL ? 'font-arabic' : ''} ${
                webSearchEnabled
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'border border-kimi-border hover:bg-kimi-bg-hover'
              }`}
            >
              🔍 {isRTL ? 'البحث في الويب' : 'Web Search'} {webSearchEnabled && '✓'}
            </button>
          )}

          {/* Code Executor Toggle */}
          <button
            onClick={() => setShowCodeExecutor(!showCodeExecutor)}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${isRTL ? 'font-arabic' : ''} ${
              showCodeExecutor
                ? 'bg-purple-100 text-purple-700 border border-purple-300'
                : 'border border-kimi-border hover:bg-kimi-bg-hover'
            }`}
          >
            💻 {isRTL ? 'كود' : 'Code'}
          </button>

          {/* Tools Toggle */}
          {apiStatus?.tools?.enabled && (
            <>
              <button
                onClick={() => setUseTools(!useTools)}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${isRTL ? 'font-arabic' : ''} ${
                  useTools
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'border border-kimi-border hover:bg-kimi-bg-hover'
                }`}
              >
                🛠️ {isRTL ? 'أدوات' : 'Tools'} {useTools && '✓'}
              </button>
              <button
                onClick={() => setShowToolsPanel(true)}
                className="text-sm px-3 py-1.5 rounded-lg border border-kimi-border hover:bg-kimi-bg-hover transition-colors"
                title={t('tools.title')}
              >
                <Wrench className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages or Welcome Screen */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence mode="wait">
          {!hasMessages ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full py-12"
            >
              <ZidniLogo />
              <p className={`text-kimi-text-muted text-center mt-4 max-w-md ${isRTL ? 'font-arabic' : ''}`}>
                {isRTL 
                  ? 'مساعدك الذكي للمحادثة، البحث، كتابة الكود، ومعالجة الملفات'
                  : 'Your AI assistant for chat, search, coding, and file processing'
                }
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-[840px] mx-auto"
            >
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  role={message.role}
                  content={message.content}
                  isDemo={isDemo && message.role === 'model'}
                />
              ))}
              {isLoading && <ChatMessage role="model" content="" isLoading={true} />}
              <div ref={messagesEndRef} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search Results */}
      {searchResults && searchResults.length > 0 && (
        <SearchResults results={searchResults} onClose={() => setSearchResults(null)} />
      )}

      {/* Code Executor */}
      {showCodeExecutor && (
        <CodeExecutor onClose={() => setShowCodeExecutor(false)} />
      )}

      {/* Tools Panel */}
      <ToolsPanel isOpen={showToolsPanel} onClose={() => setShowToolsPanel(false)} />

      {/* File Attachments */}
      {attachedFiles.length > 0 && (
        <FileAttachments files={attachedFiles} onRemove={handleRemoveFile} />
      )}

      {/* Input area */}
      <div className="p-4 border-t border-kimi-border">
        <ChatInput
          onSend={handleSendMessage}
          disabled={isLoading}
          placeholder={hasMessages 
            ? (isRTL ? 'أرسل رسالة...' : 'Send a message...')
            : (isRTL ? 'زِدْني في معرفة شيء جديد...' : 'Ask Zidni anything...')
          }
          onFileClick={() => fileInputRef.current?.click()}
          onSearchClick={() => handleSearch('')}
        />
      </div>
    </div>
  );
}
