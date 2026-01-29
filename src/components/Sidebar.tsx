import { 
  Plus, 
  Globe, 
  FileText, 
  Presentation, 
  Table, 
  Search, 
  Code, 
  History, 
  Info, 
  Languages, 
  MessageSquare, 
  User,
  Smartphone,
  MessageCircle,
  Users
} from "lucide-react";
import { motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { getConversations, createConversation, type Conversation } from "../services/zidniApi";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  to?: string;
  onClick?: () => void;
  shortcut?: string;
  isActive?: boolean;
}

function SidebarItem({ icon, label, to, onClick, shortcut, isActive }: SidebarItemProps) {
  const content = (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
        isActive 
          ? 'bg-purple-100 text-purple-700 border border-purple-200' 
          : 'text-kimi-text hover:bg-kimi-bg-hover'
      }`}
    >
      <span className="w-5 h-5 flex items-center justify-center text-kimi-text-secondary">
        {icon}
      </span>
      <span className="flex-1 text-right font-arabic">{label}</span>
      {shortcut && (
        <span className="text-xs text-kimi-text-muted bg-white border border-kimi-border rounded px-1.5 py-0.5">
          {shortcut}
        </span>
      )}
    </button>
  );

  if (to) {
    return (
      <NavLink 
        to={to} 
        className={({ isActive: navActive }) => 
          navActive ? 'block bg-purple-50 rounded-lg' : 'block'
        }
      >
        {content}
      </NavLink>
    );
  }

  return content;
}

interface SidebarSectionProps {
  title?: string;
  children: React.ReactNode;
}

function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div className="mb-4">
      {title && (
        <h3 className="px-3 mb-2 text-xs font-medium text-kimi-text-muted uppercase tracking-wider font-arabic">
          {title}
        </h3>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function Sidebar() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const convs = await getConversations();
      setConversations(convs.slice(0, 5)); // Show last 5
    } catch (e) {}
  };

  const handleNewChat = async () => {
    try {
      await createConversation();
      navigate('/');
      window.location.reload(); // Refresh to load new conversation
    } catch (e) {
      navigate('/');
    }
  };

  return (
    <motion.aside
      initial={{ x: isRTL ? 100 : -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={`fixed ${isRTL ? 'right-0' : 'left-0'} top-0 h-screen w-60 bg-kimi-bg-sidebar border-${isRTL ? 'l' : 'r'} border-kimi-border flex flex-col z-50`}
    >
      {/* Logo */}
      <div className="p-4 flex items-center justify-between">
        <NavLink to="/" className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">{isRTL ? 'ز' : 'Z'}</span>
        </NavLink>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button className="w-8 h-8 rounded-lg border border-kimi-border flex items-center justify-center hover:bg-kimi-bg-hover transition-colors">
            <span className="text-kimi-text-secondary text-xs">⧉</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-2">
        {/* New Chat Button */}
        <div className="px-2 mb-4">
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-kimi-border bg-white hover:bg-kimi-bg-hover transition-colors duration-150 text-sm"
          >
            <Plus className="w-4 h-4 text-kimi-text-secondary" />
            <span className={`flex-1 ${isRTL ? 'text-right font-arabic' : 'text-left'}`}>{t('sidebar.newChat')}</span>
            <span className="text-xs text-kimi-text-muted bg-kimi-bg-sidebar border border-kimi-border rounded px-1.5 py-0.5">
              Ctrl K
            </span>
          </button>
        </div>

        {/* Main Features */}
        <SidebarSection>
          <SidebarItem icon={<Globe className="w-4 h-4" />} label={t('sidebar.websites')} to="/websites" />
          <SidebarItem icon={<FileText className="w-4 h-4" />} label={t('sidebar.documents')} to="/documents" />
          <SidebarItem icon={<Presentation className="w-4 h-4" />} label={t('sidebar.presentations')} to="/ppt" />
          <SidebarItem icon={<Table className="w-4 h-4" />} label={t('sidebar.spreadsheets')} to="/sheets" />
          <SidebarItem icon={<Search className="w-4 h-4" />} label={t('sidebar.deepResearch')} to="/research" />
          <SidebarItem icon={<Code className="w-4 h-4" />} label={t('sidebar.codePlayground')} to="/code" />
          <SidebarItem icon={<MessageSquare className="w-4 h-4" />} label={t('sidebar.channels')} to="/channels" />
          <SidebarItem icon={<Users className="w-4 h-4" />} label={t('sidebar.agents')} to="/agents" />
        </SidebarSection>

        {/* Chat History */}
        <SidebarSection title={t('sidebar.last7Days')}>
          {conversations.length > 0 ? (
            conversations.map((conv) => (
              <NavLink 
                key={conv.id} 
                to="/"
                className="block px-3 py-2 rounded-lg hover:bg-kimi-bg-hover transition-colors"
              >
                <div className={`flex items-center gap-2 ${isRTL ? '' : 'flex-row-reverse'}`}>
                  <MessageCircle className="w-4 h-4 text-kimi-text-secondary" />
                  <span className={`text-sm text-kimi-text font-arabic truncate flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {conv.title}
                  </span>
                </div>
              </NavLink>
            ))
          ) : (
            <div className={`px-3 py-2 text-sm text-kimi-text-muted font-arabic ${isRTL ? '' : 'text-left'}`}>
              <History className={`w-4 h-4 inline ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {isRTL ? 'تسجيل الدخول للمزامنة' : 'Sign in to sync'}
            </div>
          )}
        </SidebarSection>

        {/* Mobile App */}
        <SidebarSection>
          <SidebarItem icon={<Smartphone className="w-4 h-4" />} label={t('sidebar.mobileApp')} to="/mobile" />
        </SidebarSection>
      </div>

      {/* Bottom Actions */}
      <div className="p-2 border-t border-kimi-border space-y-0.5">
        <SidebarItem icon={<Info className="w-4 h-4" />} label={t('sidebar.about')} to="/about" />
        <SidebarItem icon={<User className="w-4 h-4" />} label={isRTL ? 'تسجيل الدخول' : 'Sign In'} />
      </div>
    </motion.aside>
  );
}
