import assert from "node:assert/strict";
import { test } from "node:test";
import { renderWithDictionary as renderToStaticMarkup } from "./dictionary-render";
import { MarketDataInfo } from "../src/components/setup/MarketDataInfo";

test("market data information explains inputs and links to research sources", () => {
  const html = renderToStaticMarkup(<MarketDataInfo />);
  assert.match(html, /Market data sources/);
  assert.match(html, /not connected to this simulator/);
  assert.match(html, /adjusted closing prices in euros/);
  assert.match(html, /https:\/\/finance\.yahoo\.com\//);
  assert.match(html, /https:\/\/www\.google\.com\/finance\//);
});
