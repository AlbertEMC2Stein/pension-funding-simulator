import type { SimulationDraft } from "./simulation-options";
import { MANUAL_BATCH_SIZES } from "./batch-size";

/** Editable comparison row saved as part of a setup, without calculated output. */
export interface SetupTableRow {
  id: number;
  name: string;
  type: "Target risk" | "Withdrawal";
  value: string;
  impoverishmentLevel: string;
  policy: "Unconstrained" | "Projected";
}

/** The two independent comparison-table configurations. */
export type SetupTables = Record<"withdrawal" | "feasibility", SetupTableRow[]>;

/** Versioned, input-only file format. Derived fits and simulation results are excluded. */
export interface SetupFile {
  format: "pension-funding-setup";
  version: 1;
  /** Identifiers describe the bundled model and cohort data used when saved. */
  metadata: { model: string; mortalityData: string };
  name: string;
  draft: SimulationDraft;
  tables: SetupTables;
}

/** Current identifiers are descriptive; results and source CSV files are not embedded. */
export const SETUP_METADATA = {
  model: "compatible-ce-1",
  mortalityData: "destatis-germany-cohorts-1926-2026",
} as const;

/** Create the initial editable rows for each comparison table. */
export function initialSetupTables(impoverishmentLevel: string): SetupTables {
  /** Construct separate row objects so edits never affect the other table. */
  function rows(): SetupTableRow[] {
    return [
      {
        id: 1,
        name: "Variation 01",
        type: "Target risk",
        value: "5.0",
        policy: "Unconstrained",
        impoverishmentLevel,
      },
      {
        id: 2,
        name: "Variation 02",
        type: "Target risk",
        value: "10.0",
        policy: "Projected",
        impoverishmentLevel,
      },
    ];
  }

  return { withdrawal: rows(), feasibility: rows() };
}

/** Check for a non-null plain JSON object before reading its fields. */
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Accept bounded editable text, including temporarily incomplete input. */
function text(value: unknown, max = 100): value is string {
  return typeof value === "string" && value.length <= max;
}

