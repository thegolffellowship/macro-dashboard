export interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  history: DataPoint[];
}

export interface DataPoint {
  date: string;
  value: number;
}

export interface FredSeries {
  id: string;
  name: string;
  value: number;
  unit: string;
}

export interface AlertSignal {
  label: string;
  status: "green" | "amber" | "red" | "blue";
  message: string;
}

export interface EconEvent {
  date: string;
  time: string;
  event: string;
  impact: "HIGH" | "MED" | "LOW";
  forecast?: string;
  previous?: string;
}

export interface DashboardData {
  equities: MarketData[];
  rates: MarketData[];
  commodities: MarketData[];
  crypto: { price: number; change24h: number } | null;
  fredData: FredSeries[];
  alerts: AlertSignal[];
  lastUpdated: string;
}
