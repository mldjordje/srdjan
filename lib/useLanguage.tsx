"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "sr" | "en" | "it";

const STORAGE_KEY = "db_ui_lang";
const DEFAULT_LANGUAGE: Language = "sr";

const languageLocales: Record<Language, string> = {
  sr: "sr-RS",
  en: "en-US",
  it: "it-IT",
};

type LanguageContextValue = {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const normalizeLanguage = (value: string | null | undefined): Language | null => {
  if (!value) {
    return null;
  }

  if (value.startsWith("en")) {
    return "en";
  }

  if (value.startsWith("it")) {
    return "it";
  }

  if (value.startsWith("sr")) {
    return "sr";
  }

  return null;
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_LANGUAGE;
    }

    const stored = normalizeLanguage(localStorage.getItem(STORAGE_KEY));
    if (stored) {
      return stored;
    }

    return normalizeLanguage(navigator.language) ?? DEFAULT_LANGUAGE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      locale: languageLocales[language],
      setLanguage: setLanguageState,
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }
  return context;
};
