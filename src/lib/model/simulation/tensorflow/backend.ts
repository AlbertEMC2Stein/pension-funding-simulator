import * as tf from "@tensorflow/tfjs";

/** TensorFlow.js backends supported by the simulation prototype, in selectable preference order. */
export type TensorBackend = "webgpu" | "webgl" | "cpu";

/** Select the first available backend and report the actual selection. */
export async function initializeTensorBackend(
  order: readonly TensorBackend[] = ["webgpu", "webgl", "cpu"],
): Promise<TensorBackend> {
  const failures: string[] = [];
  for (const name of order) {
    try {
      if (name === "webgpu") await import("@tensorflow/tfjs-backend-webgpu");
      if (await tf.setBackend(name)) {
        await tf.ready();
        return name;
      }
      failures.push(`${name}: unavailable`);
    } catch (error) {
      failures.push(
        `${name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  throw new Error(
    `Could not initialize a TensorFlow backend (${failures.join("; ")}).`,
  );
}
