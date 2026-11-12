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
  const status = projected ? "feasible" : feasibility.status;
  const label =
    status === "feasible"
      ? "Feasible"
      : status === "unavailable"
        ? "Not available"
        : "Not feasible";
  const message = projected
    ? "The projected policy is globally feasible by construction: it is long-only and does not borrow."
    : feasibility.message;

  return (
    <>
      <div className="feasibility-status" data-status={status} role="status">
        <strong>
          Global feasibility <span>{label}</span>
        </strong>
        <p>{message}</p>
        <small>
          {projected
            ? "The projected allocation stays within the simplex for all wealth levels."
            : "For the unconstrained CE policy. The Merton vector must be componentwise non-negative, with at least one positive entry."}
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
          Make globally feasible (ζ = 1)
        </button>
        <small>
          {projected
            ? "This action only applies to the unconstrained policy; the projected policy is already feasible by construction."
            : "message" in threshold
              ? threshold.message
              : `Changes your impoverishment level to €${threshold.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, rounded up to preserve feasibility; ${custom ? "the target withdrawal stays fixed and the model-derived risk may change" : "the target risk stays fixed and the model-derived withdrawal may change"}.`}
        </small>
      </div>
    </>
  );
}
