import type { HistoricalMarketEstimate } from "../../lib/historical-market";

/** Imported-price coverage and model-based estimation uncertainty. */
export function ImportedMarketDiagnostics({
  name,
  estimate,
  current,
}: {
  name: string;
  estimate: HistoricalMarketEstimate;
  current: boolean;
}) {
  return (
    <details className="borrowing-details diagnostic-details market-import-diagnostics">
      <summary>
        <span>Imported data &amp; estimation uncertainty</span>
        <span className="market-import-status">
          {current ? "Matches inputs" : "Inputs changed"}
        </span>
      </summary>
      <p>
        {name} · {estimate.firstDate} to {estimate.lastDate} · {estimate.rows}{" "}
        dated rows · {estimate.missingCells} missing price cells.
      </p>
      {!current && (
        <p role="status">
          These diagnostics describe the original CSV import. The market inputs
          have since been edited and may no longer match the imported estimates.
        </p>
      )}
      <h4 className="market-import-subheading">Assets</h4>
      <div className="capital-table-wrap">
        <table className="capital-table">
          <thead>
            <tr>
              <th rowSpan={2}>Asset</th>
              <th rowSpan={2}>Intervals</th>
              <th rowSpan={2}>Coverage</th>
              <th rowSpan={2}>Longest gap</th>
              <th colSpan={2}>95% interval for annual growth</th>
              <th colSpan={2}>95% interval for volatility</th>
            </tr>
            <tr>
              <th>Lower bound</th>
              <th>Upper bound</th>
              <th>Lower bound</th>
              <th>Upper bound</th>
            </tr>
          </thead>
          <tbody>
            {estimate.assets.map((asset) => (
              <tr key={asset.name}>
                <td>{asset.name}</td>
                <td>{asset.intervals}</td>
                <td>{asset.years.toFixed(2)} years</td>
                <td>{Math.round(asset.maxGapDays)} days</td>
                <td>{(100 * asset.growthInterval.lower).toFixed(2)}%</td>
                <td>{(100 * asset.growthInterval.upper).toFixed(2)}%</td>
                <td>{(100 * asset.volatilityInterval.lower).toFixed(2)}%</td>
                <td>{(100 * asset.volatilityInterval.upper).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h4 className="market-import-subheading">Asset pairs</h4>
      {estimate.pairs.length === 0 ? (
        <p>Pairwise diagnostics require at least two assets.</p>
      ) : (
        <div className="capital-table-wrap">
          <table className="capital-table">
            <thead>
              <tr>
                <th rowSpan={2}>Asset pair</th>
                <th rowSpan={2}>Intervals</th>
                <th rowSpan={2}>Coverage</th>
                <th rowSpan={2}>Longest gap</th>
                <th colSpan={2}>95% interval for correlation</th>
              </tr>
              <tr>
                <th>Lower bound</th>
                <th>Upper bound</th>
              </tr>
            </thead>
            <tbody>
              {estimate.pairs.map((pair) => (
                <tr key={JSON.stringify([pair.first, pair.second])}>
                  <td>
                    {pair.first} / {pair.second}
                  </td>
                  <td>{pair.intervals}</td>
                  <td>{pair.years.toFixed(2)} years</td>
                  <td>{Math.round(pair.maxGapDays)} days</td>
                  <td>{pair.correlationInterval?.lower.toFixed(2) ?? "—"}</td>
                  <td>{pair.correlationInterval?.upper.toFixed(2) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p>
        These intervals describe historical estimation uncertainty under a
        constant-parameter Gaussian log-return model. Growth intervals apply to
        annualized log growth converted to a compounded rate; correlation
        intervals use an approximate Fisher transformation. A dash means there
        are too few paired intervals or perfect correlation. Imported values are
        rounded to two decimals for subsequent calculations.
      </p>
      <p>
        Durations use calendar days / 365.25; no missing prices are filled.
        Growth and volatility use each asset’s observed intervals, while
        correlations use matching dates for each pair.
      </p>
    </details>
  );
}
