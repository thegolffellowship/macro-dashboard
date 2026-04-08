"use client";

import { Fragment, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { TGFEvent, Payout, Golfer, PayoutCategory } from "@/lib/types";

const CHAPTER_LABELS: Record<string, string> = {
  san_antonio: "San Antonio",
  austin: "Austin",
  dfw: "DFW",
  houston: "Houston",
};

const CATEGORY_LABELS: Record<PayoutCategory, string> = {
  team_net: "Team Net",
  individual_net: "Individual Net",
  individual_gross: "Individual Gross",
  skins: "Skins",
  closest_to_pin: "Closest to Pin",
  hole_in_one: "Hole-in-One",
  other: "Other",
};

function venmoPayLink(venmoUsername: string, amount: number, note: string): string {
  return `https://venmo.com/${venmoUsername}?txn=pay&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`;
}

interface GolferPayoutGroup {
  golferName: string;
  golferId?: string;
  totalAmount: number;
  payouts: Payout[];
}

function groupPayoutsByGolfer(payouts: Payout[]): GolferPayoutGroup[] {
  const map = new Map<string, GolferPayoutGroup>();
  for (const p of payouts) {
    const key = p.golferName.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { golferName: p.golferName, golferId: p.golferId, totalAmount: 0, payouts: [] });
    }
    const group = map.get(key)!;
    group.totalAmount += p.amount;
    group.payouts.push(p);
  }
  return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
}

