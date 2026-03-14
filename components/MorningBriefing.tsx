"use client";

import { useState } from "react";
import { MarketData, FredSeries, AlertSignal, EconEvent } from "@/lib/types";

interface MorningBriefingProps {
  equities: MarketData[];
  rates: MarketData[];
  commodities: MarketData[];
  fredData: FredSeries[];
  alerts: AlertSignal[];
  crypto: { price: number; change24h: number } | null;
  econCalendar: EconEvent[];
  dataReady: boolean;
}

export default function MorningBriefing({
  equities,
  rates,
  commodities,
  fredData,
  alerts,
  crypto,
  econCalendar,
  dataReady,
}: MorningBriefingProps) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBriefing = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketData: { equities, rates, commodities },
          fredData,
          alerts,
          crypto,
          econCalendar,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate briefing");
      }

      const data = await res.json();
      setBriefing(data.briefing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Render markdown-ish text with bold headers
  const renderBriefing = (text: string) => {
    return text.split("\n").map((line, i) => {
      // Bold headers like **MARKET PULSE**
      const headerMatch = line.match(/^\*\*(.+?)\*\*$/);
      if (headerMatch) {
        return (
          <h3
            key={i}
            className="text-sm font-semibold text-signal-blue uppercase tracking-wide mt-4 mb-1 first:mt-0"
          >
            {headerMatch[1]}
          </h3>
        );
      }

      // Lines starting with **HEADER** followed by text
      const inlineHeaderMatch = line.match(/^\*\*(.+?)\*\*\s*(.*)$/);
      if (inlineHeaderMatch) {
        return (
          <div key={i} className="mt-4 first:mt-0">
            <h3 className="text-sm font-semibold text-signal-blue uppercase tracking-wide mb-1">
              {inlineHeaderMatch[1]}
            </h3>
            {inlineHeaderMatch[2] && (
              <p className="text-sm text-slate-300 leading-relaxed">
                {inlineHeaderMatch[2]}
              </p>
            )}
          </div>
        );
      }

      // Bullet points
      if (line.startsWith("- ") || line.startsWith("• ")) {
        const content = line.replace(/^[-•]\s*/, "");
        // Handle bold text within bullets
        const parts = content.split(/(\*\*.*?\*\*)/g);
        return (
          <div key={i} className="flex gap-2 text-sm text-slate-300 leading-relaxed ml-1 mb-1">
            <span className="text-signal-blue mt-0.5 shrink-0">&#8250;</span>
            <span>
              {parts.map((part, j) => {
                const boldMatch = part.match(/^\*\*(.+?)\*\*$/);
                if (boldMatch) {
                  return (
                    <span key={j} className="font-semibold text-white">
                      {boldMatch[1]}
                    </span>
                  );
                }
                return <span key={j}>{part}</span>;
              })}
            </span>
          </div>
        );
      }

      // Empty lines
      if (line.trim() === "") return <div key={i} className="h-2" />;

      // Regular text — handle inline bold
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="text-sm text-slate-300 leading-relaxed">
          {parts.map((part, j) => {
            const boldMatch = part.match(/^\*\*(.+?)\*\*$/);
            if (boldMatch) {
              return (
                <span key={j} className="font-semibold text-white">
                  {boldMatch[1]}
                </span>
              );
            }
            return <span key={j}>{part}</span>;
          })}
        </p>
      );
    });
  };

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-br from-navy-light to-navy border border-navy-lighter p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-signal-blue animate-pulse" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              AI Morning Briefing
            </h2>
          </div>
          {!loading && (
            <button
              onClick={generateBriefing}
              disabled={!dataReady}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 border border-navy-lighter hover:border-slate-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {briefing ? "Regenerate" : "Generate Briefing"}
            </button>
          )}
        </div>

        {!briefing && !loading && !error && (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm mb-3">
              Get an AI-generated macro briefing tailored for your morning
              client calls.
            </p>
            <button
              onClick={generateBriefing}
              disabled={!dataReady}
              className="px-5 py-2.5 text-sm font-medium bg-signal-blue/20 text-signal-blue border border-signal-blue/30 hover:bg-signal-blue/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {dataReady
                ? "Generate Morning Briefing"
                : "Waiting for market data..."}
            </button>
          </div>
        )}

        {loading && (
          <div className="py-8 text-center">
            <div className="inline-flex items-center gap-3 text-slate-400 text-sm">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-signal-blue animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-signal-blue animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-signal-blue animate-bounce" />
              </div>
              Analyzing markets and generating your briefing...
            </div>
          </div>
        )}

        {error && (
          <div className="py-4 text-center">
            <p className="text-signal-red text-sm">{error}</p>
            <p className="text-slate-600 text-xs mt-1">
              Make sure ANTHROPIC_API_KEY is set in your environment variables.
            </p>
          </div>
        )}

        {briefing && !loading && (
          <div className="space-y-0">{renderBriefing(briefing)}</div>
        )}
      </div>
    </div>
  );
}
