import { useLanguage } from "../LanguageContext";
import { marketCheckMessages } from "../../lib/i18n/market-checks";
import { validationMessage } from "../../lib/i18n/validation";
import { TermLink } from "../common";
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
  const { language } = useLanguage();
  const text = marketCheckMessages[language];
  const input = buildMarketOptions(market);
  const calibration = input.ok ? calibrateMarket(input.market) : null;

  if (!input.ok || !calibration?.ok) {
    const reason =
      calibration && !calibration.ok ? calibration.error : undefined;

    return (
      <div
        className="feasibility-status market-assumptions"
        data-status="unavailable"
        role="status"
      >
        <strong>
          {text.title} <span>{text.unavailable}</span>
        </strong>
        <p>{text.resolve}</p>
        {reason && <small>{validationMessage(reason, language)}</small>}
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
        {text.title} <span>{issues ? text.review : text.passed}</span>
      </strong>
      {!positiveRho && <p>{text.zeroRho}</p>}
      {negativeAssets.length > 0 && (
        <p>{text.negative(negativeAssets.join(", "))}</p>
      )}
      {!issues && (
        <p>
          {text.positiveBefore}{" "}
          <TermLink term="covariance">{text.covariance}</TermLink>{" "}
          {text.positiveMiddle}{" "}
          <TermLink term="market-direction">{text.merton}</TermLink>{" "}
          {text.positiveAfter}
        </p>
      )}
      <small>{text.note}</small>
    </div>
  );
}
