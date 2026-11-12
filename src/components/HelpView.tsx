"use client";

import katex from "katex";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeading } from "./common";
import {
  dictionaryEntries,
  type DictionaryEntry,
} from "../lib/help/dictionary";

/** The shared registry provides stable IDs for dictionary navigation. */
const entries: readonly DictionaryEntry[] = dictionaryEntries;
import { RESULT_STATUSES, StatusBadge } from "./StatusBadge";
import { QuickStart } from "./QuickStart";

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
    <section className="view active" ref={container}>
      <PageHeading
        eyebrow="HERE WHEN YOU NEED IT"
        title="A little more clarity"
        description="Plain-language explanations, with technical detail when you want it."
      />
      <QuickStart />
      <div className="status-guide form-card">
        <span className="tiny-label">A QUICK GUIDE</span>
        <h2>Result statuses</h2>
        <p>
          These labels explain the state of a result. The examples do not
          reflect an actual run.
        </p>
        <div className="status-examples">
          {RESULT_STATUSES.map(({ status, description }) => (
            <div className="status-example" key={status}>
              <StatusBadge status={status} />
              <small>{description}</small>
            </div>
          ))}
        </div>
        <details className="borrowing-details diagnostic-details">
          <summary>Other status labels</summary>
          <p>
            The developer panel also uses labels for input validation and
            prepared settings:
          </p>
          <div className="status-examples">
            {(
              [
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
              ] as const
            ).map(([status, label, description]) => (
              <div className="status-example" key={label}>
                <StatusBadge status={status} label={label} />
                <small>{description}</small>
              </div>
            ))}
          </div>
          <p>
            <strong>Review fit</strong> means the mortality fit needs updating.
            Imported-data diagnostics use <strong>Matches inputs</strong> or{" "}
            <strong>Inputs changed</strong> to describe their relationship to
            the current market settings. The feasibility box separately reports{" "}
            <strong>Feasible</strong> or <strong>Not feasible</strong>.
          </p>
        </details>
      </div>
      <div className="dictionary-layout">
        <div>
          <label className="dictionary-search">
            Search the dictionary
            <input
              type="search"
              placeholder="Try ‘risk’ or ‘withdrawal’"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <p className="dictionary-count" role="status">
            Showing {filtered.length} {filtered.length === 1 ? "term" : "terms"}
          </p>
          <p className="math-status">
            Equations are rendered in the technical details of selected entries.
          </p>
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
                  <summary>Technical details</summary>
                  <p>{entry.technical}</p>
                  {entry.equation && <Equation source={entry.equation} />}
                  {entry.symbols && <p>{entry.symbols}</p>}
                </details>
              </article>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="dictionary-empty">
              No matching terms. Try another search.
            </p>
          )}
        </div>
        <aside className="insight-card dictionary-aside">
          <span className="tiny-label">LEARN AS YOU GO</span>
          <h3>As much detail as you need.</h3>
          <p>
            Choose an underlined term in the workspace to open its explanation
            here. Card help offers a shorter guide without leaving your current
            view.
          </p>
        </aside>
      </div>
    </section>
  );
}
