import { AlertSignal, MarketData, FredSeries } from "./types";

export function calculateAlerts(
  equities: MarketData[],
  fredData: FredSeries[]
): AlertSignal[] {
  const alerts: AlertSignal[] = [];

  // Yield Curve (T10Y2Y)
  const yieldCurve = fredData.find((f) => f.id === "T10Y2Y");
  if (yieldCurve) {
    if (yieldCurve.value < -0.25) {
      alerts.push({
        label: "Yield Curve",
        status: "red",
        message: `Inverted (${yieldCurve.value.toFixed(2)}%) — recession signal`,
      });
    } else if (yieldCurve.value <= 0.25) {
      alerts.push({
        label: "Yield Curve",
        status: "amber",
        message: `Normalizing (${yieldCurve.value.toFixed(2)}%) — watch closely`,
      });
    } else {
      alerts.push({
        label: "Yield Curve",
        status: "green",
        message: `Positive (${yieldCurve.value.toFixed(2)}%) — healthy spread`,
      });
    }
  }

  // VIX
  const vix = equities.find((e) => e.symbol === "^VIX");
  if (vix && vix.price > 0) {
    if (vix.price > 25) {
      alerts.push({
        label: "VIX",
        status: "red",
        message: `Elevated volatility (${vix.price.toFixed(1)}) — risk-off`,
      });
    } else if (vix.price > 20) {
      alerts.push({
        label: "VIX",
        status: "amber",
        message: `Rising volatility (${vix.price.toFixed(1)}) — caution`,
      });
    } else {
      alerts.push({
        label: "VIX",
        status: "green",
        message: `Low volatility (${vix.price.toFixed(1)}) — risk-on`,
      });
    }
  }

  // S&P 500 momentum
  const sp500 = equities.find((e) => e.symbol === "^GSPC");
  if (sp500 && sp500.price > 0) {
    if (sp500.changePercent < -1.5) {
      alerts.push({
        label: "S&P 500",
        status: "red",
        message: `Sharp decline (${sp500.changePercent.toFixed(2)}%) — sell-off`,
      });
    } else if (sp500.changePercent > 1.5) {
      alerts.push({
        label: "S&P 500",
        status: "green",
        message: `Strong rally (${sp500.changePercent.toFixed(2)}%) — risk-on`,
      });
    } else {
      alerts.push({
        label: "S&P 500",
        status: "blue",
        message: `Neutral (${sp500.changePercent.toFixed(2)}%) — range-bound`,
      });
    }
  }

  // CPI / Inflation
  const cpi = fredData.find((f) => f.id === "CPIAUCSL");
  if (cpi) {
    if (cpi.value > 3.5) {
      alerts.push({
        label: "Inflation",
        status: "amber",
        message: `CPI elevated (${cpi.value.toFixed(1)}) — hawkish pressure`,
      });
    } else if (cpi.value < 2.5) {
      alerts.push({
        label: "Inflation",
        status: "green",
        message: `CPI contained (${cpi.value.toFixed(1)}) — dovish signal`,
      });
    } else {
      alerts.push({
        label: "Inflation",
        status: "blue",
        message: `CPI moderate (${cpi.value.toFixed(1)}) — within range`,
      });
    }
  }

  // Fed Funds vs 10Y
  const fedFunds = fredData.find((f) => f.id === "FEDFUNDS");
  const tenYear = equities.find((e) => e.symbol === "^TNX");
  if (!tenYear) {
    // Check rates separately - ^TNX might be in rates array
  }
  if (fedFunds && tenYear && tenYear.price > 0) {
    if (fedFunds.value > tenYear.price) {
      alerts.push({
        label: "Fed Policy",
        status: "amber",
        message: `Restrictive — Fed Funds (${fedFunds.value.toFixed(2)}%) > 10Y (${tenYear.price.toFixed(2)}%)`,
      });
    } else {
      alerts.push({
        label: "Fed Policy",
        status: "green",
        message: `Accommodative — Fed Funds (${fedFunds.value.toFixed(2)}%) < 10Y (${tenYear.price.toFixed(2)}%)`,
      });
    }
  }

  return alerts;
}
