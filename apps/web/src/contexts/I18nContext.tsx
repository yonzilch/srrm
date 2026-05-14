import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import en from '../locales/en.json';
import zh from '../locales/zh.json';

type Locale = 'en' | 'zh';
type LocaleMap = Record<string, string>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const locales: Record<Locale, LocaleMap> = {
  en: en as LocaleMap,
  zh: zh as LocaleMap,
};

const STORAGE_KEY = 'srrm-locale';

function getBrowserLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'zh') return saved as Locale;
  const lang = navigator.language.toLowerCase();
  return lang.startsWith('zh') ? 'zh' : 'en';
}

function I18nProviderInner({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getBrowserLocale);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string>): string => {
      const value = locales[locale]?.[key] ?? locales['en'][key] ?? key;
      if (params) {
        return Object.entries(params).reduce(
          (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), v),
          value
        );
      }
      return value;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  return <I18nProviderInner>{children}</I18nProviderInner>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nContext');
  }
  return ctx;
}