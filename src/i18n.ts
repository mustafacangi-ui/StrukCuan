/**
 * i18next yapılandırması.
 * Web: tarayıcı dilini (navigator.language) kullanır.
 * React Native/Expo: expo-localization kullanmak için `getDeviceLocales()` yerine
 *   import * as Localization from 'expo-localization';
 *   const locale = Localization.getLocales()[0]?.languageTag ?? 'en';
 *   i18n.changeLanguage(locale.split('-')[0]);
 *   ile değiştirilebilir.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import id from "./locales/id.json";
import de from "./locales/de.json";
import tr from "./locales/tr.json";

const SUPPORTED_LANGS = ["en", "id", "de", "tr"] as const;
/** Displayed in the UI language selector */
export const APP_LANGS = [
  { code: "en", label: "English",  flag: "🇺🇸" },
  { code: "id", label: "Indonesia", flag: "🇮🇩" },
] as const;
export type AppLang = typeof APP_LANGS[number]["code"];

const LANG_STORAGE_KEY = "sc_lang";

type SupportedLang = (typeof SUPPORTED_LANGS)[number];

function getInitialLanguage(): SupportedLang {
  // 1. User's saved preference
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved as SupportedLang)) {
      return saved as SupportedLang;
    }
  } catch { /* localStorage unavailable */ }

  // 2. Browser language, mapped to supported langs (prefer id for Indonesian browsers)
  if (typeof navigator !== "undefined") {
    const code = (navigator.language ?? "en").split("-")[0].toLowerCase();
    if (SUPPORTED_LANGS.includes(code as SupportedLang)) return code as SupportedLang;
  }
  return "en";
}

/** Call after user picks a language — persists and applies immediately. */
export function setAppLanguage(lang: AppLang): void {
  try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch { /* ignore */ }
  i18n.changeLanguage(lang);
}

function getDeviceLanguage(): SupportedLang {
  return getInitialLanguage();
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    id: { translation: id },
    de: { translation: de },
    tr: { translation: tr },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
export { SUPPORTED_LANGS, getDeviceLanguage };
