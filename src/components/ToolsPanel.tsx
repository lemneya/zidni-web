import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal, Globe, FolderOpen, Brain, Search, Code, Play, Loader2 } from 'lucide-react';
import { getTools, executeTool, type Tool } from '../services/zidniApi';

interface ToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const toolIcons: Record<string, React.ElementType> = {
  shell: Terminal,
  browser: Globe,
  filesystem: FolderOpen,
  memory: Brain,
  search: Search,
  code: Code,
};

export function ToolsPanel({ isOpen, onClose }: ToolsPanelProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [result, setResult] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      getTools().then(setTools);
    }
  }, [isOpen]);

  const handleExecute = async () => {
    if (!selectedTool) return;

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      // Parse params based on tool
      const parsedParams: Record<string, unknown> = {};
      Object.entries(params).forEach(([key, value]) => {
        if (value === 'true') parsedParams[key] = true;
        else if (value === 'false') parsedParams[key] = false;
        else if (!isNaN(Number(value)) && value !== '') parsedParams[key] = Number(value);
        else parsedParams[key] = value;
      });

      const res = await executeTool(selectedTool, parsedParams);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedToolData = tools.find(t => t.name === selectedTool);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          className="fixed left-0 top-0 h-screen w-80 bg-white border-r border-kimi-border shadow-xl z-50 overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-kimi-border">
            <h2 className="text-lg font-medium text-kimi-text font-arabic">
              🛠️ الأدوات
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-kimi-bg-hover transition-colors"
            >
              <X className="w-5 h-5 text-kimi-text-secondary" />
            </button>
          </div>

          {/* Tools List */}
          <div className="p-4 space-y-2">
            {tools.map((tool) => {
              const Icon = toolIcons[tool.name] || Code;
              return (
                <button
                  key={tool.name}
                  onClick={() => {
                    setSelectedTool(tool.name);
                    setParams({});
                    setResult(null);
                    setError('');
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-right ${
                    selectedTool === tool.name
                      ? 'bg-purple-100 border border-purple-300'
                      : 'hover:bg-kimi-bg-hover border border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5 text-purple-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-kimi-text font-arabic">{tool.name}</p>
                    <p className="text-xs text-kimi-text-muted font-arabic line-clamp-1">
                      {tool.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tool Parameters */}
          {selectedToolData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border-t border-kimi-border"
            >
              <h3 className="text-sm font-medium text-kimi-text mb-3 font-arabic">
                {selectedToolData.name}
              </h3>

              <div className="space-y-3">
                {Object.entries(selectedToolData.parameters).map(([key, param]) => (
                  <div key={key}>
                    <label className="block text-xs text-kimi-text-muted mb-1 font-arabic">
                      {key} {param.optional && '(اختياري)'}
                    </label>
                    {param.enum ? (
                      <select
                        value={params[key] || ''}
                        onChange={(e) => setParams({ ...params, [key]: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-kimi-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                      >
                        <option value="">اختر...</option>
                        {param.enum.map((val) => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={params[key] || ''}
                        onChange={(e) => setParams({ ...params, [key]: e.target.value })}
                        placeholder={param.description}
                        className="w-full px-3 py-2 text-sm border border-kimi-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 font-arabic"
                      />
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleExecute}
                disabled={isLoading}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-arabic"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري التنفيذ...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    تنفيذ
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* Result */}
          {(result || error) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 border-t border-kimi-border"
            >
              <h4 className="text-xs font-medium text-kimi-text-muted mb-2 font-arabic">النتيجة:</h4>
              {error ? (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-arabic">
                  {error}
                </div>
              ) : (
                <pre className="p-3 bg-gray-50 rounded-lg text-xs overflow-auto max-h-48 dir-ltr text-left">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
