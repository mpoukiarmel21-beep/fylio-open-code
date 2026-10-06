import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { I18nManager } from 'react-native';
import fr from './locales/fr'; import en from './locales/en'; import es from './locales/es'; import pt from './locales/pt';
import ar from './locales/ar'; import zh from './locales/zh'; import hi from './locales/hi'; import ru from './locales/ru'; import bn from './locales/bn';

/** Les 9 langues de l'écran « Choix de la langue ». Toute l'UI passe par t('...'). */
export const LANGS = [
  { code: 'fr', flag: '🇫🇷', name: 'Français' }, { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'es', flag: '🇪🇸', name: 'Español' }, { code: 'pt', flag: '🇵🇹', name: 'Português' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية', rtl: true }, { code: 'zh', flag: '🇨🇳', name: '中文' },
  { code: 'hi', flag: '🇮🇳', name: 'हिन्दी' }, { code: 'ru', flag: '🇷🇺', name: 'Русский' }, { code: 'bn', flag: '🇧🇩', name: 'বাংলা' },
];
const resources = { fr: { translation: fr }, en: { translation: en }, es: { translation: es }, pt: { translation: pt }, ar: { translation: ar }, zh: { translation: zh }, hi: { translation: hi }, ru: { translation: ru }, bn: { translation: bn } };

export const detectLang = () => {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return LANGS.some((l) => l.code === code) ? code : 'en';
};
i18n.use(initReactI18next).init({ resources, lng: detectLang(), fallbackLng: 'en', interpolation: { escapeValue: false }, compatibilityJSON: 'v4' });

/** Change la langue ; l'arabe active le RTL (prend effet au prochain lancement sur natif). */
export const setLanguage = (code: string) => {
  const rtl = !!LANGS.find((l) => l.code === code)?.rtl;
  if (I18nManager.isRTL !== rtl) { I18nManager.allowRTL(rtl); I18nManager.forceRTL(rtl); }
  return i18n.changeLanguage(code);
};
export default i18n;