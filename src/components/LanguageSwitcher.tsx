import { useState, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, initLanguage } from '../i18n';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [currentLang, setCurrentLang] = useState<'ar' | 'en'>('ar');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const lang = initLanguage();
    setCurrentLang(lang);
  }, []);

  const handleLanguageChange = (lang: 'ar' | 'en') => {
    changeLanguage(lang);
    setCurrentLang(lang);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title={t('language.switchTo')}
      >
        <Globe className="w-4 h-4" />
        <span className="font-medium">{currentLang === 'ar' ? 'AR' : 'EN'}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-1 right-0 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
            <button
              onClick={() => handleLanguageChange('ar')}
              className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                currentLang === 'ar' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">🇸🇦</span>
                <span>{t('language.ar')}</span>
              </span>
              {currentLang === 'ar' && <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                currentLang === 'en' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">🇬🇧</span>
                <span>{t('language.en')}</span>
              </span>
              {currentLang === 'en' && <Check className="w-4 h-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
