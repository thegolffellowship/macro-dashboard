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

// ── TGF Tracker Types ──────────────────────────────────────

export interface Golfer {
  id: string;
  name: string;
  venmo?: string; // Venmo username (without @)
  chapter: "san_antonio" | "austin" | "dfw" | "houston";
}

export type PayoutCategory =
  | "team_net"
  | "individual_net"
  | "individual_gross"
  | "skins"
  | "closest_to_pin"
  | "hole_in_one"
  | "other";

export interface Payout {
  golferId: string;
  golferName: string;
  category: PayoutCategory;
  amount: number;
  description?: string;
}

export interface TGFEvent {
  id: string;
  code: string; // e.g. "s9.4"
  name: string; // e.g. "The Quarry"
  date: string; // ISO date string
  chapter: "san_antonio" | "austin" | "dfw" | "houston";
  course: string;
  payouts: Payout[];
}

export interface TGFData {
  golfers: Golfer[];
  events: TGFEvent[];
}
