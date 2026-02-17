import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import grCommon from "./locales/gr/common.json";
import enCommon from "./locales/en/common.json";
import grGraduates from "./locales/gr/graduates.json";
import enGraduates from "./locales/en/graduates.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      gr: { common: grCommon, graduates: grGraduates },
      en: { common: enCommon, graduates: enGraduates },
    },
    fallbackLng: "gr",
    supportedLngs: ["gr", "en"],
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
