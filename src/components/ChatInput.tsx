import { Bot, ChevronDown, ArrowUp, Paperclip, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useState, type KeyboardEvent } from "react";
import { useTranslation } from 'react-i18next';

interface ChatInputProps {
  placeholder?: string;
  onSend?: (message: string) => void;
  disabled?: boolean;
  onFileClick?: () => void;
  onSearchClick?: () => void;
}

export function ChatInput({
  placeholder = "زِدْني في معرفة شيء جديد...",
  onSend,
  disabled = false,
  onFileClick,
  onSearchClick,
}: ChatInputProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim() && !disabled && onSend) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="relative bg-white rounded-2xl border border-kimi-border shadow-sm hover:shadow-md transition-shadow duration-200">
        {/* Input Area */}
        <div className="px-4 py-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full bg-transparent outline-none resize-none text-kimi-text placeholder:text-kimi-text-muted text-base min-h-[24px] max-h-[200px] disabled:opacity-50 ${isRTL ? 'font-arabic' : ''}`}
            rows={1}
            style={{ direction: isRTL ? 'rtl' : 'ltr' }}
          />
        </div>

        {/* Bottom Toolbar */}
        <div className={`flex items-center justify-between px-3 pb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Left Side - Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={onFileClick}
              disabled={disabled}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-kimi-bg-hover transition-colors duration-150 border border-kimi-border disabled:opacity-50"
              title={isRTL ? 'رفع ملف' : 'Upload file'}
            >
              <Paperclip className="w-4 h-4 text-kimi-text-secondary" />
            </button>
            <button
              onClick={onSearchClick}
              disabled={disabled}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-kimi-bg-hover transition-colors duration-150 border border-kimi-border disabled:opacity-50"
              title={isRTL ? 'بحث' : 'Search'}
            >
              <Search className="w-4 h-4 text-kimi-text-secondary" />
            </button>
            <button
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-kimi-border hover:bg-kimi-bg-hover transition-colors duration-150 disabled:opacity-50"
            >
              <Bot className="w-4 h-4 text-kimi-text-secondary" />
              <span className={`text-sm text-kimi-text ${isRTL ? 'font-arabic' : ''}`}>{isRTL ? 'وكيل' : 'Agent'}</span>
            </button>
          </div>

          {/* Right Side - Model & Send */}
          <div className="flex items-center gap-2">
            <button
              disabled={disabled}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-kimi-bg-hover transition-colors duration-150 disabled:opacity-50"
            >
              <span className={`text-sm text-kimi-text-secondary ${isRTL ? 'font-arabic' : ''}`}>{isRTL ? 'زِدْني 1.0' : 'Zidni 1.0'}</span>
              <ChevronDown className="w-4 h-4 text-kimi-text-secondary" />
            </button>
            <button
              onClick={handleSend}
              disabled={disabled || !message.trim()}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-150 ${
                message.trim() && !disabled
                  ? 'bg-black text-white hover:bg-gray-800'
                  : 'bg-kimi-border text-kimi-text-muted'
              }`}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
