import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
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
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [fetchedUsers, fetchedPlayers] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.Player.list("player_number", 10000),
    ]);

    // Build a lookup map from email -> player db name
    const playerMap = {};
    fetchedPlayers.forEach(p => {
      if (p.email) {
        playerMap[p.email.toLowerCase()] = `${p.first_name || ""} ${p.last_name || ""}`.trim();
      }
    });

    const sortedPlayers = fetchedUsers
      .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
      .slice(0, 100)
      .map(u => ({
        ...u,
        display_name: playerMap[u.email?.toLowerCase()] || u.full_name || u.email
      }));

    setPlayers(sortedPlayers);
    setIsLoading(false);
  };

  const getAvailableQuarters = () => {
    const quarters = [];
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (i * 3), 1);
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      const year = d.getFullYear();
      if (year !== 2025) {
        quarters.push(`${year}-Q${quarter}`);
      }
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

          <div className="flex gap-2">
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
        ) : players.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No players yet</p>
          </div>
        ) : (
          <div className="space-y-2 mt-6">
            {players.map((player, index) => (
              <Link
                key={player.id}
                to={`${createPageUrl("PlayerProfile")}?email=${player.email}`}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-900/60 border border-gray-800 hover:border-amber-500/50 hover:bg-gray-900 transition-all group"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center text-gray-900 font-bold text-sm shrink-0 min-w-8">
                    {index + 1}
                  </div>
                  {player.profile_image_url ? (
                    <img src={player.profile_image_url} alt={player.display_name} className="w-9 h-9 rounded-full object-cover border-2 border-gray-700 shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm font-bold shrink-0">
                      {(player.display_name || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="text-white font-medium group-hover:text-amber-400 transition-colors">
                    {player.display_name}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <div className="text-gray-400 text-xs">Wins</div>
                    <div className="text-emerald-400 font-bold text-lg">{player.wins || 0}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-400 text-xs">Points</div>
                    <div className="text-amber-400 font-bold text-lg">{player.total_points || 0}</div>
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