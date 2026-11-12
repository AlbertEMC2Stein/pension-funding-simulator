"use client";

import { useId, useRef } from "react";
import {
  dictionaryEntries,
  type DictionaryTermId,
} from "../lib/help/dictionary";
import { useDraft } from "./common";
import { useLanguage } from "./LanguageContext";
import { panelHelpGerman } from "../lib/i18n/panel-help-de";

/** Plain-language guidance and related dictionary entries for one panel. */
interface PanelHelpContent {
  title: string;
  paragraphs: readonly string[];
  terms: readonly DictionaryTermId[];
}

/** Panel-specific copy, kept together so it can be translated and reviewed. */
const panelHelp = {
  withdrawal: {
    title: "Withdrawal and risk",
    paragraphs: [
      "This curve shows the relationship between annual withdrawal and lifetime impoverishment risk in the analytical CE model. The marker shows your chosen risk or withdrawal and the corresponding model-derived value.",
      "The curve uses the unconstrained policy. Results for GM mortality and the projected policy are shown separately.",
    ],
    terms: ["target-risk", "mortality-models", "policy"],
  },
  gm: {
    title: "Risk under GM mortality",
    paragraphs: [
      "This card compares the unconstrained CE-model reference with simulated risk using the fitted Gompertz–Makeham mortality model. If you enter a withdrawal, the CE reference is its model-implied risk.",
      "For projected runs, matched paths also show the projected result and its difference from the unconstrained result. The estimates cover events through the simulation horizon; GM survival can extend beyond it. The interval describes Monte Carlo uncertainty only.",
    ],
    terms: ["gm-risk", "monte-carlo", "projection"],
  },
  capital: {
    title: "What does accepting risk change?",
    paragraphs: [
      "For the same annual withdrawal, compare your starting capital with the modeled amount needed without investment risk. The difference is shown as capital relief or, when applicable, a surplus.",
      "The table also shows the capital required at nearby CE risks. Changes of 5% are relative to the selected risk, not five percentage points. At zero risk, the table compares 1% and 5% instead. This comparison uses the unconstrained CE policy.",
    ],
    terms: ["capital-relief", "safe-boundary", "percentage-points"],
  },
  timing: {
    title: "When might impoverishment occur?",
    paragraphs: [
      "Forecast shows the risk remaining after the selected age as assessed at retirement. Conditional update assumes you are alive and have not reached the threshold at that age; it does not use your current wealth.",
      "The remaining-risk curve falls to zero at the run horizon. Density bars show risk per year, and their area over an age range represents a contribution to risk. Results cover the simulated horizon rather than all possible future ages.",
    ],
    terms: ["timing", "density", "mortality-horizon"],
  },
  borrowing: {
    title: "Borrowing exposure",
    paragraphs: [
      "Ever-borrowing probability estimates the chance of borrowing while alive before impoverishment or the run horizon. Expected borrowing time averages over all paths, including those that never borrow.",
      "Borrowing being possible somewhere does not mean it happens on every path. This view is unavailable for the projected policy, which prohibits borrowing, or when a negative Merton component implies short selling.",
    ],
    terms: ["borrowing", "global-feasibility", "market-direction"],
  },
  allocation: {
    title: "Portfolio allocation",
    paragraphs: [
      "The curves show the share of wealth allocated to each asset at the chosen time and wealth level. They do not predict how your own wealth will evolve.",
      "Negative risky-asset shares indicate short positions; a negative risk-free share indicates borrowing. The chart shows the selected policy. At retirement, the marker indicates your starting capital.",
    ],
    terms: ["policy", "projection", "safe-boundary"],
  },
  mortality: {
    title: "Survival curve and model fit",
    paragraphs: [
      "The cohort curve shows survival from your chosen retirement age, assuming you reach that age. Fitting finds model curves that approximate the selected cohort data; the GM and CE models serve different purposes in the simulator.",
      "The technical diagnostics show differences from the cohort and whether the optimizer converged. Convergence alone does not establish a good fit, and the curves do not predict an individual's lifespan.",
    ],
    terms: ["cohort", "mortality-models", "mortality-diagnostics"],
  },
  withdrawalTable: {
    title: "Withdrawal, risk and policy table",
    paragraphs: [
      "Each row changes the inputs shown in that row; market, mortality and simulation settings are shared. A run captures those settings, so results can need updating after a change.",
      "The CE counterpart is calculated analytically for the unconstrained policy. GM risk is simulated through the run horizon for the policy selected in each row.",
    ],
    terms: ["comparison-tables", "gm-risk", "projection"],
  },
  feasibilityTable: {
    title: "Feasibility sensitivity table",
    paragraphs: [
      "Each row varies the selected risk or withdrawal and impoverishment level while sharing the remaining setup. A run captures those settings; earlier results can need updating after changes.",
      "The table concerns the unconstrained policy. ζ describes global feasibility, while borrowing probability and average borrowing time describe simulated outcomes. The borrowing measures are unavailable when a negative Merton component implies short selling.",
    ],
    terms: ["comparison-tables", "global-feasibility", "borrowing"],
  },
} as const satisfies Record<string, PanelHelpContent>;

/** Identifies the guidance shown by a panel's help control. */
export type PanelHelpId = keyof typeof panelHelp;

/**
 * Open accessible, panel-specific guidance and close it before navigating to a
 * related dictionary entry, so a modal never obscures the destination.
 */
export function PanelHelp({ panel }: { panel: PanelHelpId }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { navigate } = useDraft();
  const { language } = useLanguage();
  const base: PanelHelpContent = panelHelp[panel];
  const content =
    language === "de" ? { ...base, ...panelHelpGerman[panel] } : base;

  return (
    <>
      <button
        type="button"
        className="card-help"
        aria-label={
          language === "de"
            ? `${content.title} erklären`
            : `Explain ${content.title}`
        }
        onClick={() => dialog.current?.showModal()}
      >
        ?
      </button>
      <dialog
        ref={dialog}
        className="help-dialog"
        aria-labelledby={titleId}
        lang={language}
      >
        <div className="help-dialog-heading">
          <div>
            <span className="tiny-label">
              {language === "de"
                ? "DIESE ANSICHT VERSTEHEN"
                : "UNDERSTANDING THIS PANEL"}
            </span>
            <h2 id={titleId}>{content.title}</h2>
          </div>
          <button
            type="button"
            className="close-settings"
            aria-label={language === "de" ? "Hilfe schließen" : "Close help"}
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        {content.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <div
          className="panel-help-links"
          aria-label={
            language === "de"
              ? "Zugehörige Glossareinträge"
              : "Related dictionary entries"
          }
        >
          {content.terms.map((term) => {
            const entry = dictionaryEntries.find((item) => item.id === term);

            return (
              <button
                key={term}
                type="button"
                className="term-link"
                lang="en"
                onClick={() => {
                  dialog.current?.close();
                  navigate("help", term);
                }}
              >
                {entry?.title} ↗
              </button>
            );
          })}
        </div>
      </dialog>
    </>
  );
}
