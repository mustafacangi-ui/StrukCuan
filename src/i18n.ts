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
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

function getDeviceLanguage(): SupportedLang {
  if (typeof navigator === "undefined") return "en";
  const browserLang = navigator.language ?? (navigator as { userLanguage?: string }).userLanguage ?? "en";
  const code = browserLang.split("-")[0].toLowerCase();
  if (SUPPORTED_LANGS.includes(code as SupportedLang)) return code as SupportedLang;
  return "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    id: { translation: id },
    de: { translation: de },
    tr: { translation: tr },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
export { SUPPORTED_LANGS, getDeviceLanguage };
