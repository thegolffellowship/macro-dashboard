"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import MetricCard from "@/components/MetricCard";
import AlertBanner from "@/components/AlertBanner";
import TrendChart from "@/components/TrendChart";
import EconCalendar, { WEEKLY_EVENTS } from "@/components/EconCalendar";
import MorningBriefing from "@/components/MorningBriefing";
import { fetchAllMarkets } from "@/lib/fetchMarkets";
import { fetchAllFred } from "@/lib/fetchFred";
import { calculateAlerts } from "@/lib/alertEngine";
import { MarketData, FredSeries, AlertSignal } from "@/lib/types";

function formatPrice(val: number, symbol?: string): string {
  if (val === 0) return "—";
  if (symbol === "^VIX") return val.toFixed(2);
  if (symbol?.startsWith("^T") || symbol === "^IRX")
    return val.toFixed(3) + "%";
  if (symbol === "GC=F" || symbol === "CL=F" || symbol === "DX-Y.NYB")
    return val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Dashboard() {
  const [equities, setEquities] = useState<MarketData[]>([]);
  const [rates, setRates] = useState<MarketData[]>([]);
  const [commodities, setCommodities] = useState<MarketData[]>([]);
  const [fredData, setFredData] = useState<FredSeries[]>([]);
  const [btc, setBtc] = useState<{ price: number; change24h: number } | null>(
    null
  );
  const [alerts, setAlerts] = useState<AlertSignal[]>([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [marketsRes, fredRes, cryptoRes] = await Promise.allSettled([
        fetchAllMarkets(),
        fetchAllFred(),
        fetch("/api/crypto").then((r) => r.json()),
      ]);

      if (marketsRes.status === "fulfilled") {
        setEquities(marketsRes.value.equities);
        setRates(marketsRes.value.rates);
        setCommodities(marketsRes.value.commodities);
      }

      let fredResult: FredSeries[] = [];
      if (fredRes.status === "fulfilled") {
        fredResult = fredRes.value;
        setFredData(fredResult);
      }

      if (cryptoRes.status === "fulfilled" && cryptoRes.value?.bitcoin) {
        setBtc({
          price: cryptoRes.value.bitcoin.usd,
          change24h: cryptoRes.value.bitcoin.usd_24h_change,
        });
      }

      // Calculate alerts with all available data
      const allEquitiesAndRates = [
        ...(marketsRes.status === "fulfilled"
          ? [
              ...marketsRes.value.equities,
              ...marketsRes.value.rates,
            ]
          : []),
      ];
      setAlerts(calculateAlerts(allEquitiesAndRates, fredResult));

      setLastUpdated(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build chart data map
  const sp500 = equities.find((e) => e.symbol === "^GSPC") || null;
  const vixData = equities.find((e) => e.symbol === "^VIX") || null;
  const tenY = rates.find((r) => r.symbol === "^TNX") || null;
  const gold = commodities.find((c) => c.symbol === "GC=F") || null;
  const dxy = commodities.find((c) => c.symbol === "DX-Y.NYB") || null;

  const chartData: Record<string, MarketData | null> = {
    sp500,
    "10y": tenY,
    gold,
    dxy,
    vix: vixData,
  };

  // FRED helpers
  const fredMap: Record<string, FredSeries | undefined> = {};
  fredData.forEach((f) => (fredMap[f.id] = f));

  // Fed Funds rate for the rates section
  const fedFunds = fredMap["FEDFUNDS"];
  const yieldCurve = fredMap["T10Y2Y"];

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <Header
          lastUpdated={lastUpdated}
          onRefresh={loadData}
          loading={loading}
        />
        <Link
          href="/tgf"
          className="px-4 py-2 text-sm font-medium bg-navy-lighter text-slate-300 border border-navy-lighter hover:border-signal-blue hover:text-signal-blue transition-colors whitespace-nowrap"
        >
          TGF Tracker &rarr;
        </Link>
      </div>

      {/* Alert Signals */}
      <AlertBanner alerts={alerts} />

      {/* AI Morning Briefing */}
      <MorningBriefing
        equities={equities}
        rates={rates}
        commodities={commodities}
        fredData={fredData}
        alerts={alerts}
        crypto={btc}
        econCalendar={WEEKLY_EVENTS}
        dataReady={!loading && equities.length > 0}
      />

      {/* Equity Markets */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Equity Markets
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {equities.length > 0
            ? equities.map((eq) => (
                <MetricCard
                  key={eq.symbol}
                  name={eq.name}
                  value={formatPrice(eq.price, eq.symbol)}
                  change={eq.change}
                  changePercent={eq.changePercent}
                />
              ))
            : ["S&P 500", "Nasdaq", "Dow Jones", "Russell 2000", "VIX"].map(
                (name) => (
                  <MetricCard key={name} name={name} value="—" failed />
                )
              )}
        </div>
      </section>

      {/* Rates & Fixed Income */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Rates &amp; Fixed Income
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {fedFunds && (
            <MetricCard
              name={fedFunds.name}
              value={fedFunds.value.toFixed(2) + "%"}
            />
          )}
          {rates.length > 0
            ? rates.map((r) => (
                <MetricCard
                  key={r.symbol}
                  name={r.name}
                  value={formatPrice(r.price, r.symbol)}
                  change={r.change}
                  changePercent={r.changePercent}
                />
              ))
            : ["3M Treasury", "10Y Treasury", "30Y Treasury"].map((name) => (
                <MetricCard key={name} name={name} value="—" failed />
              ))}
          {yieldCurve && (
            <MetricCard
              name="2Y/10Y Spread"
              value={yieldCurve.value.toFixed(2) + "%"}
              unit={yieldCurve.value < 0 ? "inverted" : ""}
            />
          )}
        </div>
      </section>

      {/* Commodities & Dollar */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Commodities &amp; Dollar
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {commodities.length > 0
            ? commodities.map((c) => (
                <MetricCard
                  key={c.symbol}
                  name={c.name}
                  value={formatPrice(c.price, c.symbol)}
                  change={c.change}
                  changePercent={c.changePercent}
                />
              ))
            : ["Gold", "Crude Oil", "US Dollar (DXY)"].map((name) => (
                <MetricCard key={name} name={name} value="—" failed />
              ))}
          {btc ? (
            <MetricCard
              name="Bitcoin"
              value={
                "$" +
                btc.price.toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })
              }
              changePercent={btc.change24h}
            />
          ) : (
            <MetricCard name="Bitcoin" value="—" failed />
          )}
        </div>
      </section>

      {/* Trend Chart */}
      <TrendChart data={chartData} />

      {/* Key Macro Indicators */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Key Macro Indicators
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {fredMap["CPIAUCSL"] ? (
            <MetricCard
              name="CPI (YoY)"
              value={fredMap["CPIAUCSL"].value.toFixed(1) + "%"}
            />
          ) : (
            <MetricCard name="CPI (YoY)" value="—" failed />
          )}
          {fredMap["DPCCRV1Q225SBEA"] ? (
            <MetricCard
              name="Core PCE"
              value={fredMap["DPCCRV1Q225SBEA"].value.toFixed(1) + "%"}
            />
          ) : (
            <MetricCard name="Core PCE" value="—" failed />
          )}
          {fredMap["UNRATE"] ? (
            <MetricCard
              name="Unemployment"
              value={fredMap["UNRATE"].value.toFixed(1) + "%"}
            />
          ) : (
            <MetricCard name="Unemployment" value="—" failed />
          )}
          {yieldCurve ? (
            <MetricCard
              name="Yield Curve"
              value={yieldCurve.value.toFixed(2) + "%"}
              unit={
                yieldCurve.value < -0.25
                  ? "INVERTED"
                  : yieldCurve.value <= 0.25
                    ? "FLAT"
                    : "POSITIVE"
              }
            />
          ) : (
            <MetricCard name="Yield Curve" value="—" failed />
          )}
        </div>
      </section>

      {/* Economic Calendar */}
      <EconCalendar />

      {/* Footer */}
      <footer className="border-t border-navy-lighter pt-4 mt-8 text-center">
        <p className="text-xs text-slate-600">
          Data sources: Yahoo Finance, FRED, CoinGecko. For informational
          purposes only — not investment advice.
        </p>
        <p className="text-xs text-slate-700 mt-1">
          Built for Phillip Plant by Kerry AI
        </p>
      </footer>
    </main>
  );
}
