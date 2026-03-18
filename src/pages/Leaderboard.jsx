import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getPlayerDisplayName, buildPlayersById } from "@/utils/playerUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, MapPin, ChevronDown } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Points by placement index (0=1st, 1=2nd, ...)
const PLACEMENT_POINTS = [1000, 750, 600, 500, 400, 300, 200, 100, 50];

// Canonical location list — always show all venues in the dropdown
// regardless of whether a game has been recorded there yet
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

  // After stats are compiled, fetch any missing player records
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
      const playerIds = game.player_ids || [];
      playerIds.forEach(pid => {
        if (pid) referencedIds.add(pid);
      });
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

  // Filter games by quarter date range and optional location
  const filteredGames = useMemo(() => {
    const { startDate, endDate } = getQuarterDateRange(selectedQuarter);
    return allGames.filter(g => {
      if (!g.game_date) return false;
      if (g.game_date < startDate || g.game_date > endDate) return false;
      if (selectedLocation && g.location !== selectedLocation) return false;
      return true;
    });
  }, [allGames, selectedQuarter, selectedLocation]);

  // Compile points + wins from filtered games
  const compiledStats = useMemo(() => {
    const statsMap = {};
    filteredGames.forEach(game => {
      const playerIds = game.player_ids || [];
      playerIds.forEach((pid, index) => {
        if (!pid) return;
        if (!statsMap[pid]) statsMap[pid] = { points: 0, wins: 0 };
        statsMap[pid].points += PLACEMENT_POINTS[index] || 0;
        // Use winner_player_id to determine wins, not array position
        if (game.winner_player_id === pid) statsMap[pid].wins += 1;
      });
    });
    return statsMap;
  }, [filteredGames]);

  // Build sorted leaderboard rows
  const leaderboard = useMemo(() => {
    return Object.entries(compiledStats)
      .map(([pid, stats]) => {
        const player = playersById[pid];
        return {
          id: pid,
          name: player ? getPlayerDisplayName(player) : 'Unknown Player',
          image: player?.profile_picture || null,
          email: player?.email || null,
          ...stats,
        };
      })
      .filter(p => p.points > 0 || p.wins > 0)
      .sort((a, b) => b.points - a.points);
  }, [compiledStats, playersById]);

  const topPoints = leaderboard[0] || null;
  const topWins = [...leaderboard].sort((a, b) => b.wins - a.wins)[0] || null;

  return (
    <div className="min-h-screen p-6 relative" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
      <div className="absolute inset-0 pointer-events-none" style={{background: "radial-gradient(circle at top, rgba(220,38,38,0.08), transparent 40%)"}} />
      <div className="max-w-7xl mx-auto relative">
        {/* Unified header + filters block */}
        <div className="w-full flex flex-col items-center gap-4 mb-6">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900/60 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white leading-tight">Leaderboard</h1>
              <p className="text-gray-500 text-sm">Live from recorded game results</p>
            </div>
          </div>

          {/* Quarter tabs — segmented control */}
          <div className="w-full flex justify-center">
            <div className="inline-flex bg-gray-900/70 border border-gray-800 rounded-xl p-1 gap-0.5">
              {getAllQuarters().map(q => {
                const label = q.split('-')[1];
                return (
                  <button
                    key={q}
                    onClick={() => setSelectedQuarter(q)}
                    className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-200 min-w-[52px] ${
                      selectedQuarter === q
                        ? 'bg-gradient-to-br from-red-700 to-red-900 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location dropdown */}
          <div className="w-full flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="mx-auto gap-2 border-gray-700 bg-gray-800/60 text-gray-300 hover:text-white hover:border-gray-500 text-sm px-4 py-2 h-9">
                  <MapPin className="w-4 h-4" />
                  {selectedLocation || "All Locations"}
                  <ChevronDown className="w-4 h-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="bg-gray-900 border-gray-800">
                <DropdownMenuItem
                  onClick={() => setSelectedLocation(null)}
                  className={`text-white ${selectedLocation === null ? "bg-red-700/20" : ""}`}
                >
                  All Locations
                </DropdownMenuItem>
                {ALL_LOCATIONS.map(loc => (
                  <DropdownMenuItem
                    key={loc}
                    onClick={() => setSelectedLocation(loc)}
                    className={`text-white ${selectedLocation === loc ? "bg-red-700/20" : ""}`}
                  >
                    {loc}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stat chips — always rendered here, inside the unified block */}
          {!isLoading && !isFetchingMissingPlayers && (topPoints || topWins) && (
            <div className="w-full flex justify-center gap-3 flex-wrap">
              {topPoints && (
                <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/30 rounded-full px-4 py-1.5 text-sm">
                  <span className="text-red-400 font-medium">Most Points</span>
                  <span className="text-white font-bold">{topPoints.name}</span>
                  <span className="text-red-300">{topPoints.points} pts</span>
                </div>
              )}
              {topWins && (
                <div className="flex items-center gap-2 bg-emerald-900/20 border border-emerald-500/30 rounded-full px-4 py-1.5 text-sm">
                  <span className="text-emerald-400 font-medium">Most Wins</span>
                  <span className="text-white font-bold">{topWins.name}</span>
                  <span className="text-emerald-300">{topWins.wins} wins</span>
                </div>
              )}
            </div>
          )}
        </div>

        {isLoading || isFetchingMissingPlayers ? (
          <div className="space-y-3">
            {Array(10).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 bg-gray-800" />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">
              {selectedLocation
                ? `No recorded games for ${selectedLocation} in this quarter`
                : "No games recorded for this period"}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 mt-2">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 ${
                  index === 0 ? 'border-yellow-600/25 bg-yellow-950/20' :
                  index === 1 ? 'border-gray-600/25 bg-gray-800/20' :
                  index === 2 ? 'border-orange-700/25 bg-orange-950/15' :
                  'border-gray-800/50 hover:border-gray-700/60 hover:bg-gray-800/20'
                }`}
              >
                {/* Rank badge */}
                <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                  index === 0 ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-600/30' :
                  index === 1 ? 'bg-gray-600/20 text-gray-300 border border-gray-600/30' :
                  index === 2 ? 'bg-orange-700/15 text-orange-400 border border-orange-700/30' :
                  'bg-gray-800/60 text-gray-500'
                }`}>
                  {index + 1}
                </div>
                {/* Avatar */}
                {entry.image ? (
                  <img src={entry.image} alt={entry.name} className="w-9 h-9 rounded-full object-cover border border-gray-700/60 shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700/40 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                    {entry.name?.[0]}
                  </div>
                )}
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold truncate ${index < 3 ? 'text-white' : 'text-gray-200'}`}>
                    {entry.name}
                  </div>
                </div>
                {/* Stats */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <div className="text-[10px] text-gray-600 uppercase tracking-wider leading-none mb-0.5">W</div>
                    <div className="text-emerald-400 font-bold text-base leading-tight">{entry.wins}</div>
                  </div>
                  <div className="w-px h-5 bg-gray-800" />
                  <div className="text-center min-w-[48px]">
                    <div className="text-[10px] text-gray-600 uppercase tracking-wider leading-none mb-0.5">PTS</div>
                    <div className="text-red-400 font-bold text-base leading-tight">{entry.points}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}