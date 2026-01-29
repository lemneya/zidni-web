import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Code, Play, Save, FolderOpen, Trash2, Download, Copy, Check, Terminal } from 'lucide-react';
import { executeTool } from '../services/zidniApi';

interface SavedCode {
  id: string;
  name: string;
  code: string;
  language: string;
  date: string;
}

const getDefaultCode = (isRTL: boolean) => isRTL 
  ? `// مرحباً بك في كود زِدْني!
// اكتب كود JavaScript هنا واضغط "تشغيل"

function greet(name) {
  return "مرحباً، " + name + "!";
}

console.log(greet("زِدْني"));

// جرب بعض الأمثلة:
// - حسابات رياضية
// - معالجة النصوص
// - العمل مع المصفوفات
`
  : `// Welcome to Zidni Code!
// Write JavaScript code here and click "Run"

function greet(name) {
  return "Hello, " + name + "!";
}

console.log(greet("Zidni"));

// Try some examples:
// - Math calculations
// - Text processing
// - Array operations
`;

const getExamples = (isRTL: boolean) => ({
  calculator: isRTL 
    ? `// حاسبة بسيطة
function calculate(a, b, operation) {
  switch(operation) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 ? a / b : 'خطأ: القسمة على صفر';
    default: return 'عملية غير معروفة';
  }
}

console.log('10 + 5 =', calculate(10, 5, '+'));
console.log('10 * 5 =', calculate(10, 5, '*'));`
    : `// Simple Calculator
function calculate(a, b, operation) {
  switch(operation) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 ? a / b : 'Error: Division by zero';
    default: return 'Unknown operation';
  }
}

console.log('10 + 5 =', calculate(10, 5, '+'));
console.log('10 * 5 =', calculate(10, 5, '*'));`,

  array: isRTL
    ? `// معالجة المصفوفات
const numbers = [1, 2, 3, 4, 5];

// التصفية
const even = numbers.filter(n => n % 2 === 0);
console.log('الأعداد الزوجية:', even);

// التجميع
const sum = numbers.reduce((a, b) => a + b, 0);
console.log('المجموع:', sum);

// التحويل
const doubled = numbers.map(n => n * 2);
console.log('المضاعفة:', doubled);`
    : `// Array Processing
const numbers = [1, 2, 3, 4, 5];

// Filter
const even = numbers.filter(n => n % 2 === 0);
console.log('Even numbers:', even);

// Reduce
const sum = numbers.reduce((a, b) => a + b, 0);
console.log('Sum:', sum);

// Map
const doubled = numbers.map(n => n * 2);
console.log('Doubled:', doubled);`,

  text: isRTL
    ? `// معالجة النصوص
const text = "زِدْني مساعد ذكي";

console.log('النص:', text);
console.log('الطول:', text.length);
console.log('كبتل:', text.toUpperCase());
console.log('تقسيم:', text.split(' '));

// عكس النص
const reversed = text.split('').reverse().join('');
console.log('معكوس:', reversed);`
    : `// Text Processing
const text = "Zidni AI Assistant";

console.log('Text:', text);
console.log('Length:', text.length);
console.log('Uppercase:', text.toUpperCase());
console.log('Split:', text.split(' '));

// Reverse text
const reversed = text.split('').reverse().join('');
console.log('Reversed:', reversed);`,
});

