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
        {/* Header + Filters */}
        <div className="mb-6 flex flex-col items-center gap-5">
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

          {/* Quarter tabs */}
          <div className="flex justify-center gap-2">
            {getAllQuarters().map(q => {
              const label = q.split('-')[1];
              return (
                <button
                  key={q}
                  onClick={() => setSelectedQuarter(q)}
                  className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    selectedQuarter === q
                      ? 'bg-gradient-to-r from-red-700 to-red-900 text-white shadow-md shadow-red-900/40'
                      : 'bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Location dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-gray-700 bg-gray-800/60 text-gray-300 hover:text-white hover:border-gray-500 text-sm px-4 py-2 h-9">
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
          <div className="space-y-2 mt-2">
            {(topPoints || topWins) && (
              <div className="flex gap-4 mb-6 flex-wrap">
                {topPoints && (
                  <div className="bg-gradient-to-br from-red-700/20 to-red-900/10 border border-red-700/30 rounded-lg px-5 py-3 flex items-center gap-3">
                    <div className="text-red-400 text-sm font-semibold">Most Points:</div>
                    <div className="text-white font-bold text-base">{topPoints.name}</div>
                    <div className="text-red-300 text-sm">{topPoints.points} pts</div>
                  </div>
                )}
                {topWins && (
                  <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-lg px-5 py-3 flex items-center gap-3">
                    <div className="text-emerald-400 text-sm font-semibold">Most Wins:</div>
                    <div className="text-white font-bold text-base">{topWins.name}</div>
                    <div className="text-emerald-300 text-sm">{topWins.wins} wins</div>
                  </div>
                )}
              </div>
            )}

            {leaderboard.map((entry, index) => (
              <div
                key={entry.id}
                className="glass-link flex items-center justify-between p-5 rounded-lg border border-gray-800 transition-all"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-700 to-red-900 rounded-lg flex items-center justify-center text-white font-bold text-base shrink-0 min-w-10">
                    {index + 1}
                  </div>
                  {entry.image ? (
                    <img src={entry.image} alt={entry.name} className="w-12 h-12 rounded-full object-cover border-2 border-gray-700 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold shrink-0">
                      {entry.name?.[0]}
                    </div>
                  )}
                  <div className="text-white font-semibold text-lg">
                    {entry.name}
                  </div>
                </div>
                <div className="flex items-center gap-8 text-base">
                  <div className="text-right">
                    <div className="text-gray-400 text-sm">Wins</div>
                    <div className="text-emerald-400 font-bold text-xl">{entry.wins}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-400 text-sm">Points</div>
                    <div className="text-red-400 font-bold text-xl">{entry.points}</div>
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