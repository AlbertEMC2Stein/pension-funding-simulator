"use client";

import { useDraft, type View } from "./common";

/** A short workflow step and the workspace panel it leads to. */
interface QuickStartStep {
  title: string;
  description: string;
  action: string;
  destination: View;
}

/** Plain-language steps for the current setup, fitting and simulation workflow. */
const steps: readonly QuickStartStep[] = [
  {
    title: "Set up the market",
    description:
      "In the Market tab, review the example assets and assumptions, enter your own, or import adjusted closing prices in euros.",
    action: "Open Market & investor",
    destination: "setup",
  },
  {
    title: "Set up the investor and fit mortality",
    description:
      "In Investor & mortality, enter your retirement details, starting capital and impoverishment level. Review the survival curve and fit the mortality models.",
    action: "Open Market & investor",
    destination: "setup",
  },
  {
    title: "Choose a withdrawal and run",
    description:
      "On Evaluation, open Simulation settings to choose a target risk or withdrawal. Optionally enable projection, then run the simulation and explore the results.",
    action: "Open Evaluation",
    destination: "evaluation",
  },
  {
    title: "Compare and save",
    description:
      "Use Data & tables to compare variations. Export your setup separately from your results; chart menus offer image and data downloads.",
    action: "Open Data & tables",
    destination: "data",
  },
];

/** Explain the main workflow without requiring familiarity with the model. */
export function QuickStart() {
  const { navigate } = useDraft();

  return (
    <section
      className="form-card quick-start"
      aria-labelledby="quick-start-heading"
    >
      <span className="tiny-label">GETTING STARTED</span>
      <h2 id="quick-start-heading">Your quick start</h2>
      <p>Start with the example or build a setup of your own.</p>
      <ol className="quick-start-steps">
        {steps.map((step, index) => (
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
                onClick={() => navigate(step.destination)}
              >
                {step.action} →
              </button>
            </div>
          </li>
        ))}
      </ol>
      <div className="quick-start-notes">
        <p>
          On a fresh visit, the example mortality models normally fit
          automatically. After changing relevant inputs or importing a setup,
          check and fit the models in Investor &amp; mortality before running.
        </p>
        <p>
          Inputs are normally saved in this browser, but fits and results are
          not saved automatically. Results are model-based estimates; Monte
          Carlo intervals describe sampling uncertainty only.
        </p>
      </div>
    </section>
  );
}
