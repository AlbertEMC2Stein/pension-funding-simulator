"use client";

import { useDraft, type View } from "./common";
import { useLanguage } from "./LanguageContext";
import { quickStartMessages } from "../lib/i18n/quick-start";

/** Destinations are shared by all translations and never depend on display text. */
const destinations: readonly View[] = ["setup", "setup", "evaluation", "data"];

/** Explain the main workflow without requiring familiarity with the model. */
export function QuickStart() {
  const { navigate } = useDraft();
  const { language } = useLanguage();
  const text = quickStartMessages[language];

  return (
    <section
      className="form-card quick-start"
      lang={language}
      aria-labelledby="quick-start-heading"
    >
      <span className="tiny-label">{text.eyebrow}</span>
      <h2 id="quick-start-heading">{text.title}</h2>
      <p>{text.introduction}</p>
      <ol className="quick-start-steps">
        {text.steps.map((step, index) => (
          <li key={step.title} className="quick-start-step">
            <span className="quick-start-number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <button
                type="button"
                className="term-link quick-start-link"
                onClick={() => navigate(destinations[index])}
              >
                {step.action} →
              </button>
            </div>
          </li>
        ))}
      </ol>
      <div className="quick-start-notes">
        <p>{text.fitNote}</p>
        <p>{text.resultNote}</p>
      </div>
    </section>
  );
}
