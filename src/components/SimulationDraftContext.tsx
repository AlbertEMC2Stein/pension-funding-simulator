"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  initialSimulationDraft,
  type SimulationDraft,
} from "../lib/options/simulation-options";
import type { RunConfigurationInput } from "../lib/model/simulation/run-configuration";
import type { CeFit, GmFit } from "../lib/mortality/mortality-fitting";
import type { EvaluationRun } from "./evaluation/useEvaluationRun";
import {
  initialSetupTables,
  type SetupFile,
  type SetupTables,
} from "../lib/options/setup-file";
import { readSavedDraft, writeSavedDraft } from "../lib/options/saved-draft";

/** Name used for an unnamed setup throughout the interface. */
export const DEFAULT_SETUP_NAME = "A thoughtful start";

/** Completed fits and their captured input keys; null means no fit is stored. */
export interface SharedMortalityFits {
  gm: { key: string; fit: GmFit } | null;
  ce: { key: string; fit: CeFit } | null;
}

/** Captured worker input or preparation outcome for one comparison-table row. */
export interface InspectedTableRow {
  id: number;
  name: string;
  input?: RunConfigurationInput;
  outcome: string;
}

/** Most recent captured rows per comparison table, retained for developer inspection. */
export type InspectedTables = Partial<
  Record<"withdrawal" | "feasibility", InspectedTableRow[]>
>;

/** One-time startup fit status, shared so Evaluation can show progress. */
export type InitialMortalityFit =
  | { phase: "checking-storage" }
  | { phase: "loading" }
  | { phase: "complete" }
  | { phase: "skipped" }
  | { phase: "running"; model: string; completed: number; total: number }
  | { phase: "error"; message: string };

/** Shared editable inputs; the eventual worker receives a separate validated snapshot. */
const Context = createContext<{
  draft: SimulationDraft;
  setDraft: React.Dispatch<React.SetStateAction<SimulationDraft>>;
  /** Display-only setup name; it does not change simulation results. */
  setupName: string;
  setSetupName: React.Dispatch<React.SetStateAction<string>>;
  tables: SetupTables;
  setTables: React.Dispatch<React.SetStateAction<SetupTables>>;
  /** Most recent completed Evaluation result, for a separate results export. */
  evaluationResult: EvaluationRun | null;
  setEvaluationResult: React.Dispatch<
    React.SetStateAction<EvaluationRun | null>
  >;
  /** Incremented on import to discard panel-local results and terminate workers. */
  workspaceRevision: number;
  importSetup: (file: SetupFile) => boolean;
  registerRunGuard: (isRunning: () => boolean) => () => void;
  prepared: RunConfigurationInput | null;
  setPrepared: React.Dispatch<
    React.SetStateAction<RunConfigurationInput | null>
  >;
  inspectedTables: InspectedTables;
  setInspectedTables: React.Dispatch<React.SetStateAction<InspectedTables>>;
  mortalityFits: SharedMortalityFits;
  setMortalityFits: React.Dispatch<React.SetStateAction<SharedMortalityFits>>;
  initialMortalityFit: InitialMortalityFit;
  setInitialMortalityFit: React.Dispatch<
    React.SetStateAction<InitialMortalityFit>
  >;
  /** User-facing warning when automatic browser storage cannot be used. */
  storageWarning: string | null;
} | null>(null);

