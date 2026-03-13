"use client";

interface HeaderProps {
  lastUpdated: string;
  onRefresh: () => void;
  loading: boolean;
}

export default function Header({ lastUpdated, onRefresh, loading }: HeaderProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="border-b border-navy-lighter pb-4 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Macro Morning Briefing
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {today}
            {lastUpdated && (
              <span className="ml-3 text-slate-500">
                Updated {lastUpdated}
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Built for Phillip Plant by Kerry AI
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-navy-lighter text-slate-300 border border-navy-lighter hover:border-slate-500 transition-colors disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>
    </header>
  );
}
