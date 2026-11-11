import {
  initialMarketCalibration,
  marketValidationErrors,
  realRateFromNominal,
  type MarketCalibrationDraft,
} from "../market/market-calibration";
import { validateCohortYears } from "../mortality/cohort-survival";

/** Editable values remain strings until a snapshot is prepared. Rates are percentages. */
export interface SimulationDraft {
  market: MarketCalibrationDraft;
  investor: {
    birthYear: string;
    retirementYear: string;
    mortality: "female" | "male" | "custom";
    maleWeight: number;
    longevity: "low" | "medium" | "high";
    initialCapital: string;
    impoverishmentLevel: string;
  };
  simulation: {
    withdrawalMode: "targetRisk" | "customAmount";
    targetRiskPercent: number;
    withdrawalEuros: number;
    projected: boolean;
    paths: number;
    timeStep: "monthly" | "fortnightly" | "weekly";
  };
}

/**
 * Validated UI options ready for model preparation. Annual rates and risk are
 * decimal fractions, amounts are real EUR where applicable, and correlations
 * use the same order as assets. This is not the full reproducible run snapshot.
 */
export interface SimulationOptions {
  market: {
    currency: "EUR";
    nominalRiskFreeRate: number;
    realRiskFreeRate: number;
    inflationRate: number;
    assets: { name: string; nominalReturn: number; volatility: number }[];
    correlation: number[][];
  };
  investor: {
    birthYear: number;
    retirementYear: number;
    mortality: {
      table: "female" | "male" | "custom";
      maleWeight: number;
      longevity: "low" | "medium" | "high";
    };
    initialCapital: number;
    impoverishmentLevel: number;
  };
  policy: {
    projected: boolean;
    withdrawal:
      | { mode: "targetRisk"; targetRisk: number }
      | { mode: "customAmount"; annualAmount: number };
  };
  numerical: { paths: number; timeStep: "monthly" | "fortnightly" | "weekly" };
}

/** Create the initial editable market, investor and numerical settings. Strings preserve incomplete input while editing. */
export function initialSimulationDraft(): SimulationDraft {
  return {
    market: initialMarketCalibration(),
    investor: {
      birthYear: "1965",
      retirementYear: "2032",
      mortality: "female",
      maleWeight: 0.5,
      longevity: "medium",
      initialCapital: "500,000",
      impoverishmentLevel: "100,000",
    },
    simulation: {
      withdrawalMode: "targetRisk",
      targetRiskPercent: 5,
      withdrawalEuros: 25000,
      projected: false,
      paths: 10000,
      timeStep: "monthly",
    },
  };
}

/** Parse plain decimals or English-style grouped EUR amounts, rejecting partial text. */
export function parseAmount(text: string): number | null {
  const trimmed = text.trim();

  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(trimmed)) return null;

  const value = Number(trimmed.replaceAll(",", ""));

  return Number.isFinite(value) ? value : null;
}

/** Validate and convert market inputs independently of the investor profile. */
export function buildMarketOptions(
  market: MarketCalibrationDraft,
):
  | { ok: true; market: SimulationOptions["market"] }
  | { ok: false; errors: string[] } {
  const errors = marketValidationErrors(market);

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    market: {
      currency: "EUR",
      nominalRiskFreeRate: Number(market.nominalRiskFreePercent) / 100,
      realRiskFreeRate: realRateFromNominal(
        market.nominalRiskFreePercent,
        market.inflationPercent,
      )!,
      inflationRate: Number(market.inflationPercent) / 100,
      assets: market.assets.map((asset) => ({
        name: asset.name.trim(),
        nominalReturn: Number(asset.nominalReturnPercent) / 100,
        volatility: Number(asset.volatilityPercent) / 100,
      })),
      correlation: market.correlations.map((row) => row.map(Number)),
    },
  };
}

/**
 * Validate the editable draft and construct independent numerical options.
 * Returns all detected input errors instead of a partial result. This converts
 * UI percentages to fractions but does not fit mortality or run the model.
 */
export function buildSimulationOptions(
  draft: SimulationDraft,
): { ok: true; options: SimulationOptions } | { ok: false; errors: string[] } {
  const marketResult = buildMarketOptions(draft.market);
  const errors = marketResult.ok ? [] : [...marketResult.errors];
  const { investor, simulation } = draft;
  const { birthYear, retirementYear, birthError, retirementError } =
    validateCohortYears(investor.birthYear, investor.retirementYear);

  if (birthError) errors.push(birthError);
  if (retirementError) errors.push(retirementError);

  const initialCapital = parseAmount(investor.initialCapital);
  const impoverishmentLevel = parseAmount(investor.impoverishmentLevel);

  if (initialCapital === null || initialCapital <= 0)
    errors.push("Enter a positive initial capital in euros.");
  if (impoverishmentLevel === null || impoverishmentLevel < 1)
    errors.push("Enter an impoverishment level of at least €1.");
  if (
    initialCapital !== null &&
    impoverishmentLevel !== null &&
    impoverishmentLevel >= initialCapital
  )
    errors.push("Initial capital must exceed the impoverishment level.");
  if (
    !Number.isFinite(investor.maleWeight) ||
    investor.maleWeight < 0 ||
    investor.maleWeight > 1
  )
    errors.push("Mortality mixture weight must be between 0 and 1.");
  if (
    simulation.withdrawalMode === "targetRisk" &&
    (!Number.isFinite(simulation.targetRiskPercent) ||
      simulation.targetRiskPercent <= 0 ||
      simulation.targetRiskPercent >= 100)
  )
    errors.push("Target risk must be between 0% and 100%.");
  if (
    simulation.withdrawalMode === "customAmount" &&
    (!Number.isFinite(simulation.withdrawalEuros) ||
      simulation.withdrawalEuros < 0)
  )
    errors.push("Annual withdrawal must be non-negative.");
  if (!Number.isSafeInteger(simulation.paths) || simulation.paths <= 0)
    errors.push("Number of paths must be a positive integer.");
  if (errors.length || !marketResult.ok) return { ok: false, errors };

  const maleWeight =
    investor.mortality === "male"
      ? 1
      : investor.mortality === "female"
        ? 0
        : investor.maleWeight;

  return {
    ok: true,
    options: {
      market: marketResult.market,
      investor: {
        birthYear,
        retirementYear,
        mortality: {
          table: investor.mortality,
          maleWeight,
          longevity: investor.longevity,
        },
        initialCapital: initialCapital!,
        impoverishmentLevel: impoverishmentLevel!,
      },
      policy: {
        projected: simulation.projected,
        withdrawal:
          simulation.withdrawalMode === "targetRisk"
            ? {
                mode: "targetRisk",
                targetRisk: simulation.targetRiskPercent / 100,
              }
            : {
                mode: "customAmount",
                annualAmount: simulation.withdrawalEuros,
              },
      },
      numerical: { paths: simulation.paths, timeStep: simulation.timeStep },
    },
  };
}
