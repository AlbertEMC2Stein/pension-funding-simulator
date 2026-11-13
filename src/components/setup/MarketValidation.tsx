import { useLanguage } from "../LanguageContext";
import { validationMessage } from "../../lib/i18n/validation";
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
  const { language } = useLanguage();

  return (
    <div
      id="market-validation-messages"
      className="feasibility-status market-validation"
      data-status={errors.length ? "invalid" : "feasible"}
      role="status"
      aria-live="polite"
    >
      <strong>
        {language === "de"
          ? "Prüfung der Markteingaben"
          : "Market input validation"}{" "}
        <span>
          {errors.length
            ? language === "de"
              ? "Prüfen"
              : "Needs attention"
            : language === "de"
              ? "Gültig"
              : "Valid"}
        </span>
      </strong>
      {errors.length > 0 && (
        <ul>
          {errors.map((error) => (
            <li key={error}>{validationMessage(error, language)}</li>
          ))}
        </ul>
      )}
      <small>
        {language === "de"
          ? "Gültige Eingaben können zur Marktkalibrierung verwendet werden; Modellannahmen werden unten separat geprüft."
          : "Valid inputs can be used for market calibration; model assumptions are checked separately below."}
      </small>
    </div>
  );
}
