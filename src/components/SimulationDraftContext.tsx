"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  initialSimulationDraft,
  type SimulationDraft,
  type SimulationOptions,
} from "../lib/options/simulation-options";
import type { CeFit, GmFit } from "../lib/mortality/mortality-fitting";

/** Completed fits and their captured input keys; null means no fit is stored. */
export interface SharedMortalityFits {
  gm: { key: string; fit: GmFit } | null;
  ce: { key: string; fit: CeFit } | null;
}

/** Shared editable inputs; the eventual worker receives a separate validated snapshot. */
const Context = createContext<{
  draft: SimulationDraft;
  setDraft: React.Dispatch<React.SetStateAction<SimulationDraft>>;
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
  const [prepared, setPrepared] = useState<{
    draft: SimulationDraft;
    options: SimulationOptions;
  } | null>(null);
  const [mortalityFits, setMortalityFits] = useState<SharedMortalityFits>({
    gm: null,
    ce: null,
  });

  return (
    <Context.Provider
      value={{
        draft,
        setDraft,
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
