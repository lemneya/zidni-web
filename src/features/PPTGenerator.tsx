import { useState } from 'react';
import { motion } from 'framer-motion';
import { Presentation, Download, RefreshCw, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PptxGenJS from 'pptxgenjs';
import { sendMessage } from '../services/zidniApi';

interface Slide {
  title: string;
  content: string[];
  layout: 'title' | 'content' | 'two-column' | 'image';
}

export function PPTGenerator() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [topic, setTopic] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [slideCount, setSlideCount] = useState(5);
  const [copied, setCopied] = useState(false);

  const generatePPT = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    try {
      const promptText = isRTL 
        ? `أنشئ عرض تقديمي PowerPoint عن: ${topic}\nعدد الشرائح: ${slideCount}\n\nقدم المحتوى بالشكل التالي لكل شريحة:\nالشريحة [رقم]: [العنوان]\n- [نقطة 1]\n- [نقطة 2]\n- [نقطة 3]`
        : `Create a PowerPoint presentation about: ${topic}\nNumber of slides: ${slideCount}\n\nPresent the content in the following format for each slide:\nSlide [number]: [Title]\n- [Point 1]\n- [Point 2]\n- [Point 3]`;
      
      const response = await sendMessage(promptText, { agent: 'writer' });

      // Parse the response into slides
      const parsedSlides = parseSlidesFromResponse(response.response);
      setSlides(parsedSlides);
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const parseSlidesFromResponse = (text: string): Slide[] => {
    const slides: Slide[] = [];
    const lines = text.split('\n');
    let currentSlide: Slide | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check if this is a new slide (Arabic or English)
      if (trimmed.match(/^الشريحة\s*\d+[:\-]/i) || 
          trimmed.match(/^شريحة\s*\d+[:\-]/i) ||
          trimmed.match(/^Slide\s*\d+[:\-]/i)) {
        if (currentSlide) slides.push(currentSlide);
        currentSlide = {
          title: trimmed.replace(/^الشريحة\s*\d+[:\-]\s*/i, '')
                         .replace(/^شريحة\s*\d+[:\-]\s*/i, '')
                         .replace(/^Slide\s*\d+[:\-]\s*/i, ''),
          content: [],
          layout: 'content'
        };
      } else if (currentSlide && trimmed.startsWith('-')) {
        currentSlide.content.push(trimmed.substring(1).trim());
      } else if (currentSlide && !trimmed.startsWith('```')) {
        currentSlide.content.push(trimmed);
      }
    }

    if (currentSlide) slides.push(currentSlide);
    return slides.length > 0 ? slides : generateDefaultSlides(topic);
  };

  const generateDefaultSlides = (topic: string): Slide[] => [
    { title: topic, content: [isRTL ? 'عنوان العرض التقديمي' : 'Presentation Title'], layout: 'title' },
    { title: isRTL ? 'المقدمة' : 'Introduction', content: [isRTL ? 'نظرة عامة على الموضوع' : 'Overview of the topic', isRTL ? 'أهمية الموضوع' : 'Importance of the topic'], layout: 'content' },
    { title: isRTL ? 'النقاط الرئيسية' : 'Main Points', content: [isRTL ? 'النقطة الأولى' : 'First point', isRTL ? 'النقطة الثانية' : 'Second point', isRTL ? 'النقطة الثالثة' : 'Third point'], layout: 'content' },
    { title: isRTL ? 'الاستنتاج' : 'Conclusion', content: [isRTL ? 'الخلاصة' : 'Summary', isRTL ? 'التوصيات' : 'Recommendations'], layout: 'content' },
    { title: isRTL ? 'شكراً' : 'Thank You', content: [isRTL ? 'أسئلة؟' : 'Questions?'], layout: 'title' },
  ];

  const downloadPPT = () => {
    const pptx = new PptxGenJS();
    
    // Set RTL for Arabic
    if (isRTL) {
      pptx.defineSlideMaster({
        title: 'MASTER_SLIDE',
        background: { color: 'FFFFFF' },
        objects: []
      });
    }

    slides.forEach((slide) => {
      const pptSlide = pptx.addSlide();
      
      if (slide.layout === 'title') {
        pptSlide.addText(slide.title, {
          x: 1, y: 2, w: 8, h: 2,
          fontSize: 44,
          bold: true,
          align: 'center',
          color: '363636'
        });
      } else {
        pptSlide.addText(slide.title, {
          x: 0.5, y: 0.5, w: 9, h: 1,
          fontSize: 32,
          bold: true,
          color: '363636'
        });
        
        slide.content.forEach((point, i) => {
          pptSlide.addText(`• ${point}`, {
            x: 1, y: 2 + i * 0.8, w: 8, h: 0.7,
            fontSize: 18,
            color: '666666'
          });
        });
      }
    });

    pptx.writeFile({ fileName: `${topic || 'presentation'}.pptx` });
  };

  const copyOutline = () => {
    const outline = slides.map((s, i) => 
      `${isRTL ? 'الشريحة' : 'Slide'} ${i + 1}: ${s.title}\n${s.content.map(c => `- ${c}`).join('\n')}`
    ).join('\n\n');
    navigator.clipboard.writeText(outline);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
            <Presentation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-bold text-kimi-text ${isRTL ? 'font-arabic' : ''}`}>{t('pptGenerator.title')}</h1>
            <p className={`text-sm text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>{t('pptGenerator.subtitle')}</p>
          </div>
        </div>
      </motion.div>

      {/* Input Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-kimi-border p-4 mb-4"
      >
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className={`block text-sm text-kimi-text-muted mb-1 ${isRTL ? 'font-arabic' : ''}`}>{t('pptGenerator.topic')}</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t('pptGenerator.placeholder')}
              className={`w-full px-4 py-2 border border-kimi-border rounded-lg outline-none focus:ring-2 focus:ring-pink-300 ${isRTL ? 'font-arabic' : ''}`}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
          <div className="w-32">
            <label className={`block text-sm text-kimi-text-muted mb-1 ${isRTL ? 'font-arabic' : ''}`}>{t('pptGenerator.slides')}</label>
            <select
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
              className={`w-full px-4 py-2 border border-kimi-border rounded-lg outline-none focus:ring-2 focus:ring-pink-300 ${isRTL ? 'font-arabic' : ''}`}
            >
              {[3, 5, 7, 10, 15].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => setTopic('')}
            className={`px-3 py-1.5 text-sm text-kimi-text-secondary hover:text-kimi-text transition-colors ${isRTL ? 'font-arabic' : ''}`}
          >
            {t('websiteGenerator.clear')}
          </button>
          <button
            onClick={generatePPT}
            disabled={isGenerating || !topic.trim()}
            className={`flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-colors ${isRTL ? 'font-arabic' : ''}`}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t('pptGenerator.generating')}
              </>
            ) : (
              <>
                <Presentation className="w-4 h-4" />
                {t('pptGenerator.generate')}
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Slides Preview */}
      {slides.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col bg-white rounded-2xl border border-kimi-border overflow-hidden"
        >
          {/* Toolbar */}
          <div className={`flex items-center justify-between px-4 py-3 border-b border-kimi-border bg-kimi-bg-sidebar ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex items-center gap-2">
              <button
                onClick={copyOutline}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-kimi-border hover:bg-kimi-bg-hover transition-colors text-sm ${isRTL ? 'font-arabic' : ''}`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t('websiteGenerator.copied') : (isRTL ? 'نسخ المخطط' : 'Copy Outline')}
              </button>
              <button
                onClick={downloadPPT}
                className={`flex items-center gap-2 px-3 py-1.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm ${isRTL ? 'font-arabic' : ''}`}
              >
                <Download className="w-4 h-4" />
                {t('pptGenerator.exportPPTX')}
              </button>
            </div>
            <span className={`text-sm text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>
              {slides.length} {isRTL ? 'شريحة' : 'slides'}
            </span>
          </div>

          {/* Slides Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {slides.map((slide, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 flex flex-col"
                >
                  <div className="text-xs text-gray-400 mb-2">{index + 1}</div>
                  <h3 className={`text-sm font-bold text-gray-800 line-clamp-2 mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                    {slide.title}
                  </h3>
                  <ul className="text-xs text-gray-600 space-y-1 flex-1 overflow-hidden">
                    {slide.content.slice(0, 3).map((point, i) => (
                      <li key={i} className={`line-clamp-1 ${isRTL ? 'font-arabic' : ''}`}>• {point}</li>
                    ))}
                    {slide.content.length > 3 && (
                      <li className={`text-gray-400 ${isRTL ? 'font-arabic' : ''}`}>+{slide.content.length - 3} {isRTL ? 'المزيد' : 'more'}</li>
                    )}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tips */}
      {slides.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-auto grid grid-cols-3 gap-4"
        >
          {[
            { 
              icon: '🎯', 
              title: t('pptGenerator.tips.ai'), 
              desc: t('pptGenerator.tips.aiDesc') 
            },
            { 
              icon: '🎨', 
              title: t('pptGenerator.tips.templates'), 
              desc: t('pptGenerator.tips.templatesDesc') 
            },
            { 
              icon: '⚡', 
              title: t('pptGenerator.tips.export'), 
              desc: t('pptGenerator.tips.exportDesc') 
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
