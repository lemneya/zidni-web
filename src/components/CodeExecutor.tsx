import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Copy, Check } from 'lucide-react';
import { executeCode } from '../services/zidniApi';

interface CodeExecutorProps {
  onClose: () => void;
}

export function CodeExecutor({ onClose }: CodeExecutorProps) {
  const [code, setCode] = useState('// اكتب كود JavaScript هنا\nconsole.log("مرحباً من زِدْني!");');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('');
    setError('');

    try {
      const result = await executeCode(code, 'javascript');
      setOutput(result.output);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="px-4 py-3 border-t border-kimi-border bg-purple-50"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-purple-900 font-arabic">
          💻 تنفيذ الكود (JavaScript)
        </h3>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-purple-100 transition-colors"
        >
          <X className="w-4 h-4 text-purple-700" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Code Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-700 font-arabic">الكود:</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span className="font-arabic">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="font-arabic">نسخ</span>
                </>
              )}
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-32 p-3 text-sm font-mono bg-white border border-purple-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
            dir="ltr"
          />
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-arabic"
          >
            <Play className="w-4 h-4" />
            {isRunning ? 'جاري التنفيذ...' : 'تشغيل'}
          </button>
        </div>

        {/* Output */}
        <div className="space-y-2">
          <span className="text-xs text-purple-700 font-arabic">النتيجة:</span>
          <div className="w-full h-32 p-3 text-sm font-mono bg-black text-green-400 rounded-lg overflow-auto">
            {output && (
              <pre className="whitespace-pre-wrap">{output}</pre>
            )}
            {error && (
              <pre className="whitespace-pre-wrap text-red-400">{error}</pre>
            )}
            {!output && !error && (
              <span className="text-gray-500">// النتيجة ستظهر هنا</span>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-purple-600 mt-3 font-arabic">
        💡 تلميح: استخدم console.log() لطباعة النتائج
      </p>
    </motion.div>
  );
}
