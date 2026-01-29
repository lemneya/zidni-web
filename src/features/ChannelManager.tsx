import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  MessageCircle, Send, Phone, Smartphone, MessageSquare, 
  RefreshCw, QrCode, Power, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { API_BASE_URL } from '../config';

interface ChannelStatus {
  whatsapp?: {
    isConnected: boolean;
    hasQR: boolean;
    sessionName: string;
  };
  telegram?: {
    isRunning: boolean;
    botInfo?: {
      username: string;
      first_name: string;
    };
  };
  discord?: {
    isConnected: boolean;
    tag?: string;
  };
}

interface ChannelSession {
  channel: string;
  status: string;
  qr_code?: string;
  last_connected?: string;
  created_at: string;
}

interface ChannelMessage {
  id: number;
  channel: string;
  username: string;
  content: string;
  type: string;
  is_outgoing: number;
  created_at: string;
}

export default function ChannelManager() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [status, setStatus] = useState<ChannelStatus>({});
  const [sessions, setSessions] = useState<ChannelSession[]>([]);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    whatsapp: true,
    telegram: false,
    discord: false,
    messages: false
  });
  
  // Form states
  const [telegramToken, setTelegramToken] = useState('');
  const [discordToken, setDiscordToken] = useState('');
  const [sendForm, setSendForm] = useState({
    channel: 'whatsapp',
    to: '',
    content: ''
  });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/channels/status`);
      const data = await res.json();
      setStatus(data.connectors);
      setSessions(data.sessions);
    } catch (error) {
      console.error('Error fetching channel status:', error);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/channels/messages?limit=50`);
      const data = await res.json();
      setMessages(data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchMessages();
    
    // Poll for updates
    const interval = setInterval(() => {
      fetchStatus();
      fetchMessages();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchStatus, fetchMessages]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const initWhatsApp = async () => {
    setLoading(prev => ({ ...prev, whatsapp: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/channels/whatsapp/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        alert(isRTL ? 'جاري تهيئة WhatsApp... سيتم عرض رمز QR قريباً' : 'Initializing WhatsApp... QR code will appear soon');
      }
    } catch (error) {
      alert(isRTL ? 'خطأ في تهيئة WhatsApp' : 'Error initializing WhatsApp');
    } finally {
      setLoading(prev => ({ ...prev, whatsapp: false }));
    }
  };

  const initTelegram = async () => {
    if (!telegramToken.trim()) {
      alert(isRTL ? 'الرجاء إدخال توكن Telegram' : 'Please enter Telegram token');
      return;
    }
    
    setLoading(prev => ({ ...prev, telegram: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/channels/telegram/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: telegramToken })
      });
      const data = await res.json();
      if (data.success) {
        alert(isRTL ? 'تم تشغيل بوت Telegram بنجاح!' : 'Telegram bot started successfully!');
        setTelegramToken('');
      } else {
        alert((isRTL ? 'خطأ: ' : 'Error: ') + data.error);
      }
    } catch (error) {
      alert(isRTL ? 'خطأ في تهيئة Telegram' : 'Error initializing Telegram');
    } finally {
      setLoading(prev => ({ ...prev, telegram: false }));
    }
  };

  const initDiscord = async () => {
    if (!discordToken.trim()) {
      alert(isRTL ? 'الرجاء إدخال توكن Discord' : 'Please enter Discord token');
      return;
    }
    
    setLoading(prev => ({ ...prev, discord: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/channels/discord/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: discordToken })
      });
      const data = await res.json();
      if (data.success) {
        alert(isRTL ? 'تم تشغيل بوت Discord بنجاح!' : 'Discord bot started successfully!');
        setDiscordToken('');
      } else {
        alert((isRTL ? 'خطأ: ' : 'Error: ') + data.error);
      }
    } catch (error) {
      alert(isRTL ? 'خطأ في تهيئة Discord' : 'Error initializing Discord');
    } finally {
      setLoading(prev => ({ ...prev, discord: false }));
    }
  };

  const stopAllChannels = async () => {
    if (!confirm(isRTL ? 'هل أنت متأكد من إيقاف جميع القنوات؟' : 'Are you sure you want to stop all channels?')) return;
    
    try {
      await fetch(`${API_BASE_URL}/api/channels/stop`, { method: 'POST' });
      alert(isRTL ? 'تم إيقاف جميع القنوات' : 'All channels stopped');
      fetchStatus();
    } catch (error) {
      alert(isRTL ? 'خطأ في إيقاف القنوات' : 'Error stopping channels');
    }
  };

  const sendMessage = async () => {
    if (!sendForm.to.trim() || !sendForm.content.trim()) {
      alert(isRTL ? 'الرجاء إدخال المستلم والمحتوى' : 'Please enter recipient and content');
      return;
    }
    
    setLoading(prev => ({ ...prev, send: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/channels/${sendForm.channel}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: sendForm.to,
          content: sendForm.content
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(isRTL ? 'تم إرسال الرسالة!' : 'Message sent!');
        setSendForm(prev => ({ ...prev, content: '' }));
      } else {
        alert((isRTL ? 'خطأ: ' : 'Error: ') + data.error);
      }
    } catch (error) {
      alert(isRTL ? 'خطأ في إرسال الرسالة' : 'Error sending message');
    } finally {
      setLoading(prev => ({ ...prev, send: false }));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'running':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'awaiting_qr':
        return <QrCode className="w-5 h-5 text-yellow-500" />;
      case 'disconnected':
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return t('channels.status.connected');
      case 'running':
        return t('channels.status.running');
      case 'awaiting_qr':
        return t('channels.status.awaitingQR');
      case 'disconnected':
      default:
        return t('channels.status.disconnected');
    }
  };

  const whatsappSession = sessions.find(s => s.channel === 'whatsapp');
  const telegramSession = sessions.find(s => s.channel === 'telegram');
  const discordSession = sessions.find(s => s.channel === 'discord');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-blue-400" />
            إدارة القنوات
          </h1>
          <p className="text-gray-400">
            ربط وإدارة قنوات التواصل (WhatsApp، Telegram، Discord)
          </p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">WhatsApp</p>
                  <p className="text-white font-medium">
                    {getStatusText(whatsappSession?.status || 'disconnected')}
                  </p>
                </div>
              </div>
              {getStatusIcon(whatsappSession?.status || 'disconnected')}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Send className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Telegram</p>
                  <p className="text-white font-medium">
                    {getStatusText(telegramSession?.status || 'disconnected')}
                  </p>
                </div>
              </div>
              {getStatusIcon(telegramSession?.status || 'disconnected')}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Discord</p>
                  <p className="text-white font-medium">
                    {getStatusText(discordSession?.status || 'disconnected')}
                  </p>
                </div>
              </div>
              {getStatusIcon(discordSession?.status || 'disconnected')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* WhatsApp Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleExpand('whatsapp')}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-green-400" />
                <span className="text-white font-medium">WhatsApp</span>
                {whatsappSession?.status === 'connected' && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                    متصل
                  </span>
                )}
              </div>
              {expanded.whatsapp ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            
            {expanded.whatsapp && (
              <div className="p-4 border-t border-slate-700">
                {whatsappSession?.qr_code && (
                  <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-400 mb-2">
                      <QrCode className="w-5 h-5" />
                      <span className="font-medium">رمز QR جاهز للمسح</span>
                    </div>
                    <p className="text-sm text-yellow-400/80">
                      افتح WhatsApp على هاتفك وامسح رمز QR للاتصال
                    </p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button
                    onClick={initWhatsApp}
                    disabled={loading.whatsapp}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    {loading.whatsapp ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                    {whatsappSession?.status === 'connected' ? 'إعادة الاتصال' : 'بدء الاتصال'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Telegram Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleExpand('telegram')}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Send className="w-6 h-6 text-blue-400" />
                <span className="text-white font-medium">Telegram</span>
                {telegramSession?.status === 'connected' && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                    يعمل
                  </span>
                )}
              </div>
              {expanded.telegram ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            
            {expanded.telegram && (
              <div className="p-4 border-t border-slate-700 space-y-3">
                {status.telegram?.botInfo && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-blue-400">
                      البوت: @{status.telegram.botInfo.username}
                    </p>
                  </div>
                )}
                
                <input
                  type="password"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="أدخل توكن البوت من @BotFather"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                
                <button
                  onClick={initTelegram}
                  disabled={loading.telegram}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {loading.telegram ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Power className="w-4 h-4" />
                  )}
                  تشغيل البوت
                </button>
              </div>
            )}
          </div>

          {/* Discord Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleExpand('discord')}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-indigo-400" />
                <span className="text-white font-medium">Discord</span>
                {discordSession?.status === 'connected' && (
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs rounded-full">
                    متصل
                  </span>
                )}
              </div>
              {expanded.discord ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            
            {expanded.discord && (
              <div className="p-4 border-t border-slate-700 space-y-3">
                {status.discord?.tag && (
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                    <p className="text-sm text-indigo-400">
                      البوت: {status.discord.tag}
                    </p>
                  </div>
                )}
                
                <input
                  type="password"
                  value={discordToken}
                  onChange={(e) => setDiscordToken(e.target.value)}
                  placeholder="أدخل توكن البوت من Discord Developer Portal"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                
                <button
                  onClick={initDiscord}
                  disabled={loading.discord}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {loading.discord ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Power className="w-4 h-4" />
                  )}
                  تشغيل البوت
                </button>
              </div>
            )}
          </div>

          {/* Send Message Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleExpand('send')}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Phone className="w-6 h-6 text-purple-400" />
                <span className="text-white font-medium">إرسال رسالة</span>
              </div>
              {expanded.send ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            
            {expanded.send && (
              <div className="p-4 border-t border-slate-700 space-y-3">
                <select
                  value={sendForm.channel}
                  onChange={(e) => setSendForm(prev => ({ ...prev, channel: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                  <option value="discord">Discord</option>
                </select>
                
                <input
                  type="text"
                  value={sendForm.to}
                  onChange={(e) => setSendForm(prev => ({ ...prev, to: e.target.value }))}
                  placeholder="رقم الهاتف / معرف المحادثة / معرف القناة"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                
                <textarea
                  value={sendForm.content}
                  onChange={(e) => setSendForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="محتوى الرسالة..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
                
                <button
                  onClick={sendMessage}
                  disabled={loading.send}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {loading.send ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  إرسال
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Messages Section */}
        <div className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
          <button
            onClick={() => toggleExpand('messages')}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-cyan-400" />
              <span className="text-white font-medium">آخر الرسائل المستلمة</span>
              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                {messages.length}
              </span>
            </div>
            {expanded.messages ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          
          {expanded.messages && (
            <div className="border-t border-slate-700">
              <div className="max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>لا توجد رسائل بعد</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700">
                    {messages.map((msg) => (
                      <div key={msg.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`
                              px-2 py-0.5 text-xs rounded-full
                              ${msg.channel === 'whatsapp' ? 'bg-green-500/20 text-green-400' : ''}
                              ${msg.channel === 'telegram' ? 'bg-blue-500/20 text-blue-400' : ''}
                              ${msg.channel === 'discord' ? 'bg-indigo-500/20 text-indigo-400' : ''}
                            `}>
                              {msg.channel}
                            </span>
                            <span className="text-white font-medium">{msg.username}</span>
                            {msg.is_outgoing === 1 && (
                              <span className="text-xs text-gray-500">(صادرة)</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(msg.created_at).toLocaleString('ar-SA')}
                          </span>
                        </div>
                        <p className="mt-2 text-gray-300 text-sm">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stop All Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={stopAllChannels}
            className="bg-red-600/80 hover:bg-red-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-colors"
          >
            <Power className="w-5 h-5" />
            إيقاف جميع القنوات
          </button>
        </div>
      </div>
    </div>
  );
}
