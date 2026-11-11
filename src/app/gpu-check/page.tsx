"use client";

import { useState } from "react";
import { initializeTensorBackend } from "../../lib/model/simulation/tensorflow/backend";
import { simulateTensorWealthBatch } from "../../lib/model/simulation/tensorflow/wealth-batch";
import { simulateWealthPath } from "../../lib/model/simulation/wealth-path";

/** Run a small WebGPU-versus-scalar comparison in the browser. */
export default function GpuCheckPage() {
    const [output, setOutput] = useState("Not run yet.");

    /** Run both implementations with the same fixed market increments. */
    async function runCheck() {
        try {
            // Supplying only "webgpu" prevents a silent CPU fallback in this check.
            const backend = await initializeTensorBackend(["webgpu"]);

            const r = Math.LN2 / 10;
            const market = {
                realRiskFreeRate: r,
                rho: 0.01,
                mertonDirection: [0.5, 0.5],
            };
            const mortality = {
                tau: 10,
                p: 2,
                kappa: r,
                lambda: 2 * (2 * r - 0.01),
            };
            const investor = {
                initialCapital: 150_000,
                impoverishmentLevel: 100_000,
            };
            const annualWithdrawal = 300_000 * r;
            const times = [0, 1, 2];

            // One path, two assets, and one increment vector per step.
            const increments = [
                [0.1, -0.2],
                [0.05, 0.02],
            ];

            const gpu = await simulateTensorWealthBatch({
                market,
                mortality,
                investor,
                annualWithdrawal,
                pathCount: 1,
                times,
                increments,
            });

            let step = 0;

            const scalar = simulateWealthPath(
                {
                    initialStep: {
                        market,
                        mortality,
                        annualWithdrawal,
                        investor: {
                            impoverishmentLevel: investor.impoverishmentLevel,
                            current: {
                                time: 0,
                                wealth: investor.initialCapital,
                            },
                        },
                    },
                    times,
                    recordTrajectory: false,
                },
                () => increments[step++],
            );

            const difference = gpu.finalWealth[0] - scalar.finalState.wealth;

            setOutput(
                [
                    `Backend: ${backend}`,
                    `Scalar final wealth: ${scalar.finalState.wealth}`,
                    `WebGPU final wealth: ${gpu.finalWealth[0]}`,
                    `Difference: ${difference}`,
                    `Scalar status: ${scalar.status}`,
                    `WebGPU first grid hit: ${gpu.firstGridHit[0]}`,
                ].join("\n"),
            );
        } catch (error) {
            setOutput(error instanceof Error ? error.message : String(error));
        }
    }

    return (
        <main>
            <h1>WebGPU simulation check</h1>
            <button type="button" onClick={runCheck}>
                Run check
            </button>
            <pre>{output}</pre>
        </main>
    );
}