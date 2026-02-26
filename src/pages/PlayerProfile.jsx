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
  const [playerRecord, setPlayerRecord] = useState(null);
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
    const [fetchedPlayers, fetchedGames, me] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.Game.list("-created_date"),
      base44.auth.me().catch(() => null)
    ]);
    setCurrentUser(me);

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

  const isOwnProfile = currentUser?.email === playerEmail;

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ profile_image_url: file_url });
    setPlayer(prev => ({ ...prev, profile_image_url: file_url }));
    setUploadingPhoto(false);
  };

  const stats = getStats();

  return (
    <div className="min-h-screen p-6 bg-green-900/30">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(createPageUrl("Leaderboard"))} className="text-gray-400 mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leaderboard
        </Button>

        {/* Player Header */}
        <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 w-full sm:w-auto">
              {/* Profile Photo */}
              <div className="relative shrink-0">
                {player.profile_image_url ? (
                  <img src={player.profile_image_url} alt={player.full_name} className="w-20 h-20 rounded-full object-cover border-4 border-amber-500/50" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-700 border-4 border-amber-500/50 flex items-center justify-center text-3xl font-bold text-gray-400">
                    {(player.full_name || player.email || "?")[0].toUpperCase()}
                  </div>
                )}
                {isOwnProfile && (
                  <>
                    <button
                      onClick={() => fileInputRef.current.click()}
                      className="absolute bottom-0 right-0 w-7 h-7 bg-amber-500 hover:bg-amber-600 rounded-full flex items-center justify-center transition-colors"
                    >
                      {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 text-black animate-spin" /> : <Camera className="w-3.5 h-3.5 text-black" />}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </>
                )}
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-4xl font-bold text-white mb-1 break-words">{player.full_name || player.email}</h1>
                <p className="text-gray-400 text-sm sm:text-lg break-all">{player.email}</p>
              </div>
            </div>
            {stats.rank && (
              <div className="text-center shrink-0">
                <div className="text-4xl sm:text-5xl font-bold text-amber-400">#{stats.rank}</div>
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
                <div key={game.id} className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                 <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                   <div className="min-w-0">
                     <div className="font-semibold text-white text-base">{game.game_type}</div>
                     <div className="text-sm text-gray-400 break-words">
                       {new Date(game.game_date).toLocaleDateString()} · {game.location}
                     </div>
                   </div>
                   <div className={`px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5 text-sm shrink-0 ${
                     game.winner_email === playerEmail 
                       ? 'bg-emerald-500/20 text-emerald-400' 
                       : 'bg-gray-700/50 text-gray-400'
                   }`}>
                     {game.winner_email === playerEmail && <Flame className="w-3.5 h-3.5" />}
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