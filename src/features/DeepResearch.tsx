import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, BookOpen, FileText, ExternalLink, Loader2, Copy, Check, Download } from 'lucide-react';
import { sendMessage, executeTool } from '../services/zidniApi';

interface ResearchResult {
  query: string;
  webResults: Array<{
    title: string;
    link: string;
    snippet: string;
  }>;
  summary: string;
  sources: string[];
}

export function DeepResearch() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResearchResult | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [researchDepth, setResearchDepth] = useState<'quick' | 'deep'>('deep');

  const conductResearch = async () => {
    if (!query.trim()) return;

    setIsResearching(true);
    setResults(null);

    try {
      // Step 1: Web search
      const searchResponse = await executeTool('search', { 
        query, 
        num_results: researchDepth === 'deep' ? 10 : 5 
      }) as { results: Array<{ title: string; link: string; snippet: string }> };

      // Step 2: AI analysis and summary
      const webResults = searchResponse.results || [];
      
      const sourcesText = webResults.map(r => `- ${r.title}: ${r.snippet}`).join('\n');
      
      const aiPrompt = isRTL 
        ? `قم بتحليل وتلخيص المعلومات التالية حول "${query}":\n\n${sourcesText}\n\nقدم:\n1. ملخص شامل\n2. النقاط الرئيسية\n3. الاستنتاجات`
        : `Analyze and summarize the following information about "${query}":\n\n${sourcesText}\n\nProvide:\n1. A comprehensive summary\n2. Key points\n3. Conclusions`;
      
      const aiResponse = await sendMessage(aiPrompt, { agent: 'research' });

      setResults({
        query,
        webResults,
        summary: aiResponse.response,
        sources: webResults.map(r => r.link)
      });
    } catch (error) {
      console.error('Research error:', error);
    } finally {
      setIsResearching(false);
    }
  };

  const copyResults = async () => {
    if (!results) return;
    const text = isRTL
      ? `بحث: ${results.query}\n\nملخص:\n${results.summary}\n\nالمصادر:\n${results.sources.join('\n')}`
      : `Research: ${results.query}\n\nSummary:\n${results.summary}\n\nSources:\n${results.sources.join('\n')}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReport = () => {
    if (!results) return;
    const report = isRTL
      ? `# بحث: ${results.query}\n\n## ملخص\n${results.summary}\n\n## المصادر\n${results.sources.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      : `# Research: ${results.query}\n\n## Summary\n${results.summary}\n\n## Sources\n${results.sources.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-${results.query.slice(0, 30)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-bold text-kimi-text ${isRTL ? 'font-arabic' : ''}`}>{t('deepResearch.title')}</h1>
            <p className={`text-sm text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>{t('deepResearch.subtitle')}</p>
          </div>
        </div>
      </motion.div>

      {/* Search Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-kimi-border p-4 mb-4"
      >
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('deepResearch.placeholder')}
              className={`w-full px-4 py-3 border border-kimi-border rounded-xl outline-none focus:ring-2 focus:ring-indigo-300 ${isRTL ? 'font-arabic' : ''}`}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={researchDepth}
              onChange={(e) => setResearchDepth(e.target.value as 'quick' | 'deep')}
              className={`px-4 py-3 border border-kimi-border rounded-xl outline-none focus:ring-2 focus:ring-indigo-300 ${isRTL ? 'font-arabic' : ''}`}
            >
              <option value="quick">{t('deepResearch.quickSearch')}</option>
              <option value="deep">{t('deepResearch.deepSearch')}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-kimi-text-muted">
            <span className={`flex items-center gap-1 ${isRTL ? 'font-arabic' : ''}`}>
              <Globe className="w-4 h-4" />
              {t('deepResearch.webSearch')}
            </span>
            <span className={`flex items-center gap-1 ${isRTL ? 'font-arabic' : ''}`}>
              <BookOpen className="w-4 h-4" />
              {t('deepResearch.smartAnalysis')}
            </span>
          </div>
          <button
            onClick={conductResearch}
            disabled={isResearching || !query.trim()}
            className={`flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors ${isRTL ? 'font-arabic' : ''}`}
          >
            {isResearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('deepResearch.searching')}
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                {t('deepResearch.search')}
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 overflow-hidden flex flex-col bg-white rounded-2xl border border-kimi-border"
          >
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-kimi-border bg-kimi-bg-sidebar">
              <div className="flex items-center gap-2">
                <button
                  onClick={copyResults}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-kimi-border hover:bg-kimi-bg-hover transition-colors text-sm ${isRTL ? 'font-arabic' : ''}`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? t('deepResearch.copied') : t('deepResearch.copy')}
                </button>
                <button
                  onClick={downloadReport}
                  className={`flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm ${isRTL ? 'font-arabic' : ''}`}
                >
                  <Download className="w-4 h-4" />
                  {t('deepResearch.downloadReport')}
                </button>
              </div>
              <span className={`text-sm text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>
                {results.webResults.length} {t('deepResearch.sources')}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Summary */}
              <div className="mb-8">
                <h2 className={`text-lg font-bold text-kimi-text mb-3 flex items-center gap-2 ${isRTL ? 'font-arabic' : ''}`}>
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  {t('deepResearch.researchSummary')}
                </h2>
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className={`text-kimi-text leading-relaxed whitespace-pre-wrap ${isRTL ? 'font-arabic' : ''}`}>
                    {results.summary}
                  </p>
                </div>
              </div>

              {/* Web Results */}
              <div className="mb-8">
                <h2 className={`text-lg font-bold text-kimi-text mb-3 flex items-center gap-2 ${isRTL ? 'font-arabic' : ''}`}>
                  <Globe className="w-5 h-5 text-blue-500" />
                  {t('deepResearch.webResults')}
                </h2>
                <div className="space-y-3">
                  {results.webResults.map((result, index) => (
                    <motion.a
                      key={index}
                      href={result.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="block p-4 bg-white border border-kimi-border rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`font-medium text-kimi-text mb-1 ${isRTL ? 'font-arabic' : ''}`}>{result.title}</h3>
                          <p className={`text-sm text-kimi-text-muted line-clamp-2 ${isRTL ? 'font-arabic' : ''}`}>{result.snippet}</p>
                          <p className="text-xs text-blue-500 mt-2 truncate">{result.link}</p>
                        </div>
                        <ExternalLink className={`w-4 h-4 text-kimi-text-muted flex-shrink-0 ${isRTL ? 'mr-2' : 'ml-2'}`} />
                      </div>
                    </motion.a>
                  ))}
                </div>
              </div>

              {/* Sources */}
              <div>
                <h2 className={`text-lg font-bold text-kimi-text mb-3 flex items-center gap-2 ${isRTL ? 'font-arabic' : ''}`}>
                  <FileText className="w-5 h-5 text-green-500" />
                  {t('deepResearch.sourcesList')}
                </h2>
                <ol className="space-y-2">
                  {results.sources.map((source, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <span className="w-6 h-6 rounded-full bg-kimi-bg-sidebar flex items-center justify-center text-xs text-kimi-text-muted">
                        {index + 1}
                      </span>
                      <a 
                        href={source} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`text-blue-600 hover:underline truncate ${isRTL ? 'font-arabic' : ''}`}
                      >
                        {source}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!results && !isResearching && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex-1 flex flex-col items-center justify-center text-kimi-text-muted"
        >
          <BookOpen className="w-24 h-24 mb-4 opacity-20" />
          <p className={`text-lg ${isRTL ? 'font-arabic' : ''}`}>{t('deepResearch.startResearch')}</p>
          <p className={`text-sm mt-2 ${isRTL ? 'font-arabic' : ''}`}>{t('deepResearch.researchDescription')}</p>
        </motion.div>
      )}
    </div>
  );
}
