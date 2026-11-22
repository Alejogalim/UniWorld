import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';
import enOnboarding from './locales/en/onboarding.json';
import esCommon from './locales/es/common.json';
import esOnboarding from './locales/es/onboarding.json';
import viCommon from './locales/vi/common.json';
import viOnboarding from './locales/vi/onboarding.json';

export const resources = {
  en: { common: enCommon, onboarding: enOnboarding },
  es: { common: esCommon, onboarding: esOnboarding },
  vi: { common: viCommon, onboarding: viOnboarding },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  ns: ['common', 'onboarding'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

// Keep <html lang> in step with the UI language for every change path.
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});
document.documentElement.lang = i18n.resolvedLanguage ?? 'en';

export default i18n;
