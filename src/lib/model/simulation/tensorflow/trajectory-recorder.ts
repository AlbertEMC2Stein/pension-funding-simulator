import * as tf from "@tensorflow/tfjs";

/**
 * Retain the first `count` paths of a batch at each grid time on the selected
 * backend. The batch consists of independent, identically distributed paths,
 * so this deterministic subset is an unbiased sample and consumes no random
 * draws. Data are read back once, after all grid steps, in time-major order.
 */
export class TrajectoryRecorder {
  private readonly rows: tf.Tensor2D[] = [];

  /** Create an empty recorder for the selected number of paths in one batch. */
  constructor(private readonly count: number) {}

  /** Copy the selected wealth values at one grid time into a retained row. */
  record(wealth: tf.Tensor1D): void {
    this.rows.push(
      tf.tidy(() => wealth.slice([0], [this.count]).reshape([1, this.count])),
    );
  }

  /**
   * Concatenate in small groups to limit the number of simultaneous inputs to a
   * TensorFlow kernel, then read the flattened time-major data to the CPU.
   * All intermediate concatenations are disposed even if reading fails.
   */
  async read(): Promise<Float32Array> {
    let level = this.rows.slice();
    const temporary: tf.Tensor2D[] = [];

    try {
      while (level.length > 1) {
        const next: tf.Tensor2D[] = [];
        for (let index = 0; index < level.length; index += 16) {
          const chunk = tf.concat(
            level.slice(index, index + 16),
            0,
          ) as tf.Tensor2D;
          temporary.push(chunk);
          next.push(chunk);
        }
        level = next;
      }

      return Float32Array.from(await level[0].data());
    } finally {
      tf.dispose(temporary);
    }
  }

  /** Release retained grid rows after completion or failure. */
  dispose(): void {
    tf.dispose(this.rows);
    this.rows.length = 0;
  }
}