export function CodePlayground() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [code, setCode] = useState(getDefaultCode(isRTL));
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [savedCodes, setSavedCodes] = useState<SavedCode[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState('');
  const examples = getExamples(isRTL);

  // Load saved codes from localStorage
  useState(() => {
    const saved = localStorage.getItem('zidni_code_snippets');
    if (saved) {
      setSavedCodes(JSON.parse(saved));
    }
  });

  const runCode = async () => {
    setIsRunning(true);
    setOutput('');
    setError('');

    try {
      const result = await executeTool('code', { code, language: 'javascript' }) as { output: string; error: string | null };
      setOutput(result.output);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (isRTL ? 'حدث خطأ غير معروف' : 'An unknown error occurred'));
    } finally {
      setIsRunning(false);
    }
  };

  const saveCode = () => {
    if (!fileName.trim()) return;
    
    const newCode: SavedCode = {
      id: Date.now().toString(),
      name: fileName,
      code,
      language: 'javascript',
      date: new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')
    };
    
    const updated = [...savedCodes, newCode];
    setSavedCodes(updated);
    localStorage.setItem('zidni_code_snippets', JSON.stringify(updated));
    setFileName('');
  };

  const loadCode = (saved: SavedCode) => {
    setCode(saved.code);
    setShowSaved(false);
  };

  const deleteCode = (id: string) => {
    const updated = savedCodes.filter(c => c.id !== id);
    setSavedCodes(updated);
    localStorage.setItem('zidni_code_snippets', JSON.stringify(updated));
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zidni-code.js';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadExample = (key: keyof typeof examples) => {
    setCode(examples[key]);
  };

  return (
    <div className="h-screen flex flex-col p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
            <Code className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-bold text-kimi-text ${isRTL ? 'font-arabic' : ''}`}>{t('codePlayground.title')}</h1>
            <p className={`text-sm text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>{t('codePlayground.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSaved(!showSaved)}
            className={`flex items-center gap-2 px-3 py-2 border border-kimi-border rounded-lg hover:bg-kimi-bg-hover transition-colors ${isRTL ? 'font-arabic' : ''}`}
          >
            <FolderOpen className="w-4 h-4" />
            {t('codePlayground.snippets')}
          </button>
          <button
            onClick={copyCode}
            className={`flex items-center gap-2 px-3 py-2 border border-kimi-border rounded-lg hover:bg-kimi-bg-hover transition-colors ${isRTL ? 'font-arabic' : ''}`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? t('common.copied') : t('common.copy')}
          </button>
          <button
            onClick={downloadCode}
            className={`flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors ${isRTL ? 'font-arabic' : ''}`}
          >
            <Download className="w-4 h-4" />
            {t('common.download')}
          </button>
        </div>
      </motion.div>

      {/* Examples Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 mb-4 overflow-x-auto pb-2"
      >
        <span className={`text-sm text-kimi-text-muted flex-shrink-0 ${isRTL ? 'font-arabic' : ''}`}>{isRTL ? 'أمثلة:' : 'Examples:'}</span>
        {Object.entries({ 
          calculator: isRTL ? 'حاسبة' : 'Calculator', 
          array: isRTL ? 'مصفوفات' : 'Arrays', 
          text: isRTL ? 'نصوص' : 'Text' 
        }).map(([key, label]) => (
          <button
            key={key}
            onClick={() => loadExample(key as keyof typeof examples)}
            className={`px-3 py-1.5 text-sm bg-kimi-bg-sidebar hover:bg-kimi-border rounded-lg transition-colors flex-shrink-0 ${isRTL ? 'font-arabic' : ''}`}
          >
            {label}
          </button>
        ))}
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Code Editor */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 flex flex-col bg-gray-900 rounded-2xl overflow-hidden"
        >
          {/* Editor Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">main.js</span>
            </div>
            <button
              onClick={runCode}
              disabled={isRunning}
              className={`flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm ${isRTL ? 'font-arabic' : ''}`}
            >
              {isRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('codePlayground.running')}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  {t('codePlayground.run')}
                </>
              )}
            </button>
          </div>

          {/* Editor */}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 p-4 bg-gray-900 text-green-400 font-mono text-sm resize-none outline-none"
            dir="ltr"
            spellCheck={false}
          />

          {/* Save Bar */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-t border-gray-700">
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={isRTL ? 'اسم الملف...' : 'File name...'}
              className="flex-1 px-3 py-1 bg-gray-700 text-white rounded text-sm outline-none"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <button
              onClick={saveCode}
              disabled={!fileName.trim()}
              className={`flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 ${isRTL ? 'font-arabic' : ''}`}
            >
              <Save className="w-4 h-4" />
              {t('common.save')}
            </button>
          </div>
        </motion.div>

        {/* Output & Saved */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="w-80 flex flex-col gap-4"
        >
          {/* Output */}
          <div className="flex-1 bg-black rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
              <Terminal className="w-4 h-4 text-gray-400" />
              <span className={`text-sm text-gray-400 ${isRTL ? 'font-arabic' : ''}`}>{t('codePlayground.console')}</span>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              {output && (
                <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">{output}</pre>
              )}
              {error && (
                <pre className="text-red-400 text-sm font-mono whitespace-pre-wrap">{error}</pre>
              )}
              {!output && !error && (
                <span className={`text-gray-600 text-sm ${isRTL ? 'font-arabic' : ''}`}>{isRTL ? '// اضغط "تشغيل" لرؤية النتيجة' : '// Click "Run" to see output'}</span>
              )}
            </div>
          </div>

          {/* Saved Codes */}
          {showSaved && (
            <div className="bg-white rounded-2xl border border-kimi-border overflow-hidden flex flex-col max-h-64">
              <div className="px-4 py-2 border-b border-kimi-border bg-kimi-bg-sidebar">
                <span className={`text-sm font-medium text-kimi-text ${isRTL ? 'font-arabic' : ''}`}>{t('codePlayground.snippets')}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {savedCodes.length === 0 ? (
                  <p className={`text-center text-kimi-text-muted text-sm py-4 ${isRTL ? 'font-arabic' : ''}`}>{isRTL ? 'لا توجد أكواد محفوظة' : 'No saved code snippets'}</p>
                ) : (
                  savedCodes.map((saved) => (
                    <div
                      key={saved.id}
                      className="flex items-center justify-between p-2 hover:bg-kimi-bg-hover rounded-lg group"
                    >
                      <button
                        onClick={() => loadCode(saved)}
                        className={`flex-1 text-sm text-kimi-text truncate ${isRTL ? 'text-right font-arabic' : 'text-left'}`}
                      >
                        {saved.name}
                      </button>
                      <button
                        onClick={() => deleteCode(saved.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
