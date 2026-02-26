import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Target, Flame, Camera, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlayerProfile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerEmail = searchParams.get("email");
  const [player, setPlayer] = useState(null);
  const [games, setGames] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    if (!playerEmail) {
      navigate(createPageUrl("Leaderboard"));
      return;
    }
    loadData();
  }, [playerEmail]);

  const loadData = async () => {
    setLoading(true);
    const [fetchedPlayers, fetchedGames] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.Game.list("-created_date")
    ]);

    const currentPlayer = fetchedPlayers.find(p => p.email === playerEmail);
    const playerGames = fetchedGames.filter(g => g.players?.includes(playerEmail));
    
    const sortedPlayers = fetchedPlayers.sort((a, b) => 
      (b.total_points || 0) - (a.total_points || 0)
    );

    setPlayer(currentPlayer);
    setGames(playerGames);
    setAllPlayers(sortedPlayers);
    setLoading(false);
  };

  const getPlayerRank = () => {
    if (!player) return null;
    return allPlayers.findIndex(p => p.email === playerEmail) + 1;
  };

  const getWinRate = () => {
    if (games.length === 0) return 0;
    const wins = games.filter(g => g.winner_email === playerEmail).length;
    return Math.round((wins / games.length) * 100);
  };

  const getStats = () => {
    const wins = games.filter(g => g.winner_email === playerEmail).length;
    return {
      gamesPlayed: games.length,
      wins,
      winRate: getWinRate(),
      totalPoints: player?.total_points || 0,
      rank: getPlayerRank(),
      bestStreak: player?.best_streak || 0
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-green-900/30">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-40 mb-8 bg-gray-800" />
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24 bg-gray-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen p-6 bg-green-900/30">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(createPageUrl("Leaderboard"))} className="text-gray-400 mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </Button>
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Player not found</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="min-h-screen p-6 bg-green-900/30">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(createPageUrl("Leaderboard"))} className="text-gray-400 mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leaderboard
        </Button>

        {/* Player Header */}
        <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-8 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{player.full_name || player.email}</h1>
              <p className="text-gray-400 text-lg">{player.email}</p>
            </div>
            {stats.rank && (
              <div className="text-center">
                <div className="text-5xl font-bold text-amber-400">#{stats.rank}</div>
                <div className="text-gray-400 text-sm mt-1">Current Rank</div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Total Points</div>
            <div className="text-3xl font-bold text-amber-400">{stats.totalPoints}</div>
          </div>
          <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Games Played</div>
            <div className="text-3xl font-bold text-white">{stats.gamesPlayed}</div>
          </div>
          <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Wins</div>
            <div className="text-3xl font-bold text-emerald-400">{stats.wins}</div>
          </div>
          <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Win Rate</div>
            <div className="text-3xl font-bold text-blue-400">{stats.winRate}%</div>
          </div>
          <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Best Streak</div>
            <div className="text-3xl font-bold text-orange-400">{stats.bestStreak}</div>
          </div>
          <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Avg Points/Game</div>
            <div className="text-3xl font-bold text-purple-400">
              {stats.gamesPlayed > 0 ? (stats.totalPoints / stats.gamesPlayed).toFixed(1) : 0}
            </div>
          </div>
        </div>

        {/* Game History */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Target className="w-6 h-6 text-amber-400" />
            Game History
          </h2>

          {games.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">No games recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {games.map((game) => (
                <div key={game.id} className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold text-white text-lg">{game.game_type}</div>
                      <div className="text-sm text-gray-400">
                        {new Date(game.game_date).toLocaleDateString()} at {game.location}
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-full font-semibold flex items-center gap-2 ${
                      game.winner_email === playerEmail 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-gray-700/50 text-gray-400'
                    }`}>
                      {game.winner_email === playerEmail && <Flame className="w-4 h-4" />}
                      {game.winner_email === playerEmail ? 'Won' : 'Played'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {game.buy_in && (
                      <div>
                        <span className="text-gray-500">Buy-in: </span>
                        <span className="text-white">${game.buy_in}</span>
                      </div>
                    )}
                    {game.points_awarded && (
                      <div>
                        <span className="text-gray-500">Points: </span>
                        <span className="text-amber-400 font-semibold">{game.points_awarded}</span>
                      </div>
                    )}
                    {game.duration_minutes && (
                      <div>
                        <span className="text-gray-500">Duration: </span>
                        <span className="text-white">{game.duration_minutes}m</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Players: </span>
                      <span className="text-white">{game.players?.length || 0}</span>
                    </div>
                  </div>
                  {game.notes && (
                    <div className="mt-3 text-sm text-gray-400 border-t border-gray-700 pt-3">
                      <span className="text-gray-500">Notes: </span>{game.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}