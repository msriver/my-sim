import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ko from "./locales/ko/translation.json";
import en from "./locales/en/translation.json";

// Resources are statically imported (not fetched via i18next-http-backend or similar) because
// this is an offline desktop app with no network/filesystem-backend needs - the whole
// translation set is small enough to bundle directly.
i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
  },
  // Default language when no persisted config.language exists yet; App.tsx overrides this via
  // i18n.changeLanguage() once window.api.config.get() resolves on boot.
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes output; i18next's own escaping isn't needed.
  },
});

export default i18n;
