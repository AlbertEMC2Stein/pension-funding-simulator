"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  initialSimulationDraft,
  type SimulationDraft,
  type SimulationOptions,
} from "../lib/simulation-options";

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
} | null>(null);

export function SimulationDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(initialSimulationDraft);
  const [prepared, setPrepared] = useState<{
    draft: SimulationDraft;
    options: SimulationOptions;
  } | null>(null);
  return (
    <Context.Provider value={{ draft, setDraft, prepared, setPrepared }}>
      {children}
    </Context.Provider>
  );
}

export function useSimulationDraft() {
  const value = useContext(Context);
  if (!value)
    throw new Error("Simulation inputs require SimulationDraftProvider.");
  return value;
}
