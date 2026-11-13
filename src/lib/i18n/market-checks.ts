import type { Language } from "./messages";

/** Explanations of market checks, independent of calibration calculations. */
export interface MarketCheckMessages {
  title: string;
  unavailable: string;
  resolve: string;
  review: string;
  passed: string;
  zeroRho: string;
  negative: (assets: string) => string;
  positiveBefore: string;
  covariance: string;
  positiveMiddle: string;
  merton: string;
  positiveAfter: string;
  note: string;
}

/** Input and paper-assumption checks for the market panel. */
export const marketCheckMessages: Record<Language, MarketCheckMessages> = {
  en: {
    title: "Market assumption checks",
    unavailable: "Not available",
    resolve: "Resolve any market input errors to evaluate these checks.",
    review: "Review",
    passed: "Passed",
    zeroRho:
      "The market risk premium is zero (ρ = 0). The compatible CE model and its results require ρ > 0.",
    negative: (assets) =>
      `A Merton-vector component is negative for ${assets}. The unconstrained strategy requires short selling whenever wealth is below the safe boundary, so it is not globally simplex-feasible. Borrowing diagnostics are unavailable for this market.`,
    positiveBefore: "The real risk-free rate is positive, the",
    covariance: "covariance matrix",
    positiveMiddle: "is positive definite, ρ > 0, and all",
    merton: "Merton-vector",
    positiveAfter: "components are non-negative.",
    note: "These checks use the current market inputs. Mortality fit and policy-specific conditions are checked separately.",
  },
  de: {
    title: "Prüfung der Marktannahmen",
    unavailable: "Nicht verfügbar",
    resolve:
      "Beheben Sie Fehler in den Markteingaben, um diese Annahmen zu prüfen.",
    review: "Prüfen",
    passed: "Erfüllt",
    zeroRho:
      "Die Marktrisikoprämie ist null (ρ = 0). Das kompatible CE-Modell und seine Ergebnisse erfordern ρ > 0.",
    negative: (assets) =>
      `Für ${assets} ist eine Komponente des Merton-Vektors negativ. Die unbeschränkte Strategie erfordert unterhalb der sicheren Grenze Leerverkäufe und ist daher nicht global im Simplex zulässig. Kreditdiagnosen sind für diesen Markt nicht verfügbar.`,
    positiveBefore: "Der reale risikofreie Zinssatz ist positiv, die",
    covariance: "Kovarianzmatrix",
    positiveMiddle: "ist positiv definit, ρ > 0, und alle Komponenten des",
    merton: "Merton-Vektors",
    positiveAfter: "sind nichtnegativ.",
    note: "Diese Prüfungen verwenden die aktuellen Markteingaben. Die Sterblichkeitsanpassung und strategiespezifische Bedingungen werden gesondert geprüft.",
  },
};
