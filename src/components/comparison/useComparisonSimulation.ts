"use client";

import { useEffect, useRef, useState } from "react";
import type { SimulationDraft } from "../../lib/options/simulation-options";
import type { SharedMortalityFits } from "../SimulationDraftContext";
import { ComparisonQueue, type ComparisonQueueState } from "./comparison-queue";
import {
  prepareComparisonRows,
  type ComparisonRowInput,
} from "./comparison-run";

/** One captured comparison run and its current queue state. */
export interface ComparisonRun extends ComparisonQueueState {
  signature: string;
}

/**
 * Own the table's worker queue and capture its shared setup at the start.
 * Edits during a run do not alter the captured jobs. Workers are terminated
 * when the owning view unmounts and late messages cannot update a newer run.
 */
export function useComparisonSimulation(
  draft: SimulationDraft,
  fits: SharedMortalityFits,
) {
  const [run, setRun] = useState<ComparisonRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queueRef = useRef<ComparisonQueue | null>(null);

  useEffect(
    () => () => {
      queueRef.current?.dispose();
      queueRef.current = null;
    },
    [],
  );

  /** Capture and start the current rows; invalid rows are reported individually. */
  function start(rows: readonly ComparisonRowInput[]) {
    if (queueRef.current) return;
    const prepared = prepareComparisonRows(rows, draft, fits, run);
    if (!prepared.ok) {
      setError(prepared.message);
      return;
    }

    setError(null);
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const queue = new ComparisonQueue(
      prepared.rows,
      () => new Worker(`${basePath}/workers/financial-simulation.worker.js`),
      (state) => {
        if (queueRef.current !== queue) return;
        setRun({ signature: prepared.signature, ...state });
        if (!state.running) queueRef.current = null;
      },
    );
    queueRef.current = queue;
    queue.start();
  }

  /** Ask active workers to stop after their current batch and cancel queued rows. */
  function cancel() {
    queueRef.current?.cancel();
  }

  return { run, error, start, cancel };
}
