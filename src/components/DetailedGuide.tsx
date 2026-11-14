"use client";

import { useLanguage } from "./LanguageContext";
import { gettingStartedMessages } from "../lib/i18n/getting-started";
import { QuickStart } from "./QuickStart";

/** Explain the retirement problem and present the four detailed workflow steps. */
export function DetailedGuide() {
  const { language } = useLanguage();
  const text = gettingStartedMessages[language];

  return (
    <section
      className="form-card detailed-guide"
      aria-labelledby="detailed-guide-heading"
    >
      <span className="tiny-label">{text.whyLabel}</span>
      <h2>{text.whyTitle}</h2>
      {text.whyParagraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <div className="detailed-guide-steps">
        <span className="tiny-label">{text.guideLabel}</span>
        <h2 id="detailed-guide-heading">{text.guideTitle}</h2>
        <QuickStart />
      </div>
    </section>
  );
}
