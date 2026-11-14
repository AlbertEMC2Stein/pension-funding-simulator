"use client";

import katex from "katex";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeading } from "./common";
import { localizedDictionary } from "../lib/help/localized-dictionary";
import { helpMessages } from "../lib/i18n/help";
import { useLanguage } from "./LanguageContext";
import { RESULT_STATUSES, StatusBadge } from "./StatusBadge";
import { DetailedGuide } from "./DetailedGuide";

/**
 * Render a trusted, locally authored LaTeX example with bundled KaTeX.
 * `source` currently comes from the local dictionary registry, not user input.
 */
function Equation({ source }: { source: string }) {
  const markup = useMemo(
    () =>
      katex.renderToString(source, { displayMode: true, throwOnError: false }),
    [source],
  );

  return (
    <div
      className="math-formula"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

/**
 * Search the dictionary. A non-null `selectedTerm` clears the search
 * and focuses that entry after the parent makes the panel visible.
 */
export function HelpView({ selectedTerm }: { selectedTerm: string | null }) {
  const { language } = useLanguage();
  const text = helpMessages[language];
  const entries = localizedDictionary(language);
  const [query, setQuery] = useState("");
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedTerm) return;

    setQuery("");
    // The view stays mounted across navigation; wait for it to become visible.
    const frame = requestAnimationFrame(() => {
      const entry = container.current?.querySelector<HTMLElement>(
        `[data-entry="${selectedTerm}"]`,
      );
      entry?.scrollIntoView({ behavior: "smooth", block: "center" });
      entry?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [selectedTerm]);
  // Match the title, search keywords and introductory text; this is a local
  // substring search rather than a remote dictionary or a full-text index.
  const filtered = entries.filter((entry) =>
    `${entry.title} ${entry.keywords} ${entry.summary} ${entry.explanation} ${entry.category}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );

  return (
    <section className="view active" ref={container} lang={language}>
      <PageHeading
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
      />
      <DetailedGuide />
      <div className="status-guide form-card">
        <span className="tiny-label">{text.guide}</span>
        <h2>{text.statuses}</h2>
        <p>{text.statusIntro}</p>
        <div className="status-examples">
          {RESULT_STATUSES.map(({ status }) => (
            <div className="status-example" key={status}>
              <StatusBadge status={status} />
              <small>{text.statusDescriptions[status]}</small>
            </div>
          ))}
        </div>
        <details className="borrowing-details diagnostic-details">
          <summary>
            {language === "de"
              ? "Weitere Statusangaben"
              : "Other status labels"}
          </summary>
          <p>
            {language === "de"
              ? "Zusätzliche Kennzeichnungen beschreiben Eingabeprüfung und erfasste Einstellungen:"
              : "Additional labels describe input validation and captured settings:"}
          </p>
          <div className="status-examples">
            {(language === "de"
              ? [
                  [
                    "not-available",
                    "EINGABEN PRÜFEN",
                    "Einige Eingaben müssen geprüft werden.",
                  ],
                  [
                    "calculated",
                    "GÜLTIG",
                    "Die Eingabeprüfung war erfolgreich.",
                  ],
                  [
                    "error",
                    "FEHLGESCHLAGEN",
                    "Eine Entwicklerberechnung ist fehlgeschlagen.",
                  ],
                  [
                    "not-calculated",
                    "NICHT VORBEREITET",
                    "Es wurden noch keine Laufeinstellungen erfasst.",
                  ],
                  [
                    "calculated",
                    "AKTUELL",
                    "Die erfassten Einstellungen entsprechen den aktuellen Eingaben.",
                  ],
                ]
              : [
                  [
                    "not-available",
                    "CHECK INPUTS",
                    "Some inputs need attention.",
                  ],
                  ["calculated", "VALID", "The input validation passed."],
                  ["error", "FAILED", "A development calculation failed."],
                  [
                    "not-calculated",
                    "NOT PREPARED",
                    "No run settings have been captured yet.",
                  ],
                  [
                    "calculated",
                    "CURRENT",
                    "The captured settings match the current inputs.",
                  ],
                ]
            ).map(([status, label, description]) => (
              <div className="status-example" key={label}>
                <StatusBadge
                  status={status as import("./StatusBadge").ResultStatus}
                  label={label}
                />
                <small>{description}</small>
              </div>
            ))}
          </div>
          <p>
            {language === "de"
              ? "Die Anpassungs- und Importdiagnostik zeigt außerdem an, ob die Ergebnisse zu den aktuellen Eingaben passen. Das Zulässigkeitsfeld meldet separat, ob die Strategie zulässig ist."
              : "Fit and imported-data diagnostics also indicate whether their results match the current inputs. The feasibility box separately reports whether the strategy is feasible."}
          </p>
        </details>
      </div>
      <div className="dictionary-layout">
        <div>
          <label className="dictionary-search">
            {text.search}
            <input
              type="search"
              placeholder={text.placeholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <p className="dictionary-count" role="status">
            {text.count(filtered.length)}
          </p>
          <p className="math-status">{text.math}</p>
          <div className="dictionary-list">
            {filtered.map((entry) => (
              <article
                key={entry.id}
                data-entry={entry.id}
                className="form-card dictionary-entry"
                tabIndex={-1}
              >
                <span className="tiny-label">{entry.category}</span>
                <h2>{entry.title}</h2>
                <p>{entry.summary}</p>
                <p>{entry.explanation}</p>
                <details>
                  <summary>{text.technical}</summary>
                  <p>{entry.technical}</p>
                  {entry.equation && <Equation source={entry.equation} />}
                  {entry.symbols && <p>{entry.symbols}</p>}
                </details>
              </article>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="dictionary-empty">{text.empty}</p>
          )}
        </div>
        <aside className="insight-card dictionary-aside">
          <span className="tiny-label">{text.asideLabel}</span>
          <h3>{text.asideTitle}</h3>
          <p>{text.asideText}</p>
        </aside>
      </div>
    </section>
  );
}
