"use client";

interface MetricCardProps {
  name: string;
  value: string;
  change?: number;
  changePercent?: number;
  unit?: string;
  failed?: boolean;
}

export default function MetricCard({
  name,
  value,
  change,
  changePercent,
  unit,
  failed,
}: MetricCardProps) {
  if (failed) {
    return (
      <div className="bg-navy-light border border-navy-lighter p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
          {name}
        </p>
        <p className="text-lg font-mono text-slate-600">&mdash;</p>
        <p className="text-xs text-slate-600 mt-1">Live data unavailable</p>
      </div>
    );
  }

  const isPositive = (change ?? 0) >= 0;
  const arrow = isPositive ? "\u25B2" : "\u25BC";
  const color = isPositive ? "text-signal-green" : "text-signal-red";

  return (
    <div className="bg-navy-light border border-navy-lighter p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
        {name}
      </p>
      <p className="text-xl font-mono text-white tabular-nums">
        {value}
        {unit && <span className="text-sm text-slate-400 ml-1">{unit}</span>}
      </p>
      {changePercent !== undefined && (
        <p className={`text-xs font-mono mt-1 ${color}`}>
          <span className="mr-1">{arrow}</span>
          {change !== undefined && (
            <span>{change >= 0 ? "+" : ""}{change.toFixed(2)} </span>
          )}
          ({changePercent >= 0 ? "+" : ""}
          {changePercent.toFixed(2)}%)
        </p>
      )}
    </div>
  );
}
