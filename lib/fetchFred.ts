import { FredSeries } from "./types";

const FRED_SERIES: Record<string, { name: string; unit: string }> = {
  FEDFUNDS: { name: "Fed Funds Rate", unit: "%" },
  T10Y2Y: { name: "10Y-2Y Spread", unit: "%" },
  CPIAUCSL: { name: "CPI (YoY)", unit: "%" },
  UNRATE: { name: "Unemployment Rate", unit: "%" },
  DPCCRV1Q225SBEA: { name: "Core PCE", unit: "%" },
};

export async function fetchFredSeries(
  seriesId: string
): Promise<FredSeries | null> {
  try {
    const res = await fetch(
      `/api/fred?series=${encodeURIComponent(seriesId)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const text = await res.text();

    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;

    // Parse CSV - find last non-empty value
    let lastValue = 0;
    for (let i = lines.length - 1; i >= 1; i--) {
      const parts = lines[i].split(",");
      const val = parseFloat(parts[1]);
      if (!isNaN(val)) {
        lastValue = val;
        break;
      }
    }

    const info = FRED_SERIES[seriesId] || { name: seriesId, unit: "" };
    return {
      id: seriesId,
      name: info.name,
      value: lastValue,
      unit: info.unit,
    };
  } catch {
    return null;
  }
}

export async function fetchAllFred(): Promise<FredSeries[]> {
  const ids = Object.keys(FRED_SERIES);
  const results = await Promise.all(ids.map(fetchFredSeries));
  return results.filter((r): r is FredSeries => r !== null);
}
