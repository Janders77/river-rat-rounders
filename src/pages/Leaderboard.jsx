import React, { useState, useEffect } from "react";
import { externalApi } from "@/functions/externalApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, ChevronDown } from "lucide-react";

const RANK_STYLES = [
  { rowBg: "rgba(234,179,8,0.06)",  rowBorder: "rgba(234,179,8,0.20)",  rankColor: "#fbbf24", rankBg: "rgba(234,179,8,0.12)"  },
  { rowBg: "rgba(148,163,184,0.04)", rowBorder: "rgba(148,163,184,0.14)", rankColor: "#cbd5e1", rankBg: "rgba(148,163,184,0.10)" },
  { rowBg: "rgba(180,100,50,0.05)",  rowBorder: "rgba(194,120,80,0.16)",  rankColor: "#fdba74", rankBg: "rgba(194,120,80,0.10)"  },
];

function formatQuarter(q) {
  if (!q) return "";
  const [year, qPart] = q.split("-");
  return `${qPart} ${year}`;
}

function toTitleCase(name = "") {
  return name.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableQuarters, setAvailableQuarters] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState(null);
  const [currentQuarter, setCurrentQuarter] = useState(null);
  const [showQuarterPicker, setShowQuarterPicker] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    setIsLoading(true);
    const qRes = await externalApi({ action: "getAvailableQuarters" });
    const quarters = qRes?.quarters || [];
    const current = qRes?.current || null;
    setAvailableQuarters(quarters);
    setCurrentQuarter(current);
    setSelectedQuarter(current);
    await loadLeaderboard(current);
  };

  const loadLeaderboard = async (quarter) => {
    setIsLoading(true);
    const raw = await externalApi({ action: "getLeaderboard", params: { quarter } });
    const data = Array.isArray(raw?.leaderboard) ? raw.leaderboard :
                 Array.isArray(raw) ? raw : [];
    setLeaderboard(data.slice().sort((a, b) => a.rank - b.rank));
    setIsLoading(false);
  };

  const handleQuarterChange = (q) => {
    setSelectedQuarter(q);
    setShowQuarterPicker(false);
    loadLeaderboard(q);
  };

  const isCurrentQuarter = selectedQuarter === currentQuarter;

  return (
    <div className="min-h-screen relative" style={{ background: "linear-gradient(135deg, #1a1a22 0%, #22222e 50%, #1a1a22 100%)" }}>
      <div className="absolute inset-x-0 top-0 h-48 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.07), transparent 70%)" }} />

      <div className="relative max-w-md mx-auto w-full px-4 pt-6 pb-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-none">Leaderboard</h1>
            <p className="text-sm text-white/35 mt-1">{selectedQuarter ? formatQuarter(selectedQuarter) : "Season"} · Quarterly Points</p>
          </div>

          {/* Quarter Picker */}
          <div className="relative">
            <button
              onClick={() => setShowQuarterPicker(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-white/60 hover:text-white/90 hover:border-white/20 transition-colors"
            >
              {selectedQuarter ? formatQuarter(selectedQuarter) : "Quarter"}
              <ChevronDown className="w-3 h-3" />
              {isCurrentQuarter && (
                <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              )}
            </button>
            {showQuarterPicker && (
              <div className="absolute right-0 top-full mt-1.5 z-20 min-w-[130px] rounded-xl border border-white/10 overflow-hidden shadow-2xl"
                style={{ background: "#1a1a22" }}>
                {availableQuarters.map(q => (
                  <button
                    key={q}
                    onClick={() => handleQuarterChange(q)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      q === selectedQuarter ? "bg-white/8 text-white font-semibold" : "text-white/50 hover:bg-white/5 hover:text-white/80"
                    }`}
                  >
                    {formatQuarter(q)}
                    {q === currentQuarter && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column labels */}
        {!isLoading && leaderboard.length > 0 && (
          <div className="flex items-center px-3 mb-2">
            <div className="w-7 shrink-0" />
            <div className="w-9 shrink-0" />
            <div className="flex-1" />
            <span className="text-[10px] text-white/20 uppercase tracking-widest w-8 text-center font-medium">W</span>
            <span className="text-[10px] text-white/20 uppercase tracking-widest w-14 text-right font-medium">PTS</span>
          </div>
        )}

        {/* Rows */}
        {isLoading ? (
          <div className="space-y-2">
            {Array(8).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="w-10 h-10 mx-auto mb-3 text-white/10" />
            <p className="text-white/30 text-sm">No results for {selectedQuarter ? formatQuarter(selectedQuarter) : "this quarter"}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {leaderboard.map((entry) => {
              const idx = entry.rank - 1;
              const styles = RANK_STYLES[idx];
              const isTop3 = idx < 3;
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-100"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  {/* Rank */}
                  <div className="w-7 text-center shrink-0">
                    <span className="text-sm font-bold tabular-nums text-white/30">{entry.rank}</span>
                  </div>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>
                    {toTitleCase(entry.name)?.[0]}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold truncate block text-white/80">
                      {toTitleCase(entry.name)}
                    </span>
                  </div>

                  {/* Wins */}
                  <span className="text-sm tabular-nums w-8 text-center font-semibold text-white/30">
                    {entry.wins > 0 ? entry.wins : "—"}
                  </span>

                  {/* Points */}
                  <span className="text-sm font-black tabular-nums w-14 text-right text-white/70">
                    {entry.points}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
