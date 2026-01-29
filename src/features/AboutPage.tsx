import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Sparkles, Github, Twitter, Mail, Heart, Code, Globe, Cpu } from 'lucide-react';

export function AboutPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const stats = isRTL ? [
    { icon: Sparkles, label: 'ذكاء اصطناعي', value: 'GPT-4o / Gemini' },
    { icon: Code, label: 'أدوات متقدمة', value: '6+ أدوات' },
    { icon: Globe, label: 'بحث الويب', value: 'معلومات محدثة' },
    { icon: Cpu, label: 'تنفيذ الكود', value: 'JavaScript' },
  ] : [
    { icon: Sparkles, label: 'AI Powered', value: 'GPT-4o / Gemini' },
    { icon: Code, label: 'Advanced Tools', value: '6+ Tools' },
    { icon: Globe, label: 'Web Search', value: 'Live Information' },
    { icon: Cpu, label: 'Code Execution', value: 'JavaScript' },
  ];

  const features = isRTL ? [
    'محادثة ذكية بالعربية',
    'توليد مواقع ويب',
    'إنشاء عروض PowerPoint',
    'محرر جداول Excel',
    'بحث عميق في الويب',
    'تنفيذ كود JavaScript',
    'رفع وتحليل الملفات',
    'نظام أدوات متقدم',
  ] : [
    'Smart Arabic Chat',
    'Website Generation',
    'PowerPoint Creation',
    'Excel Spreadsheet Editor',
    'Deep Web Research',
    'JavaScript Code Execution',
    'File Upload & Analysis',
    'Advanced Tools System',
  ];

  return (
    <div className="h-screen overflow-y-auto p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
          <span className="text-white text-3xl font-bold">{isRTL ? 'ز' : 'Z'}</span>
        </div>
        <h1 className={`text-3xl font-bold text-kimi-text mb-2 ${isRTL ? 'font-arabic' : ''}`}>{t('app.name')}</h1>
        <p className={`text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>{t('app.tagline')}</p>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
      >
        {stats.map((stat, i) => (
          <div key={i} className="p-4 bg-white rounded-xl border border-kimi-border text-center">
            <stat.icon className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <p className={`text-sm text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>{stat.label}</p>
            <p className={`text-lg font-bold text-kimi-text ${isRTL ? 'font-arabic' : ''}`}>{stat.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-2xl mx-auto mb-12"
      >
        <div className="bg-white rounded-2xl border border-kimi-border p-6">
          <h2 className={`text-xl font-bold text-kimi-text mb-4 ${isRTL ? 'font-arabic' : ''}`}>{t('about.title')}</h2>
          <p className={`text-kimi-text leading-relaxed mb-4 ${isRTL ? 'font-arabic' : ''}`}>
            {t('about.description')}
          </p>
          <div className="flex items-center gap-2 text-purple-600">
            <Heart className="w-5 h-5 fill-current" />
            <span className={isRTL ? 'font-arabic' : ''}>{t('about.madeWith')}</span>
          </div>
        </div>
      </motion.div>

      {/* Features List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="max-w-2xl mx-auto mb-12"
      >
        <h2 className={`text-xl font-bold text-kimi-text mb-4 text-center ${isRTL ? 'font-arabic' : ''}`}>{t('about.features')}</h2>
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2 p-3 bg-kimi-bg-sidebar rounded-lg">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className={`text-sm text-kimi-text ${isRTL ? 'font-arabic' : ''}`}>{feature}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Contact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="max-w-2xl mx-auto text-center"
      >
        <div className="flex items-center justify-center gap-4">
          <a href="#" className="p-3 bg-white rounded-xl border border-kimi-border hover:border-purple-300 transition-colors">
            <Github className="w-5 h-5 text-kimi-text" />
          </a>
          <a href="#" className="p-3 bg-white rounded-xl border border-kimi-border hover:border-purple-300 transition-colors">
            <Twitter className="w-5 h-5 text-kimi-text" />
          </a>
          <a href="#" className="p-3 bg-white rounded-xl border border-kimi-border hover:border-purple-300 transition-colors">
            <Mail className="w-5 h-5 text-kimi-text" />
          </a>
        </div>
        <p className={`mt-6 text-sm text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>
          © 2024 {t('app.name')}. {isRTL ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
        </p>
      </motion.div>
    </div>
  );
}
