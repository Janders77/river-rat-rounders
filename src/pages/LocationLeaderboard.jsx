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
    <div className="min-h-screen relative overflow-x-hidden" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none" style={{background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08), transparent 70%)"}} />
      <div className="relative max-w-md mx-auto w-full px-4 pt-5 pb-10">
        <div className="mb-3">
          <Link
            to={createPageUrl("Leaderboard")}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 mb-4 text-base transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Leaderboard
          </Link>

          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-white/80" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">{locationName || "Location"}</h1>
              <p className="text-base text-white/40 mt-0.5 leading-none">Location leaderboard</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {getAvailableQuarters().map(q => (
                <button
                  key={q}
                  onClick={() => setSelectedQuarter(q)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedQuarter === q
                      ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                      : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
            <Select value={location || ""} onValueChange={(value) => {
              window.location.href = `${createPageUrl("LocationLeaderboard")}?location=${encodeURIComponent(value)}`;
            }}>
              <SelectTrigger className="w-44 h-8 text-base bg-white/5 border-white/10 text-white">
                <MapPin className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent>
                {availableLocations.map(loc => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
           </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array(10).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" style={{background:"rgba(255,255,255,0.04)"}} />
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
                className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all group"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center text-gray-900 font-bold text-base shrink-0 min-w-8">
                    {index + 1}
                  </div>
                  {(() => {
                    const playerRecord = playerRecords.find(r => r.email === player.email);
                    const imageUrl = player.profile_image_url || playerRecord?.profile_picture;
                    return imageUrl ? (
                      <img src={imageUrl} alt={getPlayerName(player)} className="w-9 h-9 rounded-full object-cover border-2 border-gray-700 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-base font-bold shrink-0">
                        {getPlayerName(player)[0]?.toUpperCase() || "?"}
                      </div>
                    );
                  })()}
                  <div className="text-white font-medium group-hover:text-amber-400 transition-colors">
                    {getPlayerName(player)}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-base">
                  <div className="text-right">
                    <div className="text-gray-400 text-base">Wins</div>
                    <div className="text-emerald-400 font-bold text-lg">{player.locationWins}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-400 text-base">Points</div>
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