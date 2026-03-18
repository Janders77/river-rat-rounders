import React, { useState, useEffect, useMemo } from "react";
import { Game } from "@/entities/Game";
import { base44 } from "@/api/base44Client";
import { getPlayerByEmail, getPlayerDisplayName, buildPlayersById } from "@/utils/playerUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Trophy, MapPin, Filter, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const POINTS = [1000, 750, 600, 500, 400, 300, 200, 100, 50];
const PLACE_LABELS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];

export default function GameHistory() {
  const [games, setGames] = useState([]);
  const [playersMap, setPlayersMap] = useState({});
  const [playersFetched, setPlayersFetched] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filterVenue, setFilterVenue] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { loadGames(); }, []);

  const loadGames = async () => {
    setIsLoading(true);
    const fetchedGames = await Game.list("-game_date");
    setGames(fetchedGames);
    setIsLoading(false);

    // Collect all unique player_ids referenced by all games
    const allIds = [...new Set(fetchedGames.flatMap(g => g.player_ids || []))];
    if (allIds.length > 0) {
      const fetched = await base44.entities.Player.filter({ id: { $in: allIds } }, null, allIds.length);
      const map = {};
      fetched.forEach(p => { map[p.id] = p; });
      setPlayersMap(map);
    }
    setPlayersFetched(true);
  };

  const resolveWinner = (game) => {
    if (game.winner_player_id && playersMap[game.winner_player_id])
      return getPlayerDisplayName(playersMap[game.winner_player_id]);
    return game.winner_name || "Unknown";
  };

  const resolveName = (pid) => {
    if (playersMap[pid]) return getPlayerDisplayName(playersMap[pid]);
    if (!playersFetched) return "Loading...";
    return "Unknown Player";
  };

  const filteredGames = filterVenue === "all"
    ? games
    : games.filter(g => g.location === filterVenue);

  return (
    <div className="min-h-screen p-4 md:p-6 relative" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
      <div className="absolute inset-0 pointer-events-none" style={{background: "radial-gradient(circle at top, rgba(220,38,38,0.08), transparent 40%)"}} />
      <div className="max-w-3xl mx-auto relative">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center">
              <History className="w-5 h-5 text-white/80" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Game History</h1>
              <p className="text-gray-500 text-xs">All recorded sessions</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <Select value={filterVenue} onValueChange={setFilterVenue}>
              <SelectTrigger className="w-44 h-8 text-xs bg-gray-900/60 border-gray-800 text-white">
                <SelectValue placeholder="All Venues" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800 text-white">
                <SelectItem value="all" className="text-white text-xs">All Venues</SelectItem>
                {["Tavern 018 Sunday","Tavern 018 Wednesday","East End Grill","Habana Club","Meddlesome"].map(v => (
                  <SelectItem key={v} value={v} className="text-white text-xs">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-2">
            {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-16 bg-gray-800/60 rounded-lg" />)}
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No games recorded yet</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredGames.map((game) => {
              const isExpanded = expandedId === game.id;
              const placementIds = game.player_ids || [];
              const playerCount = placementIds.length || game.players?.length || 0;
              const winner = resolveWinner(game);
              const dateStr = game.game_date
                ? format(new Date(game.game_date + 'T12:00:00'), "MMM d, yyyy")
                : "";

              return (
                <div key={game.id} className="rounded-lg border border-gray-800/80 bg-gray-900/50 overflow-hidden transition-colors hover:border-gray-700">
                  {/* Collapsed Card */}
                  <button
                    className="w-full text-left px-4 py-3"
                    onClick={() => setExpandedId(isExpanded ? null : game.id)}
                  >
                    {/* Row 1: badge + date + venue */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-900/40 text-red-400 border border-red-900/50">
                        {game.game_type || "Game"}
                      </span>
                      <span className="text-gray-500 text-xs">{dateStr}</span>
                      {game.location && (
                        <>
                          <span className="text-gray-700 text-xs">·</span>
                          <span className="text-gray-500 text-xs flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{game.location}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Row 2: winner + points */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="text-white font-semibold text-sm">{winner}</span>
                        <span className="text-emerald-400 text-xs font-bold">+{game.points_awarded} pts</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600 text-xs flex items-center gap-1">
                          <Users className="w-3 h-3" />{playerCount}
                        </span>
                        {isExpanded
                          ? <ChevronUp className="w-3.5 h-3.5 text-gray-600" />
                          : <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
                        }
                      </div>
                    </div>
                  </button>

                  {/* Expanded Placements */}
                  {isExpanded && (
                    <div className="px-4 pb-3 border-t border-gray-800/60 pt-2.5">
                      {placementIds.length > 0 ? (
                        <div className="space-y-1">
                          {placementIds.map((pid, i) => (
                            <div key={pid} className="flex items-center gap-2 text-sm">
                              <span className="text-gray-600 text-xs w-6 text-right shrink-0">{PLACE_LABELS[i] || `${i+1}.`}</span>
                              <span className={`flex-1 ${i === 0 ? 'text-white font-semibold' : 'text-gray-400'}`}>
                                {resolveName(pid)}
                              </span>
                              <span className="text-gray-600 text-xs">{POINTS[i] ? `${POINTS[i]}` : ''}pts</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-600 text-xs">No placement data recorded.</p>
                      )}
                      {game.notes && (
                        <p className="mt-2 text-gray-500 text-xs italic border-t border-gray-800/60 pt-2">{game.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}