import * as tf from "@tensorflow/tfjs";
import type { RandomStream } from "../random";
import type { BridgeDraws } from "./bridge-hit";

/**
 * Draw one independent bridge threshold, normal and uniform per path from the
 * caller's stream. Values are generated in three path-ordered blocks so they
 * can be shared with another policy in a future paired simulation. The caller
 * owns the returned tensors, normally via the surrounding step's tf.tidy.
 */
export function createTensorBridgeDraws(
  pathCount: number,
  stream: RandomStream,
): BridgeDraws {
  const thresholds = new Float32Array(pathCount);
  const normals = new Float32Array(pathCount);
  const uniforms = new Float32Array(pathCount);

  for (let i = 0; i < pathCount; i += 1)
    thresholds[i] = -Math.log1p(-stream.nextUniform());
  for (let i = 0; i < pathCount; i += 1)
    normals[i] = stream.nextStandardNormal();
  for (let i = 0; i < pathCount; i += 1) uniforms[i] = stream.nextUniform();

  return {
    hitThreshold: tf.tensor1d(thresholds),
    timeNormal: tf.tensor1d(normals),
    timeUniform: tf.tensor1d(uniforms),
  };
}
