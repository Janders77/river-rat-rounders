import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
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

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [playerRecords, setPlayerRecords] = useState([]);
  const [quarterlyStats, setQuarterlyStats] = useState([]);
  const [quarterlyRecord, setQuarterlyRecord] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationGames, setLocationGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuarter, setSelectedQuarter] = useState(getCurrentQuarter());

  function getCurrentQuarter() {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const year = now.getFullYear();
    return `${year}-Q${quarter}`;
  }

  useEffect(() => {
    loadData();
  }, [selectedQuarter]);

  useEffect(() => {
    loadLocationData();
  }, [selectedLocation, selectedQuarter]);

  const loadData = async () => {
    setIsLoading(true);
    const [fetchedPlayers, fetchedPlayerRecords, fetchedQuarterlyStats, fetchedQuarterlyRecord, fetchedLocations] = await Promise.all([
      base44.entities.User.list().catch(() => []),
      base44.entities.Player.list(),
      base44.entities.QuarterlyStats.filter({ quarter: selectedQuarter }).catch(() => []),
      base44.entities.QuarterlyRecord.filter({ quarter: selectedQuarter }).catch(() => []),
      base44.entities.Location.list().catch(() => [])
    ]);
    
    setPlayerRecords(fetchedPlayerRecords);
    setQuarterlyStats(fetchedQuarterlyStats);
    setQuarterlyRecord(fetchedQuarterlyRecord[0] || null);
    
    // Sort locations by day of week
    const locationsByDay = fetchedLocations.sort((a, b) => {
      const dayOrder = { "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6 };
      const dayA = Object.keys(dayOrder).find(day => a.game_time?.includes(day)) || 7;
      const dayB = Object.keys(dayOrder).find(day => b.game_time?.includes(day)) || 7;
      return (dayOrder[dayA] || 7) - (dayOrder[dayB] || 7);
    });
    setLocations(locationsByDay);

    const sortedPlayers = fetchedPlayers
      .filter(p => p.full_name && p.full_name.trim())
      .slice(0, 100);
    
    setPlayers(sortedPlayers);
    setIsLoading(false);
  };

  const getPlayerName = (player) => {
    const record = playerRecords.find(r => r.email === player.email);
    if (record) return `${record.first_name || ""} ${record.last_name || ""}`.trim();
    return player.full_name || "";
  };

  const getQuarterlyStats = (playerEmail) => {
    const stat = quarterlyStats.find(s => s.player_email === playerEmail);
    return stat || { points: 0, wins: 0 };
  };

  const getSortedPlayers = () => {
    return players
      .map(player => ({
        ...player,
        quarterlyPoints: getQuarterlyStats(player.email).points,
        quarterlyWins: getQuarterlyStats(player.email).wins
      }))
      .sort((a, b) => b.quarterlyPoints - a.quarterlyPoints)
      .slice(0, 100);
  };

  const getAvailableQuarters = () => {
    const quarters = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    
    for (let q = 1; q <= currentQuarter; q++) {
      quarters.push(`${currentYear}-Q${q}`);
    }
    return quarters;
  };

  return (
    <div className="min-h-screen p-6 bg-green-900/30">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/db52ea530_red2012-2.jpg" alt="River Rat Rounders" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
              <p className="text-gray-400">Top 100 Players - Current Quarter</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2 flex-wrap">
              {getAvailableQuarters().map(q => (
                <button
                  key={q}
                  onClick={() => setSelectedQuarter(q)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedQuarter === q
                      ? 'bg-amber-500 text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 border-gray-800 text-gray-300 hover:text-white">
                  <MapPin className="w-4 h-4" />
                  {selectedLocation || "All Locations"}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
                <DropdownMenuItem
                  onClick={() => setSelectedLocation(null)}
                  className={`text-white ${selectedLocation === null ? "bg-amber-500/20" : ""}`}
                >
                  Overall
                </DropdownMenuItem>
                {locations.map(location => (
                  <DropdownMenuItem
                    key={location.id}
                    onClick={() => setSelectedLocation(location.name)}
                    className={`text-white ${selectedLocation === location.name ? "bg-amber-500/20" : ""}`}
                  >
                    {location.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array(10).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 bg-gray-800" />
            ))}
          </div>
        ) : players.length === 0 ? (
           <div className="text-center py-16 text-gray-500">
             <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
             <p className="text-lg">No players yet</p>
           </div>
         ) : (
           <div className="space-y-2 mt-6">
             {quarterlyRecord && (
               <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-2">
                 <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-lg p-4">
                   <div className="text-amber-400 text-xs font-semibold mb-1">Most Points</div>
                   <div className="text-white font-bold text-lg">{quarterlyRecord.most_points_player_name || "TBD"}</div>
                   <div className="text-amber-300 text-sm">{quarterlyRecord.most_points_total || 0} pts</div>
                 </div>
                 <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-lg p-4">
                   <div className="text-emerald-400 text-xs font-semibold mb-1">Most Wins</div>
                   <div className="text-white font-bold text-lg">{quarterlyRecord.most_wins_player_name || "TBD"}</div>
                   <div className="text-emerald-300 text-sm">{quarterlyRecord.most_wins_total || 0} wins</div>
                 </div>
               </div>
             )}
             {getSortedPlayers().map((player, index) => {
               const playerLink = selectedLocation 
                 ? `${createPageUrl("LocationLeaderboard")}?location=${encodeURIComponent(selectedLocation)}&email=${player.email}`
                 : `${createPageUrl("PlayerProfile")}?email=${player.email}`;
               return (
              <Link
                key={player.id}
                to={playerLink}
                className="glass-link flex items-center justify-between p-4 rounded-lg border border-gray-800 hover:border-amber-500/50 transition-all group"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center text-gray-900 font-bold text-sm shrink-0 min-w-8">
                    {index + 1}
                  </div>
                  {(() => {
                    const playerRecord = playerRecords.find(r => r.email === player.email);
                    const imageUrl = player.profile_image_url || playerRecord?.profile_picture;
                    return imageUrl ? (
                      <img src={imageUrl} alt={getPlayerName(player)} className="w-9 h-9 rounded-full object-cover border-2 border-gray-700 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm font-bold shrink-0">
                        {getPlayerName(player)[0]?.toUpperCase() || "?"}
                      </div>
                    );
                  })()}
                  <div className="text-white font-medium group-hover:text-amber-400 transition-colors">
                    {getPlayerName(player)}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                   <div className="text-right">
                     <div className="text-gray-400 text-xs">Wins</div>
                     <div className="text-emerald-400 font-bold text-lg">{player.quarterlyWins}</div>
                   </div>
                   <div className="text-right">
                     <div className="text-gray-400 text-xs">Points</div>
                     <div className="text-amber-400 font-bold text-lg">{player.quarterlyPoints}</div>
                   </div>
                 </div>
              </Link>
               );
              })}
                 </div>
                 )}
                 </div>
                 </div>
                 );
                 }