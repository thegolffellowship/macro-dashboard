"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { MarketData } from "@/lib/types";

interface TrendChartProps {
  data: Record<string, MarketData | null>;
}

const TABS = [
  { key: "sp500", label: "S&P 500" },
  { key: "10y", label: "10Y Yield" },
  { key: "gold", label: "Gold" },
  { key: "dxy", label: "Dollar" },
  { key: "vix", label: "VIX" },
];

export default function TrendChart({ data }: TrendChartProps) {
  const [activeTab, setActiveTab] = useState("sp500");

  const active = data[activeTab];
  const chartData = active?.history || [];

  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        30-Day Trend
      </h2>
      <div className="bg-navy-light border border-navy-lighter p-4">
        <div className="flex gap-1 mb-4">
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
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
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
