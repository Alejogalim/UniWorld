import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';
import enOnboarding from './locales/en/onboarding.json';
import esCommon from './locales/es/common.json';
import esOnboarding from './locales/es/onboarding.json';
import viCommon from './locales/vi/common.json';
import viOnboarding from './locales/vi/onboarding.json';
import enCounselor from './locales/en/counselor.json';
import esCounselor from './locales/es/counselor.json';
import viCounselor from './locales/vi/counselor.json';
import enFinder from './locales/en/finder.json';
import esFinder from './locales/es/finder.json';
import viFinder from './locales/vi/finder.json';

export const resources = {
  en: { common: enCommon, onboarding: enOnboarding, counselor: enCounselor, finder: enFinder },
  es: { common: esCommon, onboarding: esOnboarding, counselor: esCounselor, finder: esFinder },
  vi: { common: viCommon, onboarding: viOnboarding, counselor: viCounselor, finder: viFinder },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  ns: ['common', 'onboarding', 'counselor', 'finder'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

// Keep <html lang> in step with the UI language for every change path.
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});
document.documentElement.lang = i18n.resolvedLanguage ?? 'en';

export default i18n;
