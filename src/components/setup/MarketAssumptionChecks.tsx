import { calibrateMarket } from "../../lib/market/calibrate-market";
import type { MarketCalibrationDraft } from "../../lib/market/market-calibration";
import { buildMarketOptions } from "../../lib/options/simulation-options";

/**
 * Report only the assumptions that can be checked from the current market.
 * Input and matrix validation precede calibration; a failed calibration does
 * not imply that any of the subsequent assumptions have passed or failed.
 * Mortality and policy-specific conditions are checked separately.
 */
export function MarketAssumptionChecks({
  market,
}: {
  market: MarketCalibrationDraft;
}) {
  const input = buildMarketOptions(market);
  const calibration = input.ok ? calibrateMarket(input.market) : null;

  if (!input.ok || !calibration?.ok) {
    const reason = !input.ok
      ? input.errors[0]
      : calibration && !calibration.ok
        ? calibration.error
        : undefined;

    return (
      <div
        className="feasibility-status market-assumptions"
        data-status="unavailable"
        role="status"
      >
        <strong>
          Market assumption checks <span>Not available</span>
        </strong>
        <p>Complete valid market inputs to evaluate these checks.</p>
        {reason && <small>{reason}</small>}
      </div>
    );
  }

  const { market: calibrated } = calibration;
  const negativeAssets = calibrated.assetNames.filter(
    (_, index) => calibrated.mertonDirection[index] < 0,
  );
  const positiveRho = calibrated.paperAssumptions.positiveRho;
  const issues = !positiveRho || negativeAssets.length > 0;

  return (
    <div
      className="feasibility-status market-assumptions"
      data-status={issues ? "negative-merton" : "feasible"}
      role="status"
    >
      <strong>
        Market assumption checks <span>{issues ? "Review" : "Passed"}</span>
      </strong>
      {!positiveRho && (
        <p>
          The market risk premium is zero (ρ = 0). The compatible CE model and
          its results require ρ &gt; 0.
        </p>
      )}
      {negativeAssets.length > 0 && (
        <p>
          A Merton-vector component is negative for {negativeAssets.join(", ")}.
          The unconstrained strategy requires short selling whenever wealth is
          below the safe boundary, so it is not globally simplex-feasible.
          Borrowing diagnostics are unavailable for this market.
        </p>
      )}
      {!issues && (
        <p>
          The real risk-free rate is positive, the covariance matrix is positive
          definite, ρ &gt; 0, and all Merton-vector components are non-negative.
        </p>
      )}
      <small>
        These checks use the current market inputs. Mortality fit and
        policy-specific conditions are checked separately.
      </small>
    </div>
  );
}