/** Validate every shape and enum needed to safely restore a setup into the UI. */
export function parseSetupFile(source: string): SetupFile {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error("The file is not valid JSON.");
  }

  if (
    !record(value) ||
    value.format !== "pension-funding-setup" ||
    value.version !== 1
  )
    throw new Error("This is not a supported setup file (expected version 1).");
  if (
    !record(value.metadata) ||
    !text(value.metadata.model, 100) ||
    !value.metadata.model.trim() ||
    !text(value.metadata.mortalityData, 100) ||
    !value.metadata.mortalityData.trim() ||
    !text(value.name, 20) ||
    !value.name.trim() ||
    !record(value.draft) ||
    !record(value.tables)
  )
    throw new Error("The setup name, inputs or tables are missing or invalid.");

  const { market, investor, simulation } = value.draft;
  if (!record(market) || !record(investor) || !record(simulation))
    throw new Error("The market, investor or simulation settings are missing.");

  if (
    !Array.isArray(market.assets) ||
    market.assets.length < 1 ||
    market.assets.length > 10 ||
    !Array.isArray(market.correlations) ||
    market.correlations.length !== market.assets.length ||
    !text(market.nominalRiskFreePercent) ||
    !text(market.inflationPercent) ||
    !Number.isSafeInteger(market.nextAssetId)
  )
    throw new Error("The market settings are malformed.");
  const assets = market.assets;
  const ids = new Set<number>();
  for (const asset of assets) {
    if (
      !record(asset) ||
      !Number.isSafeInteger(asset.id) ||
      (asset.id as number) < 1 ||
      ids.has(asset.id as number) ||
      !text(asset.name) ||
      !text(asset.nominalReturnPercent) ||
      !text(asset.volatilityPercent)
    )
      throw new Error("An asset entry is malformed or has a duplicate ID.");
    ids.add(asset.id as number);
  }
  if (
    (market.nextAssetId as number) <= Math.max(...ids) ||
    (market.nextAssetId as number) > 1_000_000_000 ||
    market.correlations.some(
      (row) =>
        !Array.isArray(row) ||
        row.length !== assets.length ||
        row.some((item: unknown) => !text(item)),
    )
  )
    throw new Error("The correlation matrix or next asset ID is invalid.");

  if (
    !text(investor.birthYear) ||
    !text(investor.retirementYear) ||
    !text(investor.initialCapital) ||
    !text(investor.impoverishmentLevel) ||
    !["female", "male", "custom"].includes(investor.mortality as string) ||
    !["low", "medium", "high"].includes(investor.longevity as string) ||
    typeof investor.maleWeight !== "number" ||
    !Number.isFinite(investor.maleWeight) ||
    investor.maleWeight < 0 ||
    investor.maleWeight > 1
  )
    throw new Error("The investor settings are malformed.");

  if (
    !["targetRisk", "customAmount"].includes(
      simulation.withdrawalMode as string,
    ) ||
    !["monthly", "fortnightly", "weekly"].includes(
      simulation.timeStep as string,
    ) ||
    typeof simulation.projected !== "boolean" ||
    typeof simulation.targetRiskPercent !== "number" ||
    !Number.isFinite(simulation.targetRiskPercent) ||
    typeof simulation.withdrawalEuros !== "number" ||
    !Number.isFinite(simulation.withdrawalEuros) ||
    !Number.isSafeInteger(simulation.paths) ||
    (simulation.paths as number) < 1 ||
    (simulation.batchSize !== "auto" &&
      !MANUAL_BATCH_SIZES.some((size) => size === simulation.batchSize)) ||
    !text(simulation.seed, 64) ||
    !simulation.seed.trim()
  )
    throw new Error("The simulation settings are malformed.");

  for (const kind of ["withdrawal", "feasibility"] as const) {
    const rows = value.tables[kind];
    if (!Array.isArray(rows) || rows.length > 1000)
      throw new Error(`The ${kind} table is malformed.`);
    const rowIds = new Set<number>();
    for (const row of rows) {
      if (
        !record(row) ||
        !Number.isSafeInteger(row.id) ||
        (row.id as number) < 1 ||
        (row.id as number) > 1_000_000_000 ||
        rowIds.has(row.id as number) ||
        !text(row.name, 20) ||
        !row.name.trim() ||
        !text(row.value) ||
        !text(row.impoverishmentLevel) ||
        !["Target risk", "Withdrawal"].includes(row.type as string) ||
        !["Unconstrained", "Projected"].includes(row.policy as string)
      )
        throw new Error(
          `A ${kind} table row is malformed or has a duplicate ID.`,
        );
      rowIds.add(row.id as number);
    }
  }

  // Rebuild the supported shape so unrelated or injected fields are not
  // retained as hidden state or accidentally exported in a later setup.
  const sourceFile = value as unknown as SetupFile;
  const sourceMarket = sourceFile.draft.market;
  const sourceInvestor = sourceFile.draft.investor;
  const sourceSimulation = sourceFile.draft.simulation;
  /** Copy only supported editable row fields. */
  const copyRows = (rows: SetupTableRow[]): SetupTableRow[] =>
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      value: row.value,
      impoverishmentLevel: row.impoverishmentLevel,
      policy: row.policy,
    }));

  return {
    format: "pension-funding-setup",
    version: 1,
    metadata: {
      model: sourceFile.metadata.model,
      mortalityData: sourceFile.metadata.mortalityData,
    },
    name: sourceFile.name,
    draft: {
      market: {
        assets: sourceMarket.assets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          nominalReturnPercent: asset.nominalReturnPercent,
          volatilityPercent: asset.volatilityPercent,
        })),
        correlations: sourceMarket.correlations.map((row) => [...row]),
        nominalRiskFreePercent: sourceMarket.nominalRiskFreePercent,
        inflationPercent: sourceMarket.inflationPercent,
        nextAssetId: sourceMarket.nextAssetId,
      },
      investor: {
        birthYear: sourceInvestor.birthYear,
        retirementYear: sourceInvestor.retirementYear,
        mortality: sourceInvestor.mortality,
        maleWeight: sourceInvestor.maleWeight,
        longevity: sourceInvestor.longevity,
        initialCapital: sourceInvestor.initialCapital,
        impoverishmentLevel: sourceInvestor.impoverishmentLevel,
      },
      simulation: {
        withdrawalMode: sourceSimulation.withdrawalMode,
        targetRiskPercent: sourceSimulation.targetRiskPercent,
        withdrawalEuros: sourceSimulation.withdrawalEuros,
        projected: sourceSimulation.projected,
        paths: sourceSimulation.paths,
        timeStep: sourceSimulation.timeStep,
        batchSize: sourceSimulation.batchSize,
        seed: sourceSimulation.seed,
      },
    },
    tables: {
      withdrawal: copyRows(sourceFile.tables.withdrawal),
      feasibility: copyRows(sourceFile.tables.feasibility),
    },
  };
}
