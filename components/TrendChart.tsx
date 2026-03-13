"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { MarketData, DataPoint } from "@/lib/types";

interface TrendChartProps {
  data: Record<string, MarketData | null>;
}

const TABS = [
  { key: "sp500", label: "S&P 500", symbol: "^GSPC" },
  { key: "10y", label: "10Y Yield", symbol: "^TNX" },
  { key: "gold", label: "Gold", symbol: "GC=F" },
  { key: "dxy", label: "Dollar", symbol: "DX-Y.NYB" },
  { key: "vix", label: "VIX", symbol: "^VIX" },
];

const RANGES = [
  { key: "5d", label: "7D", range: "5d" },
  { key: "1mo", label: "30D", range: "1mo" },
  { key: "3mo", label: "90D", range: "3mo" },
  { key: "6mo", label: "180D", range: "6mo" },
];

function formatDateForRange(ts: number, range: string): string {
  const d = new Date(ts * 1000);
  if (range === "5d") {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }
  if (range === "6mo" || range === "3mo") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TrendChart({ data }: TrendChartProps) {
  const [activeTab, setActiveTab] = useState("sp500");
  const [activeRange, setActiveRange] = useState("1mo");
  const [chartHistory, setChartHistory] = useState<DataPoint[]>([]);
  const [fetching, setFetching] = useState(false);

  // Use prop data for the default 30d range
  const propHistory = data[activeTab]?.history || [];

  const fetchRangeData = useCallback(
    async (symbol: string, range: string) => {
      setFetching(true);
      try {
        const res = await fetch(
          `/api/market?symbol=${encodeURIComponent(symbol)}&range=${range}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          setChartHistory([]);
          return;
        }
        const json = await res.json();
        const result = json.chart?.result?.[0];
        if (!result) {
          setChartHistory([]);
          return;
        }
        const timestamps: number[] = result.timestamp || [];
        const closes: number[] =
          result.indicators?.quote?.[0]?.close || [];
        const history: DataPoint[] = timestamps
          .map((ts: number, i: number) => ({
            date: formatDateForRange(ts, range),
            value: closes[i],
          }))
          .filter((d: DataPoint) => d.value != null);
        setChartHistory(history);
      } catch {
        setChartHistory([]);
      } finally {
        setFetching(false);
      }
    },
    []
  );

  useEffect(() => {
    if (activeRange === "1mo") {
      setChartHistory(propHistory);
    } else {
      const tab = TABS.find((t) => t.key === activeTab);
      if (tab) fetchRangeData(tab.symbol, activeRange);
    }
  }, [activeTab, activeRange, propHistory, fetchRangeData]);

  const displayData = chartHistory;

  const rangeLabel = RANGES.find((r) => r.key === activeRange)?.label || "30D";

  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        {rangeLabel} Trend
      </h2>
      <div className="bg-navy-light border border-navy-lighter p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-signal-blue text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setActiveRange(r.key)}
                className={`px-2 py-1 text-xs font-medium transition-colors border ${
                  activeRange === r.key
                    ? "border-signal-blue text-signal-blue"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {fetching ? (
          <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm">
            Loading...
          </div>
        ) : displayData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 0,
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-slate-600 text-sm">
            No chart data available
          </div>
        )}
      </div>
    </div>
  );
}
