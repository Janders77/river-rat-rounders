import React, { useState, useEffect } from "react";
import { externalApi } from "@/functions/externalApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, ChevronDown } from "lucide-react";

const MEDAL = {
  0: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", num: "text-yellow-300" },
  1: { bg: "bg-slate-400/10", border: "border-slate-400/25", num: "text-slate-300" },
  2: { bg: "bg-orange-700/10", border: "border-orange-600/25", num: "text-orange-300" },
};

function formatQuarter(q) {
  if (!q) return "";
  const [year, qPart] = q.split("-");
  return `${qPart} ${year}`;
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

  const topPoints = leaderboard[0] || null;
  const topWins = [...leaderboard].sort((a, b) => b.wins - a.wins)[0] || null;
  const isCurrentQuarter = selectedQuarter === currentQuarter;

  return (
    <div className="min-h-screen relative overflow-x-hidden"
      style={{ background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)" }}>
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08), transparent 70%)" }} />

      <div className="relative max-w-md mx-auto w-full px-4 pt-5 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-white/80" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">Leaderboard</h1>
              <p className="text-base text-white/40 mt-0.5 leading-none">
                {selectedQuarter ? formatQuarter(selectedQuarter) : "Season standings"} · quarterly points
              </p>
            </div>
          </div>

          {/* Quarter Picker */}
          <div className="relative">
            <button
              onClick={() => setShowQuarterPicker(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-base text-white/60 hover:text-white/90 hover:border-white/20 transition-colors"
            >
              {selectedQuarter ? formatQuarter(selectedQuarter) : "Quarter"}
              <ChevronDown className="w-3 h-3" />
              {isCurrentQuarter && (
                <span className="ml-1 px-1 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-bold uppercase tracking-wide">Live</span>
              )}
            </button>
            {showQuarterPicker && (
              <div className="absolute right-0 top-full mt-1 z-20 min-w-[120px] rounded-xl border border-white/10 bg-[#2a2a35] shadow-xl overflow-hidden">
                {availableQuarters.map(q => (
                  <button
                    key={q}
                    onClick={() => handleQuarterChange(q)}
                    className={`w-full text-left px-4 py-2.5 text-base transition-colors ${
                      q === selectedQuarter
                        ? "bg-red-500/10 text-red-400 font-semibold"
                        : "text-white/60 hover:bg-white/5 hover:text-white/90"
                    }`}
                  >
                    {formatQuarter(q)}
                    {q === currentQuarter && <span className="ml-1 text-red-400">●</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stat chips */}
        {!isLoading && (topPoints || topWins) && (
          <div className="flex gap-3 mb-4">
            {topPoints && (
              <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5">
                <span className="text-base text-white/40 uppercase tracking-widest font-bold">Top Pts</span>
                <span className="text-white text-base font-semibold truncate mx-2">{topPoints.name.split(' ')[0]}</span>
                <span className="text-base font-black tabular-nums shrink-0" style={{ color: "#f87171" }}>{topPoints.points}</span>
              </div>
            )}
            {topWins && (
              <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <span className="text-base text-white/40 uppercase tracking-widest font-bold">Wins ♠</span>
                <span className="text-white text-base font-semibold truncate mx-2">{topWins.name.split(' ')[0]}</span>
                <span className="text-base font-black tabular-nums shrink-0" style={{ color: "#fbbf24" }}>{topWins.wins}</span>
              </div>
            )}
          </div>
        )}

        {/* Column labels */}
        {!isLoading && leaderboard.length > 0 && (
          <div className="flex items-center px-3 mb-1">
            <div className="w-6 shrink-0" />
            <div className="w-8 shrink-0" />
            <div className="flex-1" />
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-base text-white/20 uppercase tracking-widest w-8 text-center font-medium">Wins</span>
              <div className="w-px h-3 bg-white/5" />
              <span className="text-base text-white/20 uppercase tracking-widest w-12 text-right font-medium">Pts</span>
            </div>
          </div>
        )}

        {/* Rows */}
        {isLoading ? (
          <div className="space-y-2 mt-2">
            {Array(10).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-10 h-10 mx-auto mb-3 text-white/10" />
            <p className="text-white/30 text-base">No games recorded for {selectedQuarter ? formatQuarter(selectedQuarter) : "this quarter"}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {leaderboard.map((entry) => {
              const index = entry.rank - 1;
              const medal = MEDAL[index];
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-100 min-h-[52px]"
                  style={medal ? {
                    background: "rgba(255,255,255,0.025)",
                    border: `1px solid ${index === 0 ? "rgba(234,179,8,0.16)" : index === 1 ? "rgba(148,163,184,0.12)" : "rgba(194,120,80,0.14)"}`,
                  } : {
                    background: "rgba(255,255,255,0.015)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-base font-black shrink-0 ${
                    medal ? `${medal.bg} border ${medal.border} ${medal.num}` : "text-white/20"
                  }`}>
                    {entry.rank}
                  </div>

                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.07)", color: "#6b7280" }}>
                    {entry.name?.[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className={`font-semibold text-base truncate block leading-none ${index < 3 ? "text-white" : "text-white/50"}`}>
                      {entry.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-bold text-base tabular-nums w-8 text-center"
                      style={{ color: entry.wins > 0 ? "#fbbf24" : "rgba(255,255,255,0.1)" }}>
                      {entry.wins > 0 ? `${entry.wins}♠` : "—"}
                    </span>
                    <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.06)" }} />
                    <span className="font-black text-base tabular-nums w-12 text-right"
                      style={{ color: index === 0 ? "#f87171" : index < 3 ? "#fca5a5" : "#dc2626" }}>
                      {entry.points}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
