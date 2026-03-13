"use client";

import { AlertSignal } from "@/lib/types";

interface AlertBannerProps {
  alerts: AlertSignal[];
}

const STATUS_STYLES: Record<string, string> = {
  green: "bg-signal-green/10 border-signal-green/30 text-signal-green",
  amber: "bg-signal-amber/10 border-signal-amber/30 text-signal-amber",
  red: "bg-signal-red/10 border-signal-red/30 text-signal-red",
  blue: "bg-signal-blue/10 border-signal-blue/30 text-signal-blue",
};

const STATUS_DOT: Record<string, string> = {
  green: "bg-signal-green",
  amber: "bg-signal-amber",
  red: "bg-signal-red",
  blue: "bg-signal-blue",
};

export default function AlertBanner({ alerts }: AlertBannerProps) {
  if (!alerts.length) return null;

  return (
    <div className="space-y-2 mb-6">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Signal Alerts
      </h2>
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`border px-4 py-2.5 flex items-center gap-3 ${STATUS_STYLES[alert.status]}`}
        >
          <span
            className={`w-2 h-2 flex-shrink-0 ${STATUS_DOT[alert.status]}`}
          />
          <span className="font-semibold text-sm min-w-[100px]">
            {alert.label}
          </span>
          <span className="text-sm opacity-80">{alert.message}</span>
        </div>
      ))}
    </div>
  );
}