export default function TGFTracker() {
  const [events, setEvents] = useState<TGFEvent[]>([]);
  const [golfers, setGolfers] = useState<Golfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<TGFEvent | null>(null);
  const [selectedGolfer, setSelectedGolfer] = useState<Golfer | null>(null);
  const [tab, setTab] = useState<"events" | "golfers">("events");
  const [eventSubTab, setEventSubTab] = useState<"payouts" | "details">("payouts");
  const [golferSubTab, setGolferSubTab] = useState<"payouts" | "info">("payouts");
  const [expandedGolfer, setExpandedGolfer] = useState<string | null>(null);

  // Screenshot parsing state
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedPayouts, setParsedPayouts] = useState<Payout[] | null>(null);
  const [parsedEventInfo, setParsedEventInfo] = useState<{
    code?: string;
    name?: string;
    date?: string;
    course?: string;
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tgf");
      const data = await res.json();
      setEvents(data.events || []);
      setGolfers(data.golfers || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle paste event for screenshots
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              setPastedImage(ev.target?.result as string);
              setParsedPayouts(null);
              setParsedEventInfo(null);
              setParseError(null);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPastedImage(ev.target?.result as string);
      setParsedPayouts(null);
      setParsedEventInfo(null);
      setParseError(null);
    };
    reader.readAsDataURL(file);
  }

  async function parseScreenshot() {
    if (!pastedImage) return;
    setParsing(true);
    setParseError(null);
    try {
      const res = await fetch("/api/tgf/parse-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: pastedImage, chapter: "san_antonio" }),
      });
      const data = await res.json();
      if (data.error) { setParseError(data.error); return; }
      setParsedPayouts(data.payouts || []);
      setParsedEventInfo(data.event || null);
    } catch {
      setParseError("Failed to parse screenshot");
    } finally {
      setParsing(false);
    }
  }

  async function saveParsedEvent() {
    if (!parsedPayouts || !parsedEventInfo) return;
    const event: TGFEvent = {
      id: `evt_${Date.now()}`,
      code: parsedEventInfo.code || "",
      name: parsedEventInfo.name || "",
      date: parsedEventInfo.date || new Date().toISOString().split("T")[0],
      chapter: "san_antonio",
      course: parsedEventInfo.course || parsedEventInfo.name || "",
      payouts: parsedPayouts,
    };
    const res = await fetch("/api/tgf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_event", event }),
    });
    if (res.ok) {
      setPastedImage(null);
      setParsedPayouts(null);
      setParsedEventInfo(null);
      await loadData();
    }
  }

  // Build golfer lookup for Venmo
  const golferMap: Record<string, Golfer> = {};
  golfers.forEach((g) => { golferMap[g.name.toLowerCase()] = g; });

  function findGolferVenmo(name: string): string | undefined {
    return golferMap[name.toLowerCase()]?.venmo;
  }

  // Sort events newest first
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalPayout = selectedEvent
    ? selectedEvent.payouts.reduce((sum, p) => sum + p.amount, 0)
    : 0;

  // Get all payouts for a specific golfer across all events
  function getGolferPayoutsAcrossEvents(golferName: string) {
    const results: { event: TGFEvent; payouts: Payout[]; eventTotal: number }[] = [];
    for (const evt of sortedEvents) {
      const matching = evt.payouts.filter(
        (p) => p.golferName.toLowerCase() === golferName.toLowerCase()
      );
      if (matching.length > 0) {
        results.push({
          event: evt,
          payouts: matching,
          eventTotal: matching.reduce((s, p) => s + p.amount, 0),
        });
      }
    }
    return results;
  }

  // Golfer stats
  function getGolferAllTimeTotal(golferName: string): number {
    return events.reduce((total, evt) => {
      return total + evt.payouts
        .filter((p) => p.golferName.toLowerCase() === golferName.toLowerCase())
        .reduce((s, p) => s + p.amount, 0);
    }, 0);
  }

  const golferGroups = selectedEvent ? groupPayoutsByGolfer(selectedEvent.payouts) : [];

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <header className="border-b border-navy-lighter pb-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              TGF Tracker
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              The Golf Fellowship &mdash; Event Results &amp; Payouts
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Built for Phillip Plant by Kerry AI
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium bg-navy-lighter text-slate-300 border border-navy-lighter hover:border-slate-500 transition-colors"
          >
            &larr; Dashboard
          </Link>
        </div>
      </header>

      {/* Main Tabs */}
      <div className="flex gap-1 mb-6">
        {(["events", "golfers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedGolfer(null); setSelectedEvent(null); }}
            className={`px-4 py-2 text-sm font-medium uppercase tracking-wider transition-colors ${
              tab === t
                ? "bg-signal-blue text-white"
                : "text-slate-400 hover:text-white bg-navy-light"
            }`}
          >
            {t === "events" ? "Events" : "Golfers"}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-slate-400 text-sm animate-pulse">Loading...</p>
      )}

      {/* ════════════════ EVENTS TAB ════════════════ */}
      {tab === "events" && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event List Sidebar */}
          <div className="lg:col-span-1">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Events
            </h2>
            {sortedEvents.length === 0 ? (
              <p className="text-slate-500 text-sm">
                No events yet. Paste a screenshot to add one.
              </p>
            ) : (
              <div className="space-y-2">
                {sortedEvents.map((evt) => (
                  <button
                    key={evt.id}
                    onClick={() => { setSelectedEvent(evt); setEventSubTab("payouts"); setExpandedGolfer(null); }}
                    className={`w-full text-left p-3 border transition-colors ${
                      selectedEvent?.id === evt.id
                        ? "border-signal-blue bg-navy-light"
                        : "border-navy-lighter bg-navy-light hover:border-slate-500"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs text-signal-blue font-mono">{evt.code}</span>
                        <p className="text-sm font-medium text-white">{evt.name}</p>
                        <p className="text-xs text-slate-500">{CHAPTER_LABELS[evt.chapter] || evt.chapter}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">
                          {new Date(evt.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                        <p className="text-xs text-signal-green font-mono">
                          ${evt.payouts.reduce((s, p) => s + p.amount, 0).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Event Detail / Payouts Panel */}
          <div className="lg:col-span-2">
            {selectedEvent && (
              <>
                {/* Sub-tabs */}
                <div className="flex gap-1 mb-4">
                  {(["payouts", "details"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setEventSubTab(st)}
                      className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                        eventSubTab === st
                          ? "bg-signal-blue text-white"
                          : "text-slate-400 hover:text-white bg-navy-light"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {/* ── PAYOUTS sub-tab (grouped by golfer) ── */}
                {eventSubTab === "payouts" && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-white">
                        {selectedEvent.code} &mdash; {selectedEvent.name}
                      </h2>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Total Purse</p>
                        <p className="text-lg font-bold text-signal-green font-mono">
                          ${totalPayout.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Player Purse Summary - grouped like Golf Genius */}
                    <div className="border border-navy-lighter">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-navy-lighter text-xs text-slate-400 uppercase">
                            <th className="text-left p-3">Player</th>
                            <th className="text-right p-3">Total Purse</th>
                            <th className="text-center p-3 w-24">Pay</th>
                          </tr>
                        </thead>
                        <tbody>
                          {golferGroups.map((group) => {
                            const venmo = findGolferVenmo(group.golferName);
                            const isExpanded = expandedGolfer === group.golferName;
                            const note = `TGF ${selectedEvent.code} ${selectedEvent.name}`;
                            return (
                              <Fragment key={group.golferName}>
                                {/* Player summary row */}
                                <tr
                                  className={`border-t border-navy-lighter cursor-pointer transition-colors ${
                                    isExpanded ? "bg-navy-light" : "hover:bg-navy-light/50"
                                  }`}
                                  onClick={() =>
                                    setExpandedGolfer(isExpanded ? null : group.golferName)
                                  }
                                >
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                                        &#9654;
                                      </span>
                                      <span className="text-signal-blue font-medium hover:underline">
                                        {group.golferName}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-3 text-right text-signal-green font-mono font-bold">
                                    ${group.totalAmount.toFixed(2)}
                                  </td>
                                  <td className="p-3 text-center">
                                    {venmo ? (
                                      <a
                                        href={venmoPayLink(venmo, group.totalAmount, note)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-block px-3 py-1 text-xs font-medium bg-[#008CFF] text-white hover:bg-[#0070CC] transition-colors rounded"
                                      >
                                        Venmo ${group.totalAmount.toFixed(0)}
                                      </a>
                                    ) : (
                                      <span className="text-xs text-slate-600">No Venmo</span>
                                    )}
                                  </td>
                                </tr>
                                {/* Expanded detail rows */}
                                {isExpanded && (
                                  <>
                                    <tr className="bg-navy-light/30">
                                      <td colSpan={3} className="px-3 pt-1 pb-0">
                                        <table className="w-full text-xs ml-6">
                                          <thead>
                                            <tr className="text-slate-500 uppercase">
                                              <th className="text-left py-1 font-medium">Game</th>
                                              <th className="text-right py-1 font-medium">Purse</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {group.payouts.map((p, i) => (
                                              <tr key={i} className="border-t border-navy-lighter/50">
                                                <td className="py-1.5 text-slate-300">
                                                  {p.description || CATEGORY_LABELS[p.category]}
                                                </td>
                                                <td className="py-1.5 text-right text-slate-300 font-mono">
                                                  ${p.amount.toFixed(2)}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  </>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-signal-blue/30 bg-navy-lighter/50">
                            <td className="p-3 text-xs text-slate-400 uppercase font-semibold">
                              Total Purse
                            </td>
                            <td className="p-3 text-right text-signal-green font-mono font-bold text-base">
                              ${totalPayout.toFixed(2)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── DETAILS sub-tab ── */}
                {eventSubTab === "details" && (
                  <div className="bg-navy-light border border-navy-lighter p-4">
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-slate-500 text-xs uppercase">Event Code</dt>
                        <dd className="text-white font-mono">{selectedEvent.code}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 text-xs uppercase">Date</dt>
                        <dd className="text-white">
                          {new Date(selectedEvent.date + "T12:00:00").toLocaleDateString("en-US", {
                            weekday: "long", month: "long", day: "numeric", year: "numeric",
                          })}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 text-xs uppercase">Course</dt>
                        <dd className="text-white">{selectedEvent.course}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 text-xs uppercase">Chapter</dt>
                        <dd className="text-white">{CHAPTER_LABELS[selectedEvent.chapter]}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 text-xs uppercase">Winners</dt>
                        <dd className="text-white">{golferGroups.length}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 text-xs uppercase">Total Purse</dt>
                        <dd className="text-signal-green font-mono font-bold">${totalPayout.toFixed(2)}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </>
            )}

            {!selectedEvent && (
              <div className="text-center py-12 text-slate-500">
                <p className="text-sm mb-2">Select an event or paste a screenshot to get started</p>
              </div>
            )}

            {/* ── Screenshot Parser ── */}
            <div className="mt-8 border border-dashed border-navy-lighter p-6">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Add Event from Screenshot
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Paste a screenshot (Ctrl+V / Cmd+V) or upload an image of Golf Genius results. AI will parse the payouts automatically.
              </p>

              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm bg-navy-lighter text-slate-300 border border-navy-lighter hover:border-slate-500 transition-colors"
                >
                  Upload Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {pastedImage && !parsing && (
                  <button
                    onClick={parseScreenshot}
                    className="px-4 py-2 text-sm bg-signal-blue text-white hover:bg-blue-600 transition-colors font-medium"
                  >
                    Parse with AI
                  </button>
                )}
                {pastedImage && (
                  <button
                    onClick={() => { setPastedImage(null); setParsedPayouts(null); setParsedEventInfo(null); setParseError(null); }}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {pastedImage && (
                <div className="mb-4 border border-navy-lighter p-2 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pastedImage} alt="Pasted screenshot" className="max-h-64 object-contain" />
                </div>
              )}

              {parsing && <p className="text-signal-blue text-sm animate-pulse">Parsing screenshot with AI...</p>}
              {parseError && <p className="text-signal-red text-sm">{parseError}</p>}

              {parsedPayouts && parsedEventInfo && (
                <div className="mt-4">
                  <div className="bg-navy-light border border-navy-lighter p-4 mb-4">
                    <h4 className="text-sm font-semibold text-white mb-2">
                      Parsed Event: <span className="text-signal-blue font-mono">{parsedEventInfo.code}</span> &mdash; {parsedEventInfo.name}
                    </h4>
                    <p className="text-xs text-slate-400">{parsedEventInfo.date} | {parsedEventInfo.course}</p>
                  </div>
                  <table className="w-full text-sm border border-navy-lighter">
                    <thead>
                      <tr className="bg-navy-lighter text-xs text-slate-400 uppercase">
                        <th className="text-left p-2">Player</th>
                        <th className="text-left p-2">Category</th>
                        <th className="text-left p-2">Description</th>
                        <th className="text-right p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedPayouts.map((p, i) => (
                        <tr key={i} className="border-t border-navy-lighter">
                          <td className="p-2 text-white">{p.golferName}</td>
                          <td className="p-2 text-slate-400">{CATEGORY_LABELS[p.category] || p.category}</td>
                          <td className="p-2 text-slate-500 text-xs">{p.description || "\u2014"}</td>
                          <td className="p-2 text-right text-signal-green font-mono">${p.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-navy-lighter">
                        <td colSpan={3} className="p-2 text-xs text-slate-400 uppercase font-semibold">Total</td>
                        <td className="p-2 text-right text-signal-green font-mono font-bold">
                          ${parsedPayouts.reduce((s, p) => s + p.amount, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  <div className="flex gap-3 mt-4">
                    <button onClick={saveParsedEvent} className="px-4 py-2 text-sm bg-signal-green text-white hover:bg-green-600 transition-colors font-medium">
                      Save Event
                    </button>
                    <button onClick={() => { setParsedPayouts(null); setParsedEventInfo(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-red-400 transition-colors">
                      Discard
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ GOLFERS TAB ════════════════ */}
      {tab === "golfers" && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Golfer List Sidebar */}
          <div className="lg:col-span-1">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Golfers ({golfers.length})
            </h2>
            {golfers.length === 0 ? (
              <div className="border border-dashed border-navy-lighter p-4">
                <p className="text-slate-500 text-sm">No golfers yet.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {golfers
                  .sort((a, b) => getGolferAllTimeTotal(b.name) - getGolferAllTimeTotal(a.name))
                  .map((g) => {
                    const allTime = getGolferAllTimeTotal(g.name);
                    return (
                      <button
                        key={g.id}
                        onClick={() => { setSelectedGolfer(g); setGolferSubTab("payouts"); }}
                        className={`w-full text-left p-3 border transition-colors ${
                          selectedGolfer?.id === g.id
                            ? "border-signal-blue bg-navy-light"
                            : "border-navy-lighter bg-navy-light hover:border-slate-500"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-white">{g.name}</p>
                            <p className="text-xs text-slate-500">
                              {CHAPTER_LABELS[g.chapter] || g.chapter}
                              {g.venmo && <span className="ml-2 text-signal-blue">@{g.venmo}</span>}
                            </p>
                          </div>
                          {allTime > 0 && (
                            <span className="text-xs text-signal-green font-mono font-medium">
                              ${allTime.toFixed(0)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Golfer Detail Panel */}
          <div className="lg:col-span-2">
            {selectedGolfer ? (
              <>
                {/* Sub-tabs */}
                <div className="flex gap-1 mb-4">
                  {(["payouts", "info"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setGolferSubTab(st)}
                      className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                        golferSubTab === st
                          ? "bg-signal-blue text-white"
                          : "text-slate-400 hover:text-white bg-navy-light"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {/* Golfer PAYOUTS sub-tab */}
                {golferSubTab === "payouts" && (() => {
                  const golferEvents = getGolferPayoutsAcrossEvents(selectedGolfer.name);
                  const grandTotal = golferEvents.reduce((s, ge) => s + ge.eventTotal, 0);
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white">{selectedGolfer.name}</h2>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">All-Time Winnings</p>
                          <p className="text-lg font-bold text-signal-green font-mono">${grandTotal.toFixed(2)}</p>
                        </div>
                      </div>

                      {golferEvents.length === 0 ? (
                        <p className="text-slate-500 text-sm">No payouts recorded for this golfer.</p>
                      ) : (
                        <div className="space-y-4">
                          {golferEvents.map(({ event: evt, payouts: pouts, eventTotal }) => (
                            <div key={evt.id} className="border border-navy-lighter">
                              <div className="bg-navy-lighter px-4 py-2 flex justify-between items-center">
                                <div>
                                  <span className="text-xs text-signal-blue font-mono mr-2">{evt.code}</span>
                                  <span className="text-sm text-white font-medium">{evt.name}</span>
                                  <span className="text-xs text-slate-500 ml-2">
                                    {new Date(evt.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  </span>
                                </div>
                                <span className="text-signal-green font-mono font-bold">${eventTotal.toFixed(2)}</span>
                              </div>
                              <table className="w-full text-sm">
                                <tbody>
                                  {pouts.map((p, i) => (
                                    <tr key={i} className="border-t border-navy-lighter/50 hover:bg-navy-light/30">
                                      <td className="px-4 py-2 text-slate-300">
                                        {p.description || CATEGORY_LABELS[p.category]}
                                      </td>
                                      <td className="px-4 py-2 text-right text-slate-300 font-mono">
                                        ${p.amount.toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Golfer INFO sub-tab */}
                {golferSubTab === "info" && (
                  <div className="bg-navy-light border border-navy-lighter p-4">
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-slate-500 text-xs uppercase">Name</dt>
                        <dd className="text-white">{selectedGolfer.name}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 text-xs uppercase">Chapter</dt>
                        <dd className="text-white">{CHAPTER_LABELS[selectedGolfer.chapter]}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 text-xs uppercase">Venmo</dt>
                        <dd className="text-white font-mono">
                          {selectedGolfer.venmo ? (
                            <a href={`https://venmo.com/${selectedGolfer.venmo}`} target="_blank" rel="noopener noreferrer" className="text-signal-blue hover:underline">
                              @{selectedGolfer.venmo}
                            </a>
                          ) : (
                            <span className="text-slate-600">Not set</span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 text-xs uppercase">All-Time Winnings</dt>
                        <dd className="text-signal-green font-mono font-bold">
                          ${getGolferAllTimeTotal(selectedGolfer.name).toFixed(2)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 text-xs uppercase">Events Won Money</dt>
                        <dd className="text-white">
                          {getGolferPayoutsAcrossEvents(selectedGolfer.name).length}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <p className="text-sm">Select a golfer to view their payouts</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-navy-lighter pt-4 mt-8 text-center">
        <p className="text-xs text-slate-600">
          TGF Tracker &mdash; The Golf Fellowship event results and payout management
        </p>
        <p className="text-xs text-slate-700 mt-1">
          Built for Phillip Plant by Kerry AI
        </p>
      </footer>
    </main>
  );
}