/** Provide shared inputs and restore editable drafts locally before starting the mortality fit. */
export function SimulationDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(initialSimulationDraft);
  const [setupName, setSetupName] = useState(DEFAULT_SETUP_NAME);
  const [tables, setTables] = useState(() =>
    initialSetupTables(draft.investor.impoverishmentLevel),
  );
  const [workspaceRevision, setWorkspaceRevision] = useState(0);
  const [storageReady, setStorageReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const storageInitialized = useRef(false);
  const protectedBaseline = useRef<string | null>(null);
  const [evaluationResult, setEvaluationResult] =
    useState<EvaluationRun | null>(null);
  const runGuards = useRef(new Set<() => boolean>());
  const [prepared, setPrepared] = useState<RunConfigurationInput | null>(null);
  const [inspectedTables, setInspectedTables] = useState<InspectedTables>({});
  const [mortalityFits, setMortalityFits] = useState<SharedMortalityFits>({
    gm: null,
    ce: null,
  });
  const [initialMortalityFit, setInitialMortalityFit] =
    useState<InitialMortalityFit>({ phase: "checking-storage" });

  // Never read browser storage during server rendering or overwrite it before recovery.
  useEffect(() => {
    if (storageInitialized.current) return;
    storageInitialized.current = true;

    try {
      const saved = readSavedDraft(window.localStorage);
      if (saved) {
        setDraft(saved.draft);
        setSetupName(saved.name);
        setTables(saved.tables);
        setInitialMortalityFit({ phase: "loading" });
        // Remount panel-local state, including the next comparison-row ID.
        setWorkspaceRevision((revision) => revision + 1);
      } else {
        setInitialMortalityFit({ phase: "loading" });
      }
    } catch {
      // Preserve an unreadable entry until the user actually changes the draft.
      protectedBaseline.current = JSON.stringify({
        name: setupName,
        draft,
        tables,
      });
      setInitialMortalityFit({ phase: "skipped" });
      setStorageWarning(
        "The saved setup could not be restored. New changes will be saved locally if browser storage is available.",
      );
    }

    setStorageReady(true);
  }, []);

  // Save only editable inputs, promptly after each edit; never persist results.
  useEffect(() => {
    if (!storageReady) return;
    const saved = { name: setupName, draft, tables };

    if (protectedBaseline.current === JSON.stringify(saved)) return;

    try {
      writeSavedDraft(window.localStorage, saved);
      protectedBaseline.current = null;
      setStorageWarning(null);
    } catch {
      setStorageWarning(
        "Changes could not be saved in this browser. Export your setup to keep a copy.",
      );
    }
  }, [storageReady, draft, setupName, tables]);

  /** Register a live worker check and remove it when its owning panel unmounts. */
  const registerRunGuard = useCallback((isRunning: () => boolean) => {
    runGuards.current.add(isRunning);
    return () => {
      runGuards.current.delete(isRunning);
    };
  }, []);

  /** Apply an already validated file atomically after confirming active work. */
  function importSetup(file: SetupFile): boolean {
    if (
      [...runGuards.current].some((isRunning) => isRunning()) &&
      !window.confirm(
        "A simulation or mortality fit is running. Interrupt it and import this setup?",
      )
    )
      return false;

    setDraft(file.draft);
    protectedBaseline.current = null;
    setSetupName(file.name);
    setTables(file.tables);
    setPrepared(null);
    setInspectedTables({});
    setEvaluationResult(null);
    setMortalityFits({ gm: null, ce: null });
    setInitialMortalityFit({ phase: "skipped" });
    setWorkspaceRevision((revision) => revision + 1);
    return true;
  }

  return (
    <Context.Provider
      value={{
        draft,
        setDraft,
        setupName,
        setSetupName,
        tables,
        setTables,
        evaluationResult,
        setEvaluationResult,
        workspaceRevision,
        importSetup,
        registerRunGuard,
        prepared,
        setPrepared,
        inspectedTables,
        setInspectedTables,
        mortalityFits,
        setMortalityFits,
        initialMortalityFit,
        setInitialMortalityFit,
        storageWarning,
      }}
    >
      {children}
    </Context.Provider>
  );
}

/** Read the shared simulation draft and prepared options. Throws when called outside SimulationDraftProvider. */
export function useSimulationDraft() {
  const value = useContext(Context);

  if (!value)
    throw new Error("Simulation inputs require SimulationDraftProvider.");

  return value;
}
