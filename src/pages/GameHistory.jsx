import React, { useState, useEffect } from "react";
import { Game } from "@/entities/Game";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Trophy, Clock, DollarSign, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function GameHistory() {
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    setIsLoading(true);
    const fetchedGames = await Game.list("-game_date");
    setGames(fetchedGames);
    setIsLoading(false);
  };

  const filteredGames = filterType === "all" 
    ? games 
    : games.filter(game => game.game_type === filterType);

  return (
    <div className="min-h-screen bg-[#16171B] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <History className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Game History</h1>
              <p className="text-gray-400">Complete archive of all poker sessions</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48 bg-[#1A1B20] border-gray-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1B20] border-gray-800">
                <SelectItem value="all">All Game Types</SelectItem>
                <SelectItem value="Texas Hold'em">Texas Hold'em</SelectItem>
                <SelectItem value="Omaha">Omaha</SelectItem>
                <SelectItem value="Seven Card Stud">Seven Card Stud</SelectItem>
                <SelectItem value="Tournament">Tournament</SelectItem>
                <SelectItem value="Cash Game">Cash Game</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-40 bg-gray-800" />
            ))}
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <History className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No games recorded yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGames.map((game) => (
              <Card key={game.id} className="bg-[#1A1B20] border-gray-800 hover:border-amber-500/50 transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-400 text-sm font-medium">
                          {game.game_type}
                        </div>
                        <span className="text-gray-500 text-sm">
                          {format(new Date(game.game_date), "MMM d, yyyy")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <span className="text-white font-bold text-lg">{game.winner_name}</span>
                        <span className="text-emerald-400 font-bold">+{game.points_awarded} pts</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                        <span>{game.players?.length || 0} players</span>
                        {game.buy_in && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {game.buy_in} buy-in
                          </span>
                        )}
                        {game.duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {game.duration_minutes} min
                          </span>
                        )}
                      </div>

                      {game.notes && (
                        <p className="mt-3 text-gray-400 text-sm italic">{game.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {game.players?.slice(0, 5).map((email, index) => (
                        <div
                          key={index}
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                            email === game.winner_email
                              ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white ring-2 ring-amber-400/50'
                              : 'bg-gray-800 text-gray-400'
                          }`}
                          title={email}
                        >
                          {email[0].toUpperCase()}
                        </div>
                      ))}
                      {game.players?.length > 5 && (
                        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-sm text-gray-400">
                          +{game.players.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}