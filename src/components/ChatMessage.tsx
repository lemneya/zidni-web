import { motion } from 'framer-motion';
import { User, Sparkles } from 'lucide-react';

export interface ChatMessageProps {
  role: 'user' | 'model';
  content: string;
  isLoading?: boolean;
  isDemo?: boolean;
}

export function ChatMessage({ role, content, isLoading, isDemo }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-6`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-gradient-to-br from-purple-500 to-blue-500'
            : 'bg-white border border-kimi-border'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Sparkles className="w-4 h-4 text-purple-600" />
        )}
      </div>

      {/* Message content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
        {isDemo && !isUser && (
          <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full mb-2 font-arabic">
            وضع العرض
          </span>
        )}
        <div
          className={`inline-block px-4 py-3 rounded-2xl text-left ${
            isUser
              ? 'bg-kimi-bg-hover text-kimi-text'
              : 'bg-white text-kimi-text border border-kimi-border'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-kimi-text-muted rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-kimi-text-muted rounded-full animate-bounce [animation-delay:0.1s]" />
              <div className="w-2 h-2 bg-kimi-text-muted rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none font-arabic whitespace-pre-wrap leading-relaxed">
              {content}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
