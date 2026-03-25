import React, { useState, useEffect, useMemo } from "react";
import { externalApi } from "@/functions/externalApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy } from "lucide-react";

const MEDAL = {
  0: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", num: "text-yellow-300" },
  1: { bg: "bg-slate-400/10", border: "border-slate-400/25", text: "text-slate-300", num: "text-slate-300" },
  2: { bg: "bg-orange-700/10", border: "border-orange-600/25", text: "text-orange-400", num: "text-orange-300" },
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    const raw = await externalApi({ action: "getLeaderboard" });
    const data =
      Array.isArray(raw) ? raw :
      Array.isArray(raw?.data) ? raw.data :
      Array.isArray(raw?.leaderboard) ? raw.leaderboard :
      Array.isArray(raw?.items) ? raw.items :
      [];
    const sorted = data.slice().sort((a, b) => a.rank - b.rank);
    setLeaderboard(sorted);
    setIsLoading(false);
  };

  const topPoints = leaderboard[0] || null;
  const topWins = [...leaderboard].sort((a, b) => b.wins - a.wins)[0] || null;

  const loading = isLoading;

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #13131b 0%, #1a1a24 55%, #13131b 100%)" }}
    >
      {/* ── TOP GLOW ── */}
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08), transparent 70%)" }} />

      <div className="relative w-full px-4 pt-6 pb-10">

        {/* ── HEADER ── */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-white/80" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight leading-none">Leaderboard</h1>
            <p className="text-xs text-white/50 mt-1 leading-none">Season standings · live results</p>
          </div>
        </div>



        {/* ── STAT CHIPS ── */}
        {!loading && (topPoints || topWins) && (
          <div className="flex gap-3 mb-4">
            {topPoints && (
              <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/5">
                <span className="text-xs text-white/50 uppercase tracking-widest font-bold">PTS</span>
                <span className="text-white text-sm font-semibold truncate mx-2">{topPoints.name.split(' ')[0]}</span>
                <span className="text-base font-black tabular-nums shrink-0" style={{ color: "#f87171" }}>{topPoints.points}</span>
              </div>
            )}
            {topWins && (
              <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-lg border border-green-500/20 bg-green-500/5">
                <span className="text-xs text-white/50 uppercase tracking-widest font-bold">W</span>
                <span className="text-white text-sm font-semibold truncate mx-2">{topWins.name.split(' ')[0]}</span>
                <span className="text-base font-black tabular-nums shrink-0" style={{ color: "#34d399" }}>{topWins.wins}</span>
              </div>
            )}
          </div>
        )}

        {/* ── COLUMN HEADER ── */}
        {!loading && leaderboard.length > 0 && (

          <div className="flex items-center px-3 mb-2">
            <div className="w-6 shrink-0" />
            <div className="w-8 shrink-0" />
            <div className="flex-1" />
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-xs text-gray-700 uppercase tracking-widest w-6 text-center font-medium">W</span>
              <div className="w-px h-3 bg-gray-800" />
              <span className="text-xs text-gray-700 uppercase tracking-widest w-12 text-right font-medium">PTS</span>
            </div>
          </div>
        )}

        {/* ── ROWS ── */}
        {loading ? (
          <div className="space-y-2 mt-2">
            {Array(10).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-800" />
            <p className="text-gray-600 text-base">No games recorded yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {leaderboard.map((entry) => {
              const index = entry.rank - 1;
              const medal = MEDAL[index];
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-100 min-h-[52px]"
                  style={medal ? {
                    background: "rgba(255,255,255,0.025)",
                    border: `1px solid ${index === 0 ? "rgba(234,179,8,0.16)" : index === 1 ? "rgba(148,163,184,0.12)" : "rgba(194,120,80,0.14)"}`,
                    marginBottom: "2px",
                  } : {
                    background: "rgba(255,255,255,0.015)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  {/* Rank */}
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-black shrink-0 ${
                    medal ? `${medal.bg} border ${medal.border} ${medal.num}` : "text-gray-700"
                  }`}>
                    {entry.rank}
                  </div>

                  {/* Avatar initial */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.07)", color: "#6b7280" }}
                  >
                    {entry.name?.[0]}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <span className={`font-semibold text-base truncate block leading-none ${
                      index < 3 ? "text-white" : "text-gray-400"
                    }`}>
                      {entry.name}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 shrink-0">
                    <span
                      className="font-bold text-sm tabular-nums w-6 text-center"
                      style={{ color: entry.wins > 0 ? "#34d399" : "#1f2937" }}
                    >
                      {entry.wins}
                    </span>
                    <div className="w-px h-4 bg-gray-800/80" />
                    <span
                      className="font-black text-lg tabular-nums w-12 text-right"
                      style={{ color: index === 0 ? "#f87171" : index < 3 ? "#fca5a5" : "#dc2626" }}
                    >
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