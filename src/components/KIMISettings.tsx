import { useState, useEffect } from 'react';
import { 
  Settings, Cpu, Thermometer, Hash, MessageSquare, 
  CheckCircle, AlertCircle, RefreshCw, ChevronDown, ChevronUp,
  Zap, BookOpen, Sparkles
} from 'lucide-react';
import { API_BASE_URL } from '../config';

interface KIMIModel {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  recommended: boolean;
}

interface KIMISettings {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt: string;
}

export default function KIMISettings() {
  const [models, setModels] = useState<KIMIModel[]>([]);
  const [currentModel, setCurrentModel] = useState('moonshot-v1-8k');
  const [settings, setSettings] = useState<KIMISettings>({
    model: 'moonshot-v1-8k',
    temperature: 0.7,
    maxTokens: 4000,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    systemPrompt: 'أنت زِدْني، مساعد ذكاء اصطناعي متقدم.'
  });
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchModels();
    loadSettings();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/kimi/models`);
      const data = await res.json();
      setModels(data.models);
      setCurrentModel(data.currentModel);
    } catch (error) {
      console.error('Error fetching KIMI models:', error);
    }
  };

  const loadSettings = () => {
    const saved = localStorage.getItem('kimi_settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  };

  const saveSettings = () => {
    localStorage.setItem('kimi_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChange = (key: keyof KIMISettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const formatContextWindow = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
    return tokens.toString();
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <p className="text-white font-medium">إعدادات KIMI</p>
            <p className="text-sm text-gray-400">النموذج: {currentModel}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {expanded && (
        <div className="p-4 border-t border-slate-700 space-y-4">
          {/* Model Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2 text-right">النموذج</label>
            <div className="grid grid-cols-1 gap-2">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleChange('model', model.id)}
                  className={`p-3 rounded-lg border text-right transition-colors ${
                    settings.model === model.id
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{model.name}</p>
                      <p className="text-sm text-gray-400">{model.description}</p>
                    </div>
                    <div className="text-left">
                      <span className="text-xs text-gray-500">{formatContextWindow(model.contextWindow)} tokens</span>
                      {model.recommended && (
                        <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                          موصى به
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400">الإبداع (Temperature)</label>
              <span className="text-sm text-white">{settings.temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>دقيق</span>
              <span>متوازن</span>
              <span>إبداعي</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400">الحد الأقصى للرد (Max Tokens)</label>
              <span className="text-sm text-white">{settings.maxTokens}</span>
            </div>
            <input
              type="range"
              min="100"
              max="8000"
              step="100"
              value={settings.maxTokens}
              onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          {/* Top P */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400">Top P</label>
              <span className="text-sm text-white">{settings.topP}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.topP}
              onChange={(e) => handleChange('topP', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          {/* Advanced Settings */}
          <div className="pt-4 border-t border-slate-700">
            <p className="text-sm text-gray-400 mb-3">إعدادات متقدمة</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Frequency Penalty</label>
                <input
                  type="number"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={settings.frequencyPenalty}
                  onChange={(e) => handleChange('frequencyPenalty', parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Presence Penalty</label>
                <input
                  type="number"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={settings.presencePenalty}
                  onChange={(e) => handleChange('presencePenalty', parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">تعليمات النظام (System Prompt)</label>
            <textarea
              value={settings.systemPrompt}
              onChange={(e) => handleChange('systemPrompt', e.target.value)}
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm resize-none"
              placeholder="أدخل تعليمات النظام..."
            />
          </div>

          {/* Save Button */}
          <button
            onClick={saveSettings}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {saved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                تم الحفظ
              </>
            ) : (
              <>
                <Settings className="w-4 h-4" />
                حفظ الإعدادات
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
