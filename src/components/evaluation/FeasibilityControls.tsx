import { useLanguage } from "../LanguageContext";
import { feasibilityMessages } from "../../lib/i18n/feasibility";
import { validationMessage } from "../../lib/i18n/validation";
import { TermLink } from "../common";
import type { FeasibilityResult } from "./global-feasibility";
import type { FeasibilityThreshold } from "./feasibility-threshold";

/** Inputs for the selected policy's feasibility message and boundary action. */
interface FeasibilityControlsProps {
  projected: boolean;
  custom: boolean;
  feasibility: FeasibilityResult;
  threshold: FeasibilityThreshold;
  /** Apply the proposed euro value to the shared investor settings. */
  onApply: (value: string) => void;
}

/**
 * Explain global feasibility for the selected policy. The projected policy is
 * simplex-feasible by definition. The threshold action applies only to the
 * unconstrained CE policy.
 */
export function FeasibilityControls({
  projected,
  custom,
  feasibility,
  threshold,
  onApply,
}: FeasibilityControlsProps) {
  const { language } = useLanguage();
  const text = feasibilityMessages[language];
  const status = projected ? "feasible" : feasibility.status;
  const label =
    status === "feasible"
      ? text.feasible
      : status === "unavailable"
        ? text.unavailable
        : text.notFeasible;
  const message = projected
    ? text.projectedMessage
    : validationMessage(feasibility.message, language);

  return (
    <>
      <div className="feasibility-status" data-status={status} role="status">
        <strong>
          <TermLink term="global-feasibility">{text.title}</TermLink>{" "}
          <span>{label}</span>
        </strong>
        <p>{message}</p>
        <small>
          {projected ? text.projectedDetails : text.unconstrainedDetails}
        </small>
      </div>
      <div className="feasibility-action">
        <button
          type="button"
          className="button button-light"
          disabled={projected || "message" in threshold}
          onClick={() => {
            if (!projected && "value" in threshold) onApply(threshold.value);
          }}
        >
          {text.makeFeasible}
        </button>
        <small>
          {projected
            ? text.projectedAction
            : "message" in threshold
              ? validationMessage(threshold.message, language)
              : text.thresholdApplied(
                  threshold.amount.toLocaleString(
                    language === "de" ? "de-DE" : "en-US",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  ),
                  custom,
                )}
        </small>
      </div>
    </>
  );
}
