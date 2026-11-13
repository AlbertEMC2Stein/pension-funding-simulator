import { useLanguage } from "../LanguageContext";
import { importDiagnosticsMessages } from "../../lib/i18n/import-diagnostics";
import { TermLink } from "../common";
import type { HistoricalMarketEstimate } from "../../lib/market/historical-market";

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
  const { language } = useLanguage();
  const text = importDiagnosticsMessages[language];

  return (
    <details className="borrowing-details diagnostic-details market-import-diagnostics">
      <summary>
        <span>{text.title}</span>
        <span className="market-import-status">
          {current ? text.matches : text.changed}
        </span>
      </summary>
      <p>
        {name} · {estimate.firstDate} {text.dateTo} {estimate.lastDate} ·{" "}
        {estimate.rows} {text.datedRows} · {estimate.missingCells}{" "}
        {text.missing}
      </p>
      {!current && <p role="status">{text.stale}</p>}
      <h4 className="market-import-subheading">{text.assets}</h4>
      <div className="capital-table-wrap">
        <table className="capital-table">
          <thead>
            <tr>
              <th rowSpan={2}>{text.asset}</th>
              <th rowSpan={2}>{text.intervals}</th>
              <th rowSpan={2}>{text.coverage}</th>
              <th rowSpan={2}>{text.gap}</th>
              <th colSpan={2}>{text.growth}</th>
              <th colSpan={2}>{text.volatility}</th>
            </tr>
            <tr>
              <th>{text.lower}</th>
              <th>{text.upper}</th>
              <th>{text.lower}</th>
              <th>{text.upper}</th>
            </tr>
          </thead>
          <tbody>
            {estimate.assets.map((asset) => (
              <tr key={asset.name}>
                <td>{asset.name}</td>
                <td>{asset.intervals}</td>
                <td>
                  {asset.years.toFixed(2)} {text.years}
                </td>
                <td>
                  {Math.round(asset.maxGapDays)} {text.days}
                </td>
                <td>{(100 * asset.growthInterval.lower).toFixed(2)}%</td>
                <td>{(100 * asset.growthInterval.upper).toFixed(2)}%</td>
                <td>{(100 * asset.volatilityInterval.lower).toFixed(2)}%</td>
                <td>{(100 * asset.volatilityInterval.upper).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h4 className="market-import-subheading">{text.pairs}</h4>
      {estimate.pairs.length === 0 ? (
        <p>{text.noPairs}</p>
      ) : (
        <div className="capital-table-wrap">
          <table className="capital-table">
            <thead>
              <tr>
                <th rowSpan={2}>{text.pair}</th>
                <th rowSpan={2}>{text.intervals}</th>
                <th rowSpan={2}>{text.coverage}</th>
                <th rowSpan={2}>{text.gap}</th>
                <th colSpan={2}>{text.correlation}</th>
              </tr>
              <tr>
                <th>{text.lower}</th>
                <th>{text.upper}</th>
              </tr>
            </thead>
            <tbody>
              {estimate.pairs.map((pair) => (
                <tr key={JSON.stringify([pair.first, pair.second])}>
                  <td>
                    {pair.first} / {pair.second}
                  </td>
                  <td>{pair.intervals}</td>
                  <td>
                    {pair.years.toFixed(2)} {text.years}
                  </td>
                  <td>
                    {Math.round(pair.maxGapDays)} {text.days}
                  </td>
                  <td>{pair.correlationInterval?.lower.toFixed(2) ?? "—"}</td>
                  <td>{pair.correlationInterval?.upper.toFixed(2) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p>
        {text.uncertaintyBefore}{" "}
        <TermLink term="historical-uncertainty">
          {text.uncertaintyLink}
        </TermLink>{" "}
        {text.uncertaintyAfter}
      </p>
      <p>{text.coverageNote}</p>
    </details>
  );
}
