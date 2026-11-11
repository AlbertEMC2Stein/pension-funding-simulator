/** Manual batch sizes offered alongside the automatic choice. */
export const MANUAL_BATCH_SIZES = [4096, 8192, 16384, 32768] as const;

/** A user's batch-size preference before it is resolved for a run. */
export type BatchSizeChoice = "auto" | (typeof MANUAL_BATCH_SIZES)[number];

/**
 * Resolve a validated preference for a positive path count. Automatic sizing
 * aims for four batches and caps the size at 2^15; manual sizes are capped at
 * the number of paths, so even the first batch cannot exceed the run.
 */
export function resolveBatchSize(
  choice: BatchSizeChoice,
  paths: number,
): number {
  const requested =
    choice === "auto" ? Math.min(2 ** 15, Math.ceil(paths / 4)) : choice;

  return Math.min(paths, requested);
}
