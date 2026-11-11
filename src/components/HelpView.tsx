"use client";

import katex from "katex";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeading, PreviewBanner } from "./common";

/** One example dictionary entry; `id` is also the target of a `TermLink`. */
interface Entry {
  id: string;
  category: string;
  title: string;
  summary: string;
  explanation: string;
  technical: string;
  equation?: string;
  symbols?: string;
  keywords: string;
}
/** English-only sample content. A future translation layer will replace it. */
const entries: Entry[] = [
  {
    id: "impoverishment",
    category: "RETIREMENT & WEALTH",
    title: "Impoverishment level",
    summary:
      "The wealth level you choose as the point at which your retirement funding has fallen below an acceptable threshold.",
    explanation:
      "This does not have to mean that your wealth has reached zero.",
    technical:
      "The model studies the first time wealth reaches or falls below the selected threshold.",
    keywords: "threshold wealth",
  },
  {
    id: "safe-boundary",
    category: "RETIREMENT & WEALTH",
    title: "Safe boundary",
    summary:
      "The model's risk-free wealth threshold for funding the chosen withdrawal over the relevant horizon.",
    explanation:
      "It provides a benchmark for comparing the capital needed when investment risk is allowed.",
    technical:
      "For a finite remaining-lifetime endpoint T and a positive risk-free rate r, the boundary at time t is:",
    equation: String.raw`x_{\mathrm{safe}}(t)=\frac{C}{r}-\left(\frac{C}{r}-x_{\mathrm{imp}}\right)\mathrm{e}^{-r(T-t)}`,
    symbols:
      "Here C is the annual withdrawal and xᵢₘₚ is the impoverishment threshold. Time t is measured from retirement.",
    keywords: "risk free capital withdrawal",
  },
  {
    id: "projection",
    category: "PORTFOLIO POLICY",
    title: "Projection",
    summary:
      "A way of adjusting a model's portfolio weights so they satisfy the selected investment constraints.",
    explanation:
      "Here it provides a feasible comparison strategy; it is not claimed to be the optimal constrained strategy.",
    technical:
      "The covariance-weighted projection of the unconstrained risky allocation π is:",
    equation: String.raw`\widehat{\pi}=\operatorname*{arg\,min}_{p\geq 0,\;\mathbf{1}^{\mathsf T}p\leq 1}(p-\pi)^{\mathsf T}\Sigma(p-\pi)`,
    symbols:
      "The vector p contains risky-asset weights and Σ is their covariance matrix. The constraints prohibit short positions and borrowing.",
    keywords: "projected policy borrowing short constraint",
  },
  {
    id: "target-risk",
    category: "RISK & RESULTS",
    title: "Target risk",
    summary:
      "The chance of impoverishment before death that you choose when calculating a withdrawal under the model.",
    explanation:
      "A result evaluated under a different mortality model or a projected policy can differ from this target.",
    technical:
      "In the calibrated unconstrained model, the target α is the probability of reaching the impoverishment threshold before death:",
    equation: String.raw`\mathbb{P}(\tau_{\mathrm{imp}}<\mathcal{T})=\alpha`,
    symbols:
      "Here τᵢₘₚ is the time of impoverishment and 𝒯 is the random time of death. The equality refers to the policy's own mortality model and calibration conditions.",
    keywords: "alpha probability lifetime",
  },
  {
    id: "gm-risk",
    category: "RISK & RESULTS",
    title: "GM risk",
    summary:
      "An estimate of impoverishment risk when the strategy is evaluated using a fitted Gompertz–Makeham mortality model.",
    explanation: "It is a model-based estimate, not a known future outcome.",
    technical:
      "Simulation uncertainty and numerical approximation error are distinct from differences between mortality models.",
    keywords: "gompertz makeham mortality simulation",
  },
];

/**
 * Render a trusted, locally authored LaTeX example with bundled KaTeX.
 * `source` currently comes from the static entries above, not user input.
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
 * Search the sample dictionary. A non-null `selectedTerm` clears the search
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
    `${entry.title} ${entry.keywords} ${entry.summary}`
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
      <PreviewBanner>
        <strong>Dictionary preview.</strong> These sample entries illustrate how
        help could work.
      </PreviewBanner>
      <div className="status-guide form-card">
        <span className="tiny-label">DESIGN PREVIEW</span>
        <h2>Result status examples</h2>
        <p>
          These examples show how calculation states could look; they do not
          reflect an actual run.
        </p>
        <div className="status-examples">
          <span className="chip status-idle">○ &nbsp; NOT CALCULATED</span>
          <span className="chip status-running">◌ &nbsp; CALCULATING</span>
          <span className="chip status-stale">↻ &nbsp; NEEDS UPDATE</span>
          <span className="chip status-error">
            ! &nbsp; UNABLE TO CALCULATE
          </span>
        </div>
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
            Showing {filtered.length} example{" "}
            {filtered.length === 1 ? "term" : "terms"}
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
              No matching example terms. Try another search.
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
