import React from "react";
import { Card } from "@/components/ui/card";
import { Trophy, TrendingUp, Flame } from "lucide-react";
import { motion } from "framer-motion";

export default function PlayerRankCard({ player, rank, onClick }) {
  const getRankColor = (rank) => {
    if (rank === 1) return "from-amber-500 to-yellow-600";
    if (rank === 2) return "from-gray-400 to-gray-500";
    if (rank === 3) return "from-amber-700 to-amber-800";
    return "from-gray-700 to-gray-800";
  };

  const getRankIcon = (rank) => {
    if (rank <= 3) return <Trophy className="w-5 h-5" />;
    return <span className="font-bold text-lg">#{rank}</span>;
  };

  const winRate = player.games_played > 0 
    ? ((player.wins / player.games_played) * 100).toFixed(1)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05 }}
    >
      <Card 
        className="bg-[#1A1B20] border-gray-800 hover:border-amber-500/50 transition-all duration-300 cursor-pointer overflow-hidden group"
        onClick={onClick}
      >
        <div className="p-5 flex items-center gap-4 relative">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getRankColor(rank)} flex items-center justify-center text-white shadow-lg`}>
            {getRankIcon(rank)}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-white truncate group-hover:text-amber-400 transition-colors">
              {player.full_name || player.email}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {player.total_points || 0} pts
              </span>
              <span>{player.games_played || 0} games</span>
              <span className="text-emerald-400 font-medium">{winRate}% WR</span>
            </div>
          </div>

          {player.current_streak > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 rounded-full border border-orange-500/30">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-orange-400 font-bold text-sm">{player.current_streak}</span>
            </div>
          )}

          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {player.wins || 0}
            </div>
            <div className="text-xs text-gray-500">wins</div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}