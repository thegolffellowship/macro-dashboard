"use client";

import { EconEvent } from "@/lib/types";

const IMPACT_STYLES: Record<string, string> = {
  HIGH: "bg-signal-red/20 text-signal-red",
  MED: "bg-signal-amber/20 text-signal-amber",
  LOW: "bg-signal-green/20 text-signal-green",
};

export const WEEKLY_EVENTS: EconEvent[] = [
  {
    date: "Monday",
    time: "10:00 AM",
    event: "ISM Manufacturing PMI",
    impact: "HIGH",
    forecast: "49.5",
    previous: "49.2",
  },
  {
    date: "Tuesday",
    time: "10:00 AM",
    event: "JOLTS Job Openings",
    impact: "HIGH",
    forecast: "8.75M",
    previous: "8.86M",
  },
  {
    date: "Wednesday",
    time: "8:15 AM",
    event: "ADP Employment Change",
    impact: "MED",
    forecast: "150K",
    previous: "164K",
  },
  {
    date: "Wednesday",
    time: "10:00 AM",
    event: "ISM Services PMI",
    impact: "HIGH",
    forecast: "52.0",
    previous: "52.6",
  },
  {
    date: "Thursday",
    time: "8:30 AM",
    event: "Initial Jobless Claims",
    impact: "MED",
    forecast: "215K",
    previous: "211K",
  },
  {
    date: "Thursday",
    time: "8:30 AM",
    event: "Trade Balance",
    impact: "LOW",
    forecast: "-$68.5B",
    previous: "-$67.4B",
  },
  {
    date: "Friday",
    time: "8:30 AM",
    event: "Non-Farm Payrolls",
    impact: "HIGH",
    forecast: "180K",
    previous: "227K",
  },
  {
    date: "Friday",
    time: "8:30 AM",
    event: "Unemployment Rate",
    impact: "HIGH",
    forecast: "4.2%",
    previous: "4.2%",
  },
  {
    date: "Friday",
    time: "10:00 AM",
    event: "Consumer Sentiment (UMich)",
    impact: "MED",
    forecast: "71.8",
    previous: "71.1",
  },
];

export default function EconCalendar() {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Economic Calendar — This Week
      </h2>
      <div className="bg-navy-light border border-navy-lighter overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-lighter text-slate-500 text-xs uppercase">
              <th className="text-left p-3">Day</th>
              <th className="text-left p-3">Time (ET)</th>
              <th className="text-left p-3">Event</th>
              <th className="text-center p-3">Impact</th>
              <th className="text-right p-3">Forecast</th>
              <th className="text-right p-3">Previous</th>
            </tr>
          </thead>
          <tbody>
            {WEEKLY_EVENTS.map((evt, i) => (
              <tr
                key={i}
                className="border-b border-navy-lighter/50 text-slate-300 hover:bg-navy-lighter/30"
              >
                <td className="p-3 font-medium">{evt.date}</td>
                <td className="p-3 font-mono text-xs text-slate-400">
                  {evt.time}
                </td>
                <td className="p-3">{evt.event}</td>
                <td className="p-3 text-center">
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold ${IMPACT_STYLES[evt.impact]}`}
                  >
                    {evt.impact}
                  </span>
                </td>
                <td className="p-3 text-right font-mono text-xs">
                  {evt.forecast || "—"}
                </td>
                <td className="p-3 text-right font-mono text-xs">
                  {evt.previous || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
