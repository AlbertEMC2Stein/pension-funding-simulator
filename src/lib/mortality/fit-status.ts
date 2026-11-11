/** Whether the compatible mortality fit is absent, matches current dependencies, or needs review. */
export type CeFitStatus = "not-fitted" | "current" | "needs-update";

/** Cohort and market values that determine the mortality fitting targets. */
export interface MortalityFitKeyInputs {
  birthYear: string;
  retirementYear: string;
  mortality: "female" | "male" | "custom";
  longevity: "low" | "medium" | "high";
  maleWeight: number;
  market: { realRiskFreeRate: number; rho: number } | null;
}

/**
 * Identify the inputs used by the GM and market-compatible CE fits. Capital,
 * withdrawal and other settings do not affect these fits. The CE key is null
 * when a usable market is unavailable.
 */
export function mortalityFitKeys(input: MortalityFitKeyInputs): {
  gm: string;
  ce: string | null;
} {
  const cohort = `${input.birthYear}/${input.mortality}/${input.longevity}`;
  const gm = `${cohort}/${input.retirementYear}/${input.mortality === "custom" ? input.maleWeight : "single"}`;
  const ce = input.market
    ? `${gm}/${input.market.realRiskFreeRate}/${input.market.rho}`
    : null;

  return { gm, ce };
}

/** Compare a completed fit's captured inputs with the currently usable inputs. */
export function ceFitStatus(
  resultKey: string | null,
  currentKey: string | null,
): CeFitStatus {
  if (resultKey === null) return "not-fitted";

  return currentKey === resultKey ? "current" : "needs-update";
}
