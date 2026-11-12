"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  shellMessages,
  type Language,
  type ShellMessages,
} from "../lib/i18n/messages";

/** Current language and the translated shell copy available to workspace views. */
export interface LanguageContextValue {
  language: Language;
  shell: ShellMessages;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** Supply the selected language to panels without duplicating persisted state. */
export function LanguageProvider({
  language,
  children,
}: {
  language: Language;
  children: ReactNode;
}) {
  return (
    <LanguageContext.Provider
      value={{ language, shell: shellMessages[language] }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

/** Read the selected language from the application shell. */
export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);

  if (!value)
    throw new Error("Language-aware components require LanguageProvider.");

  return value;
}
