import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { User } from "@/entities/User";
import { Game } from "@/entities/Game";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy } from "lucide-react";
import { createPageUrl } from "@/utils";
import PlayerRankCard from "../components/leaderboard/PlayerRankCard";
import StatsGrid from "../components/leaderboard/StatsGrid";
import VenueStats from "../components/leaderboard/VenueStats";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuarter, setSelectedQuarter] = useState(getCurrentQuarter());

  useEffect(() => {
    loadData();
  }, []);

  const getCurrentQuarter = () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const year = now.getFullYear();
    return `${year}-Q${quarter}`;
  };

  const getQuarterDates = (quarterStr) => {
    const [year, quarter] = quarterStr.split('-Q');
    const q = parseInt(quarter);
    const startMonth = (q - 1) * 3;
    const start = new Date(parseInt(year), startMonth, 1);
    const end = new Date(parseInt(year), startMonth + 3, 0);
    return { start, end };
  };

  const loadData = async () => {
    setIsLoading(true);
    const fetchedPlayers = await User.list();
    
    const sortedPlayers = fetchedPlayers
      .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
      .slice(0, 100);
    
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
      quarters.push(`${year}-Q${quarter}`);
    }
    return quarters;
  };

  return (
    <div className="min-h-screen p-6 bg-green-900/30">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <Trophy className="w-7 h-7 text-gray-900" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
              <p className="text-gray-400">Community rankings and stats</p>
            </div>
          </div>
        </div>

        {!isLoading && games.some(g => g.location) && (
          <div className="mt-8">
            <VenueStats games={games} />
          </div>
        )}


      </div>

      <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
        <DialogContent className="bg-[#1A1B20] border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-2xl font-bold">
                {selectedPlayer?.full_name || selectedPlayer?.email}
              </DialogTitle>
              <Link 
                to={`${createPageUrl("PlayerProfile")}?email=${selectedPlayer?.email}`}
                className="text-sm px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
              >
                View Full Profile
              </Link>
            </div>
          </DialogHeader>
          
          {selectedPlayer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                  <div className="text-gray-400 text-sm mb-1">Total Points</div>
                  <div className="text-2xl font-bold text-amber-400">{selectedPlayer.total_points || 0}</div>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                  <div className="text-gray-400 text-sm mb-1">Games Played</div>
                  <div className="text-2xl font-bold">{selectedPlayer.games_played || 0}</div>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                  <div className="text-gray-400 text-sm mb-1">Wins</div>
                  <div className="text-2xl font-bold text-emerald-400">{selectedPlayer.wins || 0}</div>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                  <div className="text-gray-400 text-sm mb-1">Best Streak</div>
                  <div className="text-2xl font-bold text-orange-400">{selectedPlayer.best_streak || 0}</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-4">Recent Games</h3>
                <div className="space-y-2">
                  {getPlayerGames(selectedPlayer.email).map((game) => (
                    <div key={game.id} className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{game.game_type}</div>
                          <div className="text-sm text-gray-400">{new Date(game.game_date).toLocaleDateString()}</div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          game.winner_email === selectedPlayer.email 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {game.winner_email === selectedPlayer.email ? 'Won' : 'Played'}
                        </div>
                      </div>
                    </div>
                  ))}
                  {getPlayerGames(selectedPlayer.email).length === 0 && (
                    <div className="text-center py-8 text-gray-500">No games recorded yet</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}