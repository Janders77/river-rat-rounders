import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { getPlayerDisplayName, buildPlayersById } from "@/utils/playerUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, MapPin, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PLACEMENT_POINTS = [1000, 750, 600, 500, 400, 300, 200, 100, 50];

const ALL_LOCATIONS = [
  "Tavern 018 Sunday",
  "Tavern 018 Wednesday",
  "East End Grill",
  "Habana Club",
  "Meddlesome",
];

function getCurrentQuarter() {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
}

function getQuarterDateRange(quarter) {
  const [year, q] = quarter.split('-Q');
  const qNum = parseInt(q);
  const startMonth = (qNum - 1) * 3;
  const endMonth = startMonth + 2;
  const startDate = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`;
  const endDay = new Date(parseInt(year), endMonth + 1, 0).getDate();
  const endDate = `${year}-${String(endMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

function getAllQuarters() {
  const year = new Date().getFullYear();
  return [1, 2, 3, 4].map(q => `${year}-Q${q}`);
}

const MEDAL = {
  0: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", num: "text-yellow-300" },
  1: { bg: "bg-slate-400/10", border: "border-slate-400/25", text: "text-slate-300", num: "text-slate-300" },
  2: { bg: "bg-orange-700/10", border: "border-orange-600/25", text: "text-orange-400", num: "text-orange-300" },
};

export default function Leaderboard() {
  const [allGames, setAllGames] = useState([]);
  const [playerRecords, setPlayerRecords] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMissingPlayers, setIsFetchingMissingPlayers] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState(getCurrentQuarter());

  useEffect(() => { loadData(); }, []);

  const playersById = useMemo(() => buildPlayersById(playerRecords), [playerRecords]);

  const loadData = async () => {
    setIsLoading(true);
    const [fetchedGames, fetchedPlayers] = await Promise.all([
      base44.entities.Game.list('-game_date', 500),
      base44.entities.Player.list('-created_date', 1000),
    ]);
    setAllGames(fetchedGames);
    setPlayerRecords(fetchedPlayers);
    setIsLoading(false);
  };

  useEffect(() => {
    const { startDate, endDate } = getQuarterDateRange(selectedQuarter);
    const filteredForThisEffect = allGames.filter(g => {
      if (!g.game_date) return false;
      if (g.game_date < startDate || g.game_date > endDate) return false;
      if (selectedLocation && g.location !== selectedLocation) return false;
      return true;
    });
    const referencedIds = new Set();
    filteredForThisEffect.forEach(game => {
      (game.player_ids || []).forEach(pid => { if (pid) referencedIds.add(pid); });
    });
    const missingIds = Array.from(referencedIds).filter(id => !playersById[id]);
    if (missingIds.length > 0) {
      setIsFetchingMissingPlayers(true);
      base44.entities.Player.filter({ id: { $in: missingIds } }, null, missingIds.length)
        .then(fetchedMissing => {
          if (fetchedMissing.length > 0) {
            setPlayerRecords(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              return [...prev, ...fetchedMissing.filter(p => !existingIds.has(p.id))];
            });
          }
          setIsFetchingMissingPlayers(false);
        });
    }
  }, [selectedQuarter, selectedLocation, allGames, playersById]);

  const filteredGames = useMemo(() => {
    const { startDate, endDate } = getQuarterDateRange(selectedQuarter);
    return allGames.filter(g => {
      if (!g.game_date) return false;
      if (g.game_date < startDate || g.game_date > endDate) return false;
      if (selectedLocation && g.location !== selectedLocation) return false;
      return true;
    });
  }, [allGames, selectedQuarter, selectedLocation]);

  const compiledStats = useMemo(() => {
    const statsMap = {};
    filteredGames.forEach(game => {
      (game.player_ids || []).forEach((pid, index) => {
        if (!pid) return;
        if (!statsMap[pid]) statsMap[pid] = { points: 0, wins: 0 };
        statsMap[pid].points += PLACEMENT_POINTS[index] || 0;
        if (game.winner_player_id === pid) statsMap[pid].wins += 1;
      });
    });
    return statsMap;
  }, [filteredGames]);

  const leaderboard = useMemo(() => {
    return Object.entries(compiledStats)
      .map(([pid, stats]) => {
        const player = playersById[pid];
        return {
          id: pid,
          name: player ? getPlayerDisplayName(player) : 'Unknown Player',
          image: player?.profile_picture || null,
          ...stats,
        };
      })
      .filter(p => p.points > 0 || p.wins > 0)
      .sort((a, b) => b.points - a.points);
  }, [compiledStats, playersById]);

  const topPoints = leaderboard[0] || null;
  const topWins = [...leaderboard].sort((a, b) => b.wins - a.wins)[0] || null;

  const loading = isLoading || isFetchingMissingPlayers;

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
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6 text-white/80" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight leading-none">Leaderboard</h1>
            <p className="text-sm text-gray-600 mt-0.5 leading-none">Season standings · live results</p>
          </div>
        </div>

        {/* ── CONTROLS BLOCK ── */}
        <div className="flex flex-col items-center gap-3 mb-5"
          style={{ padding: "14px 16px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px" }}>

          {/* Quarter tabs */}
          <div className="inline-flex rounded-lg p-1 gap-1 w-full"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            {getAllQuarters().map(q => {
              const label = q.split('-')[1];
              const active = selectedQuarter === q;
              return (
                <button
                  key={q}
                  onClick={() => setSelectedQuarter(q)}
                  className={`flex-1 py-2 rounded-md text-sm font-bold tracking-wide transition-all duration-150 min-h-[40px] ${
                    active ? "text-white" : "text-gray-600 hover:text-gray-400"
                  }`}
                  style={active ? {
                    background: "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)",
                    boxShadow: "0 1px 6px rgba(185,28,28,0.35)"
                  } : {}}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Location dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-md text-sm font-medium transition-all min-h-[44px]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: selectedLocation ? "#e2e8f0" : "#6b7280"
                }}
              >
                <MapPin className="w-4 h-4 text-red-500/60 shrink-0" />
                <span className="truncate text-base">{selectedLocation || "All Locations"}</span>
                <ChevronDown className="w-4 h-4 opacity-40 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              className="border-gray-800/80"
              style={{ background: "#1a1a24" }}
            >
              <DropdownMenuItem
                onClick={() => setSelectedLocation(null)}
                className={`text-base ${!selectedLocation ? "text-red-400 font-semibold" : "text-gray-300"}`}
              >
                All Locations
              </DropdownMenuItem>
              {ALL_LOCATIONS.map(loc => (
                <DropdownMenuItem
                  key={loc}
                  onClick={() => setSelectedLocation(loc)}
                  className={`text-base ${selectedLocation === loc ? "text-red-400 font-semibold" : "text-gray-300"}`}
                >
                  {loc}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── STAT CHIPS ── */}
        {!loading && (topPoints || topWins) && (
          <div className="flex gap-3 mb-4">
            {topPoints && (
              <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-lg"
                style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.15)" }}>
                <span className="text-xs text-gray-600 uppercase tracking-widest font-bold">PTS</span>
                <span className="text-white text-sm font-semibold truncate mx-2">{topPoints.name.split(' ')[0]}</span>
                <span className="text-base font-black tabular-nums shrink-0" style={{ color: "#f87171" }}>{topPoints.points}</span>
              </div>
            )}
            {topWins && (
              <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-lg"
                style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <span className="text-xs text-gray-600 uppercase tracking-widest font-bold">W</span>
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
            <p className="text-gray-600 text-base">
              {selectedLocation ? `No games at ${selectedLocation} this quarter` : "No games recorded this period"}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {leaderboard.map((entry, index) => {
              const medal = MEDAL[index];
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-100 min-h-[48px]"
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
                    {index + 1}
                  </div>

                  {/* Avatar */}
                  {entry.image ? (
                    <img
                      src={entry.image}
                      alt={entry.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                      style={{ border: medal
                        ? `1.5px solid ${index === 0 ? "rgba(234,179,8,0.35)" : index === 1 ? "rgba(148,163,184,0.25)" : "rgba(194,120,80,0.3)"}`
                        : "1.5px solid rgba(255,255,255,0.06)" }}
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.07)", color: "#6b7280" }}
                    >
                      {entry.name?.[0]}
                    </div>
                  )}

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