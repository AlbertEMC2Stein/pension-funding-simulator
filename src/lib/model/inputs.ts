import type { SimulationOptions } from "../options/simulation-options";

/**
 * Initial wealth and the impoverishment threshold in euros. Reuse the
 * validated options fields so financial model calculations share their units
 * and definitions; this type does not perform validation on its own.
 */
export type InvestorCapital = Pick<
  SimulationOptions["investor"],
  "initialCapital" | "impoverishmentLevel"
>;
