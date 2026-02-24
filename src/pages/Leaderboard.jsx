import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Game } from "@/entities/Game";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy } from "lucide-react";
import PlayerRankCard from "../components/leaderboard/PlayerRankCard";
import StatsGrid from "../components/leaderboard/StatsGrid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [fetchedPlayers, fetchedGames] = await Promise.all([
      User.list(),
      Game.list("-created_date")
    ]);
    
    const sortedPlayers = fetchedPlayers.sort((a, b) => 
      (b.total_points || 0) - (a.total_points || 0)
    );
    
    setPlayers(sortedPlayers);
    setGames(fetchedGames);
    setIsLoading(false);
  };

  const getStats = () => {
    const totalPoints = players.reduce((sum, p) => sum + (p.total_points || 0), 0);
    const longestStreak = Math.max(...players.map(p => p.best_streak || 0), 0);
    
    return {
      totalPlayers: players.length,
      totalGames: games.length,
      totalPoints,
      longestStreak
    };
  };

  const getPlayerGames = (playerEmail) => {
    return games.filter(game => 
      game.players?.includes(playerEmail)
    ).slice(0, 5);
  };

  return (
    <div className="min-h-screen bg-[#16171B] p-6">
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

        {!isLoading && <StatsGrid stats={getStats()} />}

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-6">Top Players</h2>
          
          {isLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-24 bg-gray-800" />
              ))}
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">No players yet. Start recording games!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {players.map((player, index) => (
                <PlayerRankCard
                  key={player.id}
                  player={player}
                  rank={index + 1}
                  onClick={() => setSelectedPlayer(player)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
        <DialogContent className="bg-[#1A1B20] border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {selectedPlayer?.full_name || selectedPlayer?.email}
            </DialogTitle>
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