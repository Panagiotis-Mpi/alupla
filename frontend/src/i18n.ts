import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enAcademicData from "./locales/en/academicData.json";
import enAuth from "./locales/en/auth.json";
import enCommon from "./locales/en/common.json";
import enGraduateForm from "./locales/en/graduateForm.json";
import enGraduates from "./locales/en/graduates.json";
import enLogs from "./locales/en/logs.json";
import enMap from "./locales/en/map.json";
import enProfile from "./locales/en/profile.json";
import enStatistics from "./locales/en/statistics.json";
import enUsers from "./locales/en/users.json";
import grAcademicData from "./locales/gr/academicData.json";
import grAuth from "./locales/gr/auth.json";
import grCommon from "./locales/gr/common.json";
import grGraduateForm from "./locales/gr/graduateForm.json";
import grGraduates from "./locales/gr/graduates.json";
import grLogs from "./locales/gr/logs.json";
import grMap from "./locales/gr/map.json";
import grProfile from "./locales/gr/profile.json";
import grStatistics from "./locales/gr/statistics.json";
import grUsers from "./locales/gr/users.json";

const resources = {
  gr: {
    common: grCommon,
    graduates: grGraduates,
    auth: grAuth,
    graduateForm: grGraduateForm,
    users: grUsers,
    logs: grLogs,
    profile: grProfile,
    map: grMap,
    statistics: grStatistics,
    academicData: grAcademicData,
  },
  en: {
    common: enCommon,
    graduates: enGraduates,
    auth: enAuth,
    graduateForm: enGraduateForm,
    users: enUsers,
    logs: enLogs,
    profile: enProfile,
    map: enMap,
    statistics: enStatistics,
    academicData: enAcademicData,
  },
};

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources,
  fallbackLng: "gr",
  supportedLngs: ["gr", "en"],
  defaultNS: "common",
  interpolation: { escapeValue: false },
  detection: {
    order: ["localStorage", "navigator"],
    caches: ["localStorage"],
  },
});

export default i18n;
