import { fitCompatibleCe, fitGompertzMakeham } from "../lib/mortality/mortality-fitting";

type Request = {
  times: number[];
  target: number[];
  market: { r: number; rho: number } | null;
};
const worker = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage: (value: object) => void;
};

/** Each fit runs independently so an unavailable CE fit does not suppress GM. */
worker.onmessage = ({ data }) => {
  const progress = (model: "gm" | "ce") => (completed: number, total: number) =>
    worker.postMessage({ type: "progress", model, completed, total });
  try {
    worker.postMessage({
      type: "gm",
      fit: fitGompertzMakeham(data.times, data.target, progress("gm")),
    });
  } catch (error) {
    worker.postMessage({
      type: "error",
      model: "gm",
      message: error instanceof Error ? error.message : "GM fitting failed.",
    });
  }
  if (data.market) {
    try {
      worker.postMessage({
        type: "ce",
        fit: fitCompatibleCe(
          data.times,
          data.target,
          data.market.r,
          data.market.rho,
          progress("ce"),
        ),
      });
    } catch (error) {
      worker.postMessage({
        type: "error",
        model: "ce",
        message: error instanceof Error ? error.message : "CE fitting failed.",
      });
    }
  }
  worker.postMessage({ type: "done" });
};
