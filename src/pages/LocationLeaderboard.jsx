import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, ChevronLeft, MapPin } from "lucide-react";
import { createPageUrl } from "@/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LocationLeaderboard() {
  const [searchParams] = useSearchParams();
  const location = searchParams.get("location");

  const [players, setPlayers] = useState([]);
  const [playerRecords, setPlayerRecords] = useState([]);
  const [locationStats, setLocationStats] = useState([]);
  const [locationName, setLocationName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuarter, setSelectedQuarter] = useState(getCurrentQuarter());
  const [availableLocations, setAvailableLocations] = useState([]);

  function getCurrentQuarter() {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const year = now.getFullYear();
    return `${year}-Q${quarter}`;
  }

  useEffect(() => {
    loadLocations();
    loadData();
  }, [selectedQuarter, location]);

  const loadLocations = async () => {
    const locations = await base44.entities.Location.list().catch(() => []);
    const locationNames = locations.map(l => l.name);
    setAvailableLocations(locationNames);
  };

  const loadData = async () => {
    setIsLoading(true);
    const [fetchedPlayers, fetchedPlayerRecords, fetchedGames, fetchedLocation] = await Promise.all([
      base44.entities.User.list().catch(() => []),
      base44.entities.Player.list(),
      base44.entities.Game.filter({ location }).catch(() => []),
      location ? base44.entities.Location.filter({ name: location }).catch(() => []) : Promise.resolve([])
    ]);

    if (fetchedLocation.length > 0) {
      setLocationName(fetchedLocation[0].name);
    } else {
      setLocationName(location);
    }

    setPlayerRecords(fetchedPlayerRecords);

    // Calculate location-specific stats for this quarter
    const statsMap = {};
    fetchedGames.forEach(game => {
      const gameDate = new Date(game.game_date);
      const gameQuarter = Math.floor(gameDate.getMonth() / 3) + 1;
      const gameYear = gameDate.getFullYear();
      const gameQuarterStr = `${gameYear}-Q${gameQuarter}`;

      if (gameQuarterStr === selectedQuarter && game.winner_email) {
        if (!statsMap[game.winner_email]) {
          statsMap[game.winner_email] = { email: game.winner_email, points: 0, wins: 0 };
        }
        statsMap[game.winner_email].points += game.points_awarded || 1;
        statsMap[game.winner_email].wins += 1;
      }
    });

    setLocationStats(Object.values(statsMap));

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

  const getLocationStats = (playerEmail) => {
    const stat = locationStats.find(s => s.email === playerEmail);
    return stat || { points: 0, wins: 0 };
  };

  const getSortedPlayers = () => {
    return players
      .map(player => {
        const stats = getLocationStats(player.email);
        return {
          ...player,
          locationPoints: stats.points,
          locationWins: stats.wins
        };
      })
      .filter(p => p.locationPoints > 0 || p.locationWins > 0)
      .sort((a, b) => b.locationPoints - a.locationPoints)
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
          <Link
            to={createPageUrl("Leaderboard")}
            className="flex items-center gap-2 text-amber-400 hover:text-amber-300 mb-6 font-medium transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Overall Leaderboard
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/db52ea530_red2012-2.jpg" alt="River Rat Rounders" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{locationName}</h1>
              <p className="text-gray-400">Location Leaderboard</p>
            </div>
          </div>

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
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array(10).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 bg-gray-800" />
            ))}
          </div>
        ) : getSortedPlayers().length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No wins at this location yet</p>
          </div>
        ) : (
          <div className="space-y-2 mt-6">
            {getSortedPlayers().map((player, index) => (
              <Link
                key={player.id}
                to={`${createPageUrl("PlayerProfile")}?email=${player.email}`}
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
                    <div className="text-emerald-400 font-bold text-lg">{player.locationWins}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-400 text-xs">Points</div>
                    <div className="text-amber-400 font-bold text-lg">{player.locationPoints}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}