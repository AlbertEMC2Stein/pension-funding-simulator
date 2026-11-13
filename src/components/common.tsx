"use client";

import { createContext, useContext } from "react";
import { useLanguage } from "./LanguageContext";
import { localizedTermTitle } from "../lib/help/localized-dictionary";
import {
  dictionaryEntries,
  type DictionaryTermId,
} from "../lib/help/dictionary";

/** Identifiers for the four locally switched workspace panels. */
export type View = "evaluation" | "setup" | "data" | "help" | "developer";

/** Actions supplied by the application shell to nested draft components. */
export interface DraftActions {
  /** Switch panels and optionally focus a dictionary entry by its ID. */
  navigate: (view: View, term?: string) => void;
  /** Display a temporary message, primarily for unimplemented actions. */
  notice: (message: string) => void;
}

/** Shared shell actions; wrap components in this provider before using them. */
export const DraftContext = createContext<DraftActions | null>(null);

/** Access shell actions and fail clearly if the provider is missing. */
export function useDraft(): DraftActions {
  const value = useContext(DraftContext);

  if (!value)
    throw new Error("Draft components must be inside the application shell.");

  return value;
}

/** Button for a design-only action: it displays a notice instead of executing it. */
export function DemoAction({
  children,
  message,
  className = "button button-light",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  const { notice } = useDraft();

  return (
    <button type="button" className={className} onClick={() => notice(message)}>
      {children}
    </button>
  );
}

/** Open the dictionary and focus the entry whose ID matches `term`. */
export function TermLink({
  term,
  children,
}: {
  term: DictionaryTermId;
  children: React.ReactNode;
}) {
  const { navigate } = useDraft();
  const { language } = useLanguage();
  const title = localizedTermTitle(term, language);

  return (
    <button
      type="button"
      className="term-link"
      aria-label={
        language === "de" ? `Mehr über ${title}` : `Learn about ${title}`
      }
      onClick={() => navigate("help", term)}
    >
      {children}
    </button>
  );
}

/** Prominent reminder that the displayed content is an interface preview. */
export function PreviewBanner({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();

  return (
    <div className="preview-banner">
      <span className="preview-icon">✳</span>
      <div>{children}</div>
      <span className="preview-tag">
        {language === "de" ? "VORSCHAU" : "PREVIEW MODE"}
      </span>
    </div>
  );
}

/** Consistent section heading with an optional trailing action. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <div className="eyebrow muted">{eyebrow}</div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}

/** Consistent workspace-panel heading with an optional trailing action. */
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          <span /> {eyebrow}
        </div>
        <h1>
          {title}
          {!/[?!]$/.test(title) && <span className="heading-dot">.</span>}
        </h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}

/** Placeholder result tile; the dash is not a computed numerical value. */
export function Metric({
  label,
  note,
  value = "—",
}: {
  label: string;
  note: React.ReactNode;
  value?: React.ReactNode;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
