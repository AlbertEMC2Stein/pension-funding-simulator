import type { Language } from "./messages";

/** Text for the global-feasibility diagnostic and threshold action. */
export interface FeasibilityMessages {
  feasible: string;
  unavailable: string;
  notFeasible: string;
  title: string;
  projectedMessage: string;
  projectedDetails: string;
  unconstrainedDetails: string;
  makeFeasible: string;
  projectedAction: string;
  thresholdApplied: (amount: string, custom: boolean) => string;
}

/** Wording for both the projected and unconstrained policies. */
export const feasibilityMessages: Record<Language, FeasibilityMessages> = {
  en: {
    feasible: "Feasible",
    unavailable: "Not available",
    notFeasible: "Not feasible",
    title: "Global feasibility",
    projectedMessage:
      "The projected policy is globally feasible by construction: it is long-only and does not borrow.",
    projectedDetails:
      "The projected allocation stays within the simplex for all wealth levels.",
    unconstrainedDetails:
      "For the unconstrained CE policy. The Merton vector must be componentwise non-negative, with at least one positive entry.",
    makeFeasible: "Make globally feasible (ζ = 1)",
    projectedAction:
      "This action only applies to the unconstrained policy; the projected policy is already feasible by construction.",
    thresholdApplied: (amount, custom) =>
      `Changes your impoverishment level to €${amount}, rounded up to preserve feasibility; ${custom ? "the target withdrawal stays fixed and the model-derived risk may change" : "the target risk stays fixed and the model-derived withdrawal may change"}.`,
  },
  de: {
    feasible: "Zulässig",
    unavailable: "Nicht verfügbar",
    notFeasible: "Nicht zulässig",
    title: "Globale Zulässigkeit",
    projectedMessage:
      "Die projizierte Strategie ist konstruktionsbedingt global zulässig: Sie verwendet keine Leerverkäufe und nimmt keinen Kredit auf.",
    projectedDetails:
      "Die projizierte Aufteilung bleibt für alle Vermögensstände im Simplex.",
    unconstrainedDetails:
      "Für die unbeschränkte CE-Strategie. Der Merton-Vektor muss komponentenweise nichtnegativ sein und mindestens eine positive Komponente haben.",
    makeFeasible: "Global zulässig machen (ζ = 1)",
    projectedAction:
      "Diese Aktion gilt nur für die unbeschränkte Strategie; die projizierte Strategie ist konstruktionsbedingt bereits zulässig.",
    thresholdApplied: (amount, custom) =>
      `Ändert Ihre Verarmungsgrenze auf €${amount}, zur Wahrung der Zulässigkeit aufgerundet; ${custom ? "die Zielauszahlung bleibt fest und das modellierte Risiko kann sich ändern" : "das Zielrisiko bleibt fest und die modellierte Auszahlung kann sich ändern"}.`,
  },
};
