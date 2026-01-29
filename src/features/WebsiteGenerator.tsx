import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Download, Copy, Check, RefreshCw, Code, Eye, Rocket, ExternalLink, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { sendMessage, deployWebsite, getDeployedWebsites, deleteDeployedWebsite, type DeployedWebsite } from '../services/zidniApi';

export function WebsiteGenerator() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [prompt, setPrompt] = useState('');
  const [htmlCode, setHtmlCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState('');
  const [deployedWebsites, setDeployedWebsites] = useState<DeployedWebsite[]>([]);
  const [showDeployed, setShowDeployed] = useState(false);

  // Load deployed websites on mount
  useEffect(() => {
    loadDeployedWebsites();
  }, []);

  const loadDeployedWebsites = async () => {
    try {
      const websites = await getDeployedWebsites();
      setDeployedWebsites(websites);
    } catch (e) {
      console.error('Failed to load deployed websites:', e);
    }
  };

  const generateWebsite = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setDeployedUrl('');
    try {
      const response = await sendMessage(
        `أنشئ موقع ويب كامل باستخدام HTML و CSS و JavaScript حسب هذا الوصف: ${prompt}\n\nقدم الكود كاملاً في كتلة واحدة يمكن نسخها وتشغيلها مباشرة.`,
        { agent: 'code' }
      );

      // Extract HTML code from response
      const codeMatch = response.response.match(/```html\n([\s\S]*?)```/) ||
                       response.response.match(/```\n([\s\S]*?)```/) ||
                       [null, response.response];
      
      setHtmlCode(codeMatch[1] || response.response);
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeploy = async () => {
    if (!htmlCode) return;

    setIsDeploying(true);
    try {
      const result = await deployWebsite(
        prompt.slice(0, 50) || 'Generated Website',
        prompt,
        htmlCode
      );
      setDeployedUrl(result.fullUrl);
      loadDeployedWebsites(); // Refresh list
    } catch (error) {
      console.error('Deployment error:', error);
      alert('فشل النشر. تأكد من تشغيل الخادم.');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموقع؟')) return;
    try {
      await deleteDeployedWebsite(slug);
      loadDeployedWebsites();
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(htmlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([htmlCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zidni-website.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openDeployedSite = (slug: string) => {
    window.open(`/site/${slug}.html`, '_blank');
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-bold text-kimi-text ${isRTL ? 'font-arabic' : ''}`}>{t('websiteGenerator.title')}</h1>
            <p className={`text-sm text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>{t('websiteGenerator.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => setShowDeployed(!showDeployed)}
          className={`flex items-center gap-2 px-4 py-2 border border-kimi-border rounded-lg hover:bg-kimi-bg-hover transition-colors ${isRTL ? 'font-arabic' : ''}`}
        >
          <Rocket className="w-4 h-4" />
          {t('websiteGenerator.mySites')}
        </button>
      </motion.div>

      {/* Deployed Websites Panel */}
      <AnimatePresence>
        {showDeployed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 bg-white rounded-2xl border border-kimi-border overflow-hidden"
          >
            <div className="p-4 border-b border-kimi-border bg-kimi-bg-sidebar">
              <h3 className={`font-medium text-kimi-text ${isRTL ? 'font-arabic' : ''}`}>{t('websiteGenerator.publishedSites')}</h3>
            </div>
            <div className="p-4 max-h-48 overflow-y-auto">
              {deployedWebsites.length === 0 ? (
                <p className={`text-kimi-text-muted text-center ${isRTL ? 'font-arabic' : ''}`}>{t('websiteGenerator.noSites')}</p>
              ) : (
                <div className="space-y-2">
                  {deployedWebsites.map((site) => (
                    <div key={site.slug} className="flex items-center justify-between p-3 bg-kimi-bg-sidebar rounded-lg">
                      <div className="flex-1">
                        <p className={`font-medium text-kimi-text ${isRTL ? 'font-arabic' : ''}`}>{site.title}</p>
                        <p className="text-xs text-kimi-text-muted">
                          {new Date(site.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')} • {site.views} {t('websiteGenerator.views')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openDeployedSite(site.slug)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(site.slug)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-kimi-border p-4 mb-4"
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('websiteGenerator.placeholder')}
          className={`w-full h-24 resize-none outline-none text-kimi-text placeholder:text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}
          dir={isRTL ? 'rtl' : 'ltr'}
        />
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-2">
            <button
              onClick={() => setPrompt('')}
              className={`px-3 py-1.5 text-sm text-kimi-text-secondary hover:text-kimi-text transition-colors ${isRTL ? 'font-arabic' : ''}`}
            >
              {t('websiteGenerator.clear')}
            </button>
          </div>
          <button
            onClick={generateWebsite}
            disabled={isGenerating || !prompt.trim()}
            className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors ${isRTL ? 'font-arabic' : ''}`}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t('websiteGenerator.generating')}
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                {t('websiteGenerator.generate')}
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Deploy Success Message */}
      {deployedUrl && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-green-800 font-medium ${isRTL ? 'font-arabic' : ''}`}>{t('websiteGenerator.deploySuccess')}</p>
              <a 
                href={deployedUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-600 text-sm hover:underline"
              >
                {deployedUrl}
              </a>
            </div>
            <button
              onClick={() => window.open(deployedUrl, '_blank')}
              className={`flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm ${isRTL ? 'font-arabic' : ''}`}
            >
              <ExternalLink className="w-4 h-4" />
              {t('websiteGenerator.open')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Output */}
      {htmlCode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col bg-white rounded-2xl border border-kimi-border overflow-hidden"
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-kimi-border bg-kimi-bg-sidebar">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${isRTL ? 'font-arabic' : ''} ${
                  showPreview ? 'bg-blue-100 text-blue-700' : 'hover:bg-kimi-bg-hover'
                }`}
              >
                <Eye className="w-4 h-4" />
                {t('websiteGenerator.preview')}
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${isRTL ? 'font-arabic' : ''} ${
                  !showPreview ? 'bg-purple-100 text-purple-700' : 'hover:bg-kimi-bg-hover'
                }`}
              >
                <Code className="w-4 h-4" />
                {t('websiteGenerator.code')}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeploy}
                disabled={isDeploying}
                className={`flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm ${isRTL ? 'font-arabic' : ''}`}
              >
                {isDeploying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t('websiteGenerator.deploying')}
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    {t('websiteGenerator.deploy')}
                  </>
                )}
              </button>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-kimi-border hover:bg-kimi-bg-hover transition-colors text-sm ${isRTL ? 'font-arabic' : ''}`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t('websiteGenerator.copied') : t('websiteGenerator.copy')}
              </button>
              <button
                onClick={handleDownload}
                className={`flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm ${isRTL ? 'font-arabic' : ''}`}
              >
                <Download className="w-4 h-4" />
                {t('websiteGenerator.download')}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {showPreview ? (
              <iframe
                srcDoc={htmlCode}
                className="w-full h-full border-0"
                title="Website Preview"
                sandbox="allow-scripts"
              />
            ) : (
              <pre className="w-full h-full p-4 overflow-auto bg-gray-900 text-green-400 text-sm font-mono">
                {htmlCode}
              </pre>
            )}
          </div>
        </motion.div>
      )}

      {/* Tips */}
      {!htmlCode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-auto grid grid-cols-3 gap-4"
        >
          {[
            { 
              icon: '🎨', 
              title: t('websiteGenerator.tips.professional'), 
              desc: t('websiteGenerator.tips.professionalDesc') 
            },
            { 
              icon: '📱', 
              title: t('websiteGenerator.tips.responsive'), 
              desc: t('websiteGenerator.tips.responsiveDesc') 
            },
            { 
              icon: '🚀', 
              title: t('websiteGenerator.tips.instant'), 
              desc: t('websiteGenerator.tips.instantDesc') 
            },
          ].map((tip, i) => (
            <div key={i} className="p-4 bg-kimi-bg-sidebar rounded-xl text-center">
              <div className="text-2xl mb-2">{tip.icon}</div>
              <h3 className={`text-sm font-medium text-kimi-text ${isRTL ? 'font-arabic' : ''}`}>{tip.title}</h3>
              <p className={`text-xs text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>{tip.desc}</p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
