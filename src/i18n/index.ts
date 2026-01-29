import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ar from './locales/ar.json';
import en from './locales/en.json';

const resources = {
  ar: { translation: ar },
  en: { translation: en }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

// Helper function to change language with RTL/LTR handling
export const changeLanguage = (lng: 'ar' | 'en') => {
  i18n.changeLanguage(lng);
  
  // Update document direction and language
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
  
  // Update body font family
  if (lng === 'ar') {
    document.body.style.fontFamily = "'Noto Sans Arabic', system-ui, sans-serif";
  } else {
    document.body.style.fontFamily = "system-ui, -apple-system, sans-serif";
  }
  
  // Save preference
  localStorage.setItem('zidni-language', lng);
};

// Initialize language from localStorage or default
export const initLanguage = () => {
  const savedLang = localStorage.getItem('zidni-language') as 'ar' | 'en' | null;
  const lang = savedLang || 'ar';
  changeLanguage(lang);
  return lang;
};
