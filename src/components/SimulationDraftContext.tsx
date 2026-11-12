"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  initialSimulationDraft,
  type SimulationDraft,
  type SimulationOptions,
} from "../lib/options/simulation-options";
import type { CeFit, GmFit } from "../lib/mortality/mortality-fitting";
import {
  initialSetupTables,
  type SetupFile,
  type SetupTables,
} from "../lib/options/setup-file";

/** Name used for an unnamed setup throughout the interface. */
export const DEFAULT_SETUP_NAME = "A thoughtful start";

/** Completed fits and their captured input keys; null means no fit is stored. */
export interface SharedMortalityFits {
  gm: { key: string; fit: GmFit } | null;
  ce: { key: string; fit: CeFit } | null;
}

/** Shared editable inputs; the eventual worker receives a separate validated snapshot. */
const Context = createContext<{
  draft: SimulationDraft;
  setDraft: React.Dispatch<React.SetStateAction<SimulationDraft>>;
  /** Display-only setup name; it does not change simulation results. */
  setupName: string;
  setSetupName: React.Dispatch<React.SetStateAction<string>>;
  tables: SetupTables;
  setTables: React.Dispatch<React.SetStateAction<SetupTables>>;
  /** Incremented on import to discard panel-local results and terminate workers. */
  workspaceRevision: number;
  importSetup: (file: SetupFile) => boolean;
  registerRunGuard: (isRunning: () => boolean) => () => void;
  prepared: { draft: SimulationDraft; options: SimulationOptions } | null;
  setPrepared: React.Dispatch<
    React.SetStateAction<{
      draft: SimulationDraft;
      options: SimulationOptions;
    } | null>
  >;
  mortalityFits: SharedMortalityFits;
  setMortalityFits: React.Dispatch<React.SetStateAction<SharedMortalityFits>>;
} | null>(null);

/** Provide in-memory editable inputs and the most recently prepared options to descendant panels. Neither value is persisted across reloads. */
export function SimulationDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(initialSimulationDraft);
  const [setupName, setSetupName] = useState(DEFAULT_SETUP_NAME);
  const [tables, setTables] = useState(() =>
    initialSetupTables(draft.investor.impoverishmentLevel),
  );
  const [workspaceRevision, setWorkspaceRevision] = useState(0);
  const runGuards = useRef(new Set<() => boolean>());
  const [prepared, setPrepared] = useState<{
    draft: SimulationDraft;
    options: SimulationOptions;
  } | null>(null);
  const [mortalityFits, setMortalityFits] = useState<SharedMortalityFits>({
    gm: null,
    ce: null,
  });

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
    setSetupName(file.name);
    setTables(file.tables);
    setPrepared(null);
    setMortalityFits({ gm: null, ce: null });
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
        workspaceRevision,
        importSetup,
        registerRunGuard,
        prepared,
        setPrepared,
        mortalityFits,
        setMortalityFits,
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
