import type { HistoricalMarketEstimate } from "../../lib/historical-market";

/** Reviewable layout for imported-price coverage and future uncertainty results. */
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
          {current ? "Current" : "Needs updating"}
        </span>
      </summary>
      <p>
        {name} · {estimate.firstDate} to {estimate.lastDate} · {estimate.rows}{" "}
        dated rows · {estimate.missingCells} missing price cells.
      </p>
      {!current && (
        <p role="status">
          These are the previous import’s estimates. Asset inputs have changed
          since then.
        </p>
      )}
      <div className="capital-table-wrap">
        <table className="capital-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Annual growth</th>
              <th>95% interval</th>
              <th>Half-width</th>
            </tr>
          </thead>
          <tbody>
            {estimate.assets.map((asset) => (
              <tr key={asset.name}>
                <td>{asset.name}</td>
                <td>{(asset.compoundedGrowth * 100).toFixed(2)}%</td>
                <td>—</td>
                <td>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Confidence intervals and half-widths are not calculated yet. Imported
        values are rounded to two decimals for subsequent calculations.
      </p>
      <h4 className="market-import-subheading">Asset coverage</h4>
      <dl>
        {estimate.assets.map((asset) => (
          <div key={asset.name}>
            <dt>{asset.name}</dt>
            <dd>
              {asset.intervals} intervals · {asset.years.toFixed(2)} years ·
              longest gap {Math.round(asset.maxGapDays)} days
            </dd>
          </div>
        ))}
      </dl>
      <details className="market-pair-details">
        <summary>Pairwise coverage &amp; covariance uncertainty</summary>
        {estimate.pairs.length === 0 ? (
          <p>Pairwise diagnostics require at least two assets.</p>
        ) : (
          <>
            <p>Largest individual covariance interval: not calculated yet.</p>
            <div className="capital-table-wrap">
              <table className="capital-table">
                <thead>
                  <tr>
                    <th>Asset pair</th>
                    <th>Intervals</th>
                    <th>Coverage</th>
                    <th>Longest gap</th>
                    <th>95% covariance interval</th>
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
                      <td>—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </details>
      <p>
        Durations use calendar days / 365.25; no missing prices are filled.
        Growth and volatility use each asset’s observed intervals, while
        correlations use matching dates for each pair.
      </p>
    </details>
  );
}
