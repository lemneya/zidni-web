import { useState, useEffect, useCallback } from 'react';
import { 
  Users, Play, Pause, RotateCcw, MessageSquare, Brain,
  Zap, BarChart3, CheckCircle, XCircle, Clock, Loader2,
  Plus, Trash2, Settings2, Send, Sparkles, GitBranch,
  ChevronDown, ChevronUp, Activity, Target
} from 'lucide-react';
import { API_BASE_URL } from '../config';

interface Agent {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: 'idle' | 'busy';
  currentTask: string | null;
  taskCount: number;
  config: {
    temperature: number;
    maxTokens: number;
    model: string;
  };
}

interface AgentTask {
  id: string;
  agentId: string;
  content: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'high' | 'normal' | 'low';
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  result: string | null;
  error: string | null;
}

interface AgentStats {
  totalAgents: number;
  activeAgents: number;
  idleAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  queuedTasks: number;
}

export default function AgentManagerPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [discussionTopic, setDiscussionTopic] = useState('');
  const [discussionRounds, setDiscussionRounds] = useState(3);
  const [activeTab, setActiveTab] = useState<'agents' | 'tasks' | 'discussion'>('agents');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', description: '', systemPrompt: '' });
  const [runningDiscussion, setRunningDiscussion] = useState(false);
  const [discussionResult, setDiscussionResult] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await res.json();
      setAgents(data.agents);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agents/tasks`);
      const data = await res.json();
      setTasks(data.tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchTasks();
    setLoading(false);

    const interval = setInterval(() => {
      fetchData();
      fetchTasks();
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchData, fetchTasks]);

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const selectAllAgents = () => {
    if (selectedAgents.length === agents.length) {
      setSelectedAgents([]);
    } else {
      setSelectedAgents(agents.map(a => a.id));
    }
  };

  const assignTask = async (agentId: string) => {
    if (!taskInput.trim()) return;

    try {
      await fetch(`${API_BASE_URL}/api/agents/${agentId}/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskInput, priority: 'normal' })
      });
      setTaskInput('');
      fetchTasks();
    } catch (error) {
      console.error('Error assigning task:', error);
    }
  };

  const assignParallelTask = async () => {
    if (!taskInput.trim() || selectedAgents.length === 0) return;

    try {
      await fetch(`${API_BASE_URL}/api/agents/parallel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agentIds: selectedAgents, 
          task: taskInput,
          options: { priority: 'normal' }
        })
      });
      setTaskInput('');
      setSelectedAgents([]);
      fetchTasks();
    } catch (error) {
      console.error('Error assigning parallel task:', error);
    }
  };

  const startDiscussion = async () => {
    if (!discussionTopic.trim() || selectedAgents.length < 2) return;

    setRunningDiscussion(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/agents/discussion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentIds: selectedAgents,
          topic: discussionTopic,
          rounds: discussionRounds
        })
      });
      const data = await res.json();
      setDiscussionResult(data.discussion);
    } catch (error) {
      console.error('Error starting discussion:', error);
    } finally {
      setRunningDiscussion(false);
    }
  };

  const createCustomAgent = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/agents/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent)
      });
      setShowCreateModal(false);
      setNewAgent({ name: '', description: '', systemPrompt: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  };

  const clearCompletedTasks = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/agents/tasks/clear`, { method: 'POST' });
      fetchTasks();
    } catch (error) {
      console.error('Error clearing tasks:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'text-green-400';
      case 'busy': return 'text-yellow-400';
      case 'running': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'queued': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'busy': return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
      case 'running': return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'queued': return <Clock className="w-4 h-4 text-gray-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-400" />
            نظام الوكلاء المتعددين
          </h1>
          <p className="text-gray-400">
            إدارة 25 وكيل ذكاء اصطناعي يعملون بشكل متوازي
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
              <p className="text-sm text-gray-400">الوكلاء</p>
              <p className="text-2xl font-bold text-white">{stats.totalAgents}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
              <p className="text-sm text-gray-400">نشط</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.activeAgents}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
              <p className="text-sm text-gray-400">خامل</p>
              <p className="text-2xl font-bold text-green-400">{stats.idleAgents}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
              <p className="text-sm text-gray-400">المهام</p>
              <p className="text-2xl font-bold text-white">{stats.totalTasks}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
              <p className="text-sm text-gray-400">مكتمل</p>
              <p className="text-2xl font-bold text-green-400">{stats.completedTasks}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
              <p className="text-sm text-gray-400">فاشل</p>
              <p className="text-2xl font-bold text-red-400">{stats.failedTasks}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
              <p className="text-sm text-gray-400">في الانتظار</p>
              <p className="text-2xl font-bold text-blue-400">{stats.queuedTasks}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('agents')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === 'agents' 
                ? 'bg-purple-600 text-white' 
                : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            الوكلاء ({agents.length})
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === 'tasks' 
                ? 'bg-purple-600 text-white' 
                : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            المهام ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('discussion')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === 'discussion' 
                ? 'bg-purple-600 text-white' 
                : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            نقاش جماعي
          </button>
        </div>

        {/* Task Input (visible in agents and discussion tabs) */}
        {(activeTab === 'agents' || activeTab === 'discussion') && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700 mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder={activeTab === 'agents' ? "أدخل مهمة للوكلاء..." : "موضوع النقاش..."}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              {activeTab === 'agents' && selectedAgents.length > 0 && (
                <button
                  onClick={assignParallelTask}
                  disabled={!taskInput.trim()}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  إرسال لـ {selectedAgents.length} وكيل
                </button>
              )}
              {activeTab === 'discussion' && (
                <button
                  onClick={startDiscussion}
                  disabled={!discussionTopic.trim() || selectedAgents.length < 2 || runningDiscussion}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  {runningDiscussion ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                  بدء النقاش
                </button>
              )}
            </div>
            
            {activeTab === 'discussion' && (
              <div className="mt-3 flex items-center gap-4">
                <label className="text-sm text-gray-400">عدد الجولات:</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={discussionRounds}
                  onChange={(e) => setDiscussionRounds(parseInt(e.target.value))}
                  className="w-32"
                />
                <span className="text-white">{discussionRounds}</span>
              </div>
            )}
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div>
            {/* Selection Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={selectAllAgents}
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  {selectedAgents.length === agents.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                </button>
                {selectedAgents.length > 0 && (
                  <span className="text-sm text-gray-400">
                    {selectedAgents.length} وكيل محدد
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                وكيل جديد
              </button>
            </div>

            {/* Agents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => toggleAgentSelection(agent.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedAgents.includes(agent.id)
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-3xl">{agent.icon}</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(agent.status)}
                      {selectedAgents.includes(agent.id) && (
                        <CheckCircle className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                  </div>
                  <h3 className="text-white font-medium mb-1">{agent.name}</h3>
                  <p className="text-sm text-gray-400 mb-2">{agent.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>المهام: {agent.taskCount}</span>
                    <span>{agent.config.model}</span>
                  </div>
                  {agent.currentTask && (
                    <div className="mt-2 text-xs text-yellow-400">
                      يعمل على مهمة...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">سجل المهام</h2>
              <button
                onClick={clearCompletedTasks}
                className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                مسح المكتملة
              </button>
            </div>

            <div className="space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد مهام بعد</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <span className={`text-sm font-medium ${getStatusColor(task.status)}`}>
                          {task.status === 'queued' && 'في الانتظار'}
                          {task.status === 'running' && 'قيد التنفيذ'}
                          {task.status === 'completed' && 'مكتمل'}
                          {task.status === 'failed' && 'فاشل'}
                          {task.status === 'cancelled' && 'ملغي'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(task.createdAt).toLocaleString('ar-SA')}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                        task.priority === 'normal' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-white text-sm mb-2">{task.content}</p>
                    {task.result && (
                      <div className="bg-slate-900 rounded-lg p-3 mt-2">
                        <p className="text-sm text-gray-300 line-clamp-3">{task.result}</p>
                      </div>
                    )}
                    {task.error && (
                      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mt-2">
                        <p className="text-sm text-red-400">{task.error}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Discussion Tab */}
        {activeTab === 'discussion' && (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white mb-2">نقاش جماعي بين الوكلاء</h2>
              <p className="text-gray-400 text-sm">
                اختر 2 وكيل أو أكثر وحدد موضوع للنقاش. سيتبادلون الأراء لعدة جولات.
              </p>
            </div>

            {selectedAgents.length < 2 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                <p className="text-yellow-400 text-sm">
                  ⚠️ يرجى اختيار وكيلين على الأقل من تبويب "الوكلاء"
                </p>
              </div>
            )}

            {runningDiscussion && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mr-3" />
                <span className="text-white">جاري النقاش بين الوكلاء...</span>
              </div>
            )}

            {discussionResult && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">نتائج النقاش</h3>
                {discussionResult.map((round: any, idx: number) => (
                  <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <h4 className="text-purple-400 font-medium mb-3">الجولة {round.round}</h4>
                    <div className="space-y-3">
                      {round.responses.map((resp: any, ridx: number) => (
                        <div key={ridx} className="bg-slate-900 rounded-lg p-3">
                          <p className="text-sm text-purple-400 mb-1">{resp.agent}</p>
                          <p className="text-white text-sm">{resp.response}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Agent Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">إنشاء وكيل جديد</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">الاسم</label>
                  <input
                    type="text"
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    placeholder="مثال: خبير التسويق"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">الوصف</label>
                  <input
                    type="text"
                    value={newAgent.description}
                    onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    placeholder="وصف مختصر للوكيل"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">تعليمات النظام</label>
                  <textarea
                    value={newAgent.systemPrompt}
                    onChange={(e) => setNewAgent({ ...newAgent, systemPrompt: e.target.value })}
                    rows={4}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white resize-none"
                    placeholder="أنت خبير في..."
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={createCustomAgent}
                  disabled={!newAgent.name || !newAgent.systemPrompt}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  إنشاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
