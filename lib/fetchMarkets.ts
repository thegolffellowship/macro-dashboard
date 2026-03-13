import { MarketData, DataPoint } from "./types";

const SYMBOLS: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^IXIC": "Nasdaq",
  "^DJI": "Dow Jones",
  "^RUT": "Russell 2000",
  "^VIX": "VIX",
  "^TNX": "10Y Treasury",
  "^IRX": "3M Treasury",
  "^TYX": "30Y Treasury",
  "GC=F": "Gold",
  "CL=F": "Crude Oil",
  "DX-Y.NYB": "US Dollar (DXY)",
};

export async function fetchMarketData(
  symbol: string
): Promise<MarketData | null> {
  try {
    const res = await fetch(
      `/api/market?symbol=${encodeURIComponent(symbol)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error) return null;

    const result = data.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const timestamps: number[] = result.timestamp || [];
    const closes: number[] =
      result.indicators?.quote?.[0]?.close || [];

    const price = meta.regularMarketPrice ?? 0;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - previousClose;
    const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

    const history: DataPoint[] = timestamps
      .map((ts: number, i: number) => ({
        date: new Date(ts * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        value: closes[i],
      }))
      .filter((d: DataPoint) => d.value != null);

    return {
      symbol,
      name: SYMBOLS[symbol] || symbol,
      price,
      change,
      changePercent,
      history,
    };
  } catch {
    return null;
  }
}

export async function fetchAllMarkets(): Promise<{
  equities: MarketData[];
  rates: MarketData[];
  commodities: MarketData[];
}> {
  const equitySymbols = ["^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX"];
  const rateSymbols = ["^IRX", "^TNX", "^TYX"];
  const commoditySymbols = ["GC=F", "CL=F", "DX-Y.NYB"];

  const all = await Promise.all(
    [...equitySymbols, ...rateSymbols, ...commoditySymbols].map(fetchMarketData)
  );

  const results = all.map(
    (d, i) =>
      d || {
        symbol: [...equitySymbols, ...rateSymbols, ...commoditySymbols][i],
        name: SYMBOLS[
          [...equitySymbols, ...rateSymbols, ...commoditySymbols][i]
        ],
        price: 0,
        change: 0,
        changePercent: 0,
        history: [],
      }
  );

  return {
    equities: results.slice(0, 5),
    rates: results.slice(5, 8),
    commodities: results.slice(8, 11),
  };
}
