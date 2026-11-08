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

The CSV is provided for testing; importing or calibrating it in the app is not implemented yet.
