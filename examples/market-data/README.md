# Synthetic market data

`two-asset-black-scholes.csv` is a reproducible example for the future market CSV import. It contains synthetic nominal EUR closing-price series, not real securities or historical observations. The two columns are labelled `Synthetic Equity` and `Synthetic Bonds`; the names describe the chosen parameters, not actual investments. There are no dividends or currency conversions, so prices can be treated as adjusted prices for the purposes of the example.

The first column contains ISO dates. There is one observation per weekday from 2016-01-01 to 2025-12-31, inclusive. This artificial calendar includes public holidays and should not be interpreted as an exchange trading calendar. Each interval is simulated as 1/252 of a year, including intervals across weekends.

The generating model is a correlated two-asset geometric Brownian motion with the following annual parameters:

| Parameter | Synthetic Equity | Synthetic Bonds |
| --- | ---: | ---: |
| Initial price | €100 | €100 |
| Nominal drift | 7% | 3.5% |
| Volatility | 16% | 7% |

The instantaneous correlation is 0.25. The pseudorandom generator uses seed `20251108`. The sample estimates will differ from the generating parameters because this is one finite random realization; the values are rounded to four decimal places in the CSV. Prices are nominal and are not inflation-adjusted.

To reproduce the file from the repository root, run:

```sh
node scripts/generate-example-market.mjs > examples/market-data/two-asset-black-scholes.csv
```

The CSV is provided for testing. The app's importer uses calendar time, so this weekday-clock example is not a matched test of its generating assumptions.

## Three-asset calendar-time example

`three-asset-calendar-complete.csv` and `three-asset-calendar-missing.csv` contain the same synthetic nominal EUR price paths; the latter leaves some cells empty. They are artificial test data, not actual market prices. There are no dividends or currency conversions, so prices serve as adjusted prices for this test.

| Asset | Initial price | Annual nominal arithmetic drift | Annual volatility |
| --- | ---: | ---: | ---: |
| Synthetic Global Equity | €450 | 7% | 16% |
| Synthetic Government Bonds | €200 | 3.5% | 7% |
| Synthetic Small-Cap Equity | €75 | 8% | 22% |

The correlation matrix in that order is `[[1, 0.25, 0.60], [0.25, 1, 0.10], [0.60, 0.10, 1]]`. Returns follow geometric Brownian motion. Drifts are SDE arithmetic coefficients, not the compounded-growth input shown in the app; the corresponding annual compounded growth rates are approximately 5.89%, 3.31%, and 5.74%.

The dates span 2016-01-01 to 2025-12-31 and include weekdays only. This artificial observation calendar includes public holidays. The price process uses elapsed calendar days divided by 365.25, including weekends: for example, a Friday-to-Monday transition has duration 3/365.25 years. The first and final dates are fully observed; each other asset/date cell is independently blanked with probability 3%. A blank means a missing price, not a zero price. Prices are rounded to six decimal places.

The generator uses separate Mulberry32 pseudorandom streams for the price paths (seed `20261109`) and missingness (seed `20261110`), with Box–Muller normal draws. Regenerate both files from the website root with:

```sh
node scripts/generate-three-asset-market.mjs --complete > examples/market-data/three-asset-calendar-complete.csv
node scripts/generate-three-asset-market.mjs --missing > examples/market-data/three-asset-calendar-missing.csv
```

These commands overwrite the named files. The generation seed, parameters and missingness are known, but one finite realization's estimates will not equal the true parameters exactly. Both CSVs can be used with the app's price-data importer.
