"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import in-bundle resources to avoid runtime HTTP loading
import enStage from "../locales/en/stage.json" assert { type: "json" };
import zhCNStage from "../locales/zh-CN/stage.json" assert { type: "json" };

const resources = {
  en: { stage: enStage },
  "zh-CN": { stage: zhCNStage },
} as const;

export const DEFAULT_LOCALE = "zh-CN";
export const SUPPORTED_LOCALES = ["en", "zh-CN"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

// Initialize once on client
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LOCALE,
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LOCALES as unknown as string[],
    ns: ["stage"],
    defaultNS: "stage",
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export default i18n;
