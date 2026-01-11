import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enGB from '@/locales/en-GB.json';
import enUS from '@/locales/en-US.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';
import de from '@/locales/de.json';
import cy from '@/locales/cy.json';

const resources = {
  'en-GB': { translation: enGB },
  'en-US': { translation: enUS },
  'es': { translation: es },
  'fr': { translation: fr },
  'de': { translation: de },
  'cy': { translation: cy },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en-GB',
    defaultNS: 'translation',
    
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    
    react: {
      useSuspense: false, // Prevents suspense issues during SSR/initial load
    },
  });

export default i18n;
