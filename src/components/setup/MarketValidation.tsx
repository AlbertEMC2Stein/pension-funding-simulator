import {
  marketValidationErrors,
  type MarketCalibrationDraft,
} from "../../lib/market/market-calibration";

/**
 * Display validation for the shared market inputs and asset universe. The
 * stable element ID also connects the risk-free input to its error explanation.
 */
export function MarketValidation({
  market,
}: {
  market: MarketCalibrationDraft;
}) {
  const errors = marketValidationErrors(market);

  return (
    <div
      id="market-validation-messages"
      className="feasibility-status market-validation"
      data-status={errors.length ? "invalid" : "feasible"}
      role="status"
      aria-live="polite"
    >
      <strong>
        Market input validation{" "}
        <span>{errors.length ? "Needs attention" : "Valid"}</span>
      </strong>
      {errors.length > 0 && (
        <ul>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      <small>
        Valid inputs can be used for market calibration; model assumptions are
        checked separately below.
      </small>
    </div>
  );
}
