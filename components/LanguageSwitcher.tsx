"use client";

import { useLanguage, type Language } from "@/lib/useLanguage";

const options: { value: Language; label: string }[] = [
  { value: "sr", label: "SR" },
  { value: "en", label: "EN" },
  { value: "it", label: "IT" },
];

type LanguageSwitcherProps = {
  compact?: boolean;
};

export default function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`language-switcher${compact ? " is-compact" : ""}`} role="group" aria-label="Language switcher">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`language-switcher__button${language === option.value ? " is-active" : ""}`}
          onClick={() => setLanguage(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
