"use client";

import { useDraft, type View } from "./common";
import { useLanguage } from "./LanguageContext";
import { gettingStartedMessages } from "../lib/i18n/getting-started";

/** Destinations are shared by all translations and never depend on display text. */
const destinations: readonly View[] = ["setup", "setup", "evaluation", "data"];

/** Display the four detailed workflow steps with links to their workspace views. */
export function QuickStart() {
  const { navigate } = useDraft();
  const { language } = useLanguage();
  const text = gettingStartedMessages[language];

  return (
    <div className="quick-start" lang={language}>
      <ol className="quick-start-steps">
        {text.steps.map((step, index) => (
          <li key={step.title} className="quick-start-step">
            <span className="quick-start-number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h3>{step.title}</h3>
              {step.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
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
    </div>
  );
}
