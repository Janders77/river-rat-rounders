import React, { useState, useEffect } from "react";
import { Game } from "@/entities/Game";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trophy, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Checkbox } from "@/components/ui/checkbox";

export default function RecordGame() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameData, setGameData] = useState({
    game_date: new Date().toISOString().split('T')[0],
    game_type: "Texas Hold'em",
    location: "",
    players: [],
    winner_email: "",
    buy_in: "",
    points_awarded: 100,
    duration_minutes: "",
    notes: ""
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const fetchedUsers = await User.list();
    setUsers(fetchedUsers);
  };

  const togglePlayer = (email) => {
    setGameData(prev => ({
      ...prev,
      players: prev.players.includes(email)
        ? prev.players.filter(p => p !== email)
        : [...prev.players, email]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (gameData.players.length < 2) {
      alert("Please select at least 2 players");
      return;
    }
    
    if (!gameData.winner_email) {
      alert("Please select a winner");
      return;
    }

    setIsSubmitting(true);

    try {
      const winner = users.find(u => u.email === gameData.winner_email);
      
      await Game.create({
        ...gameData,
        winner_name: winner?.full_name || winner?.email,
        buy_in: parseFloat(gameData.buy_in) || 0,
        points_awarded: parseInt(gameData.points_awarded),
        duration_minutes: parseInt(gameData.duration_minutes) || null
      });

      // Update winner stats
      const newStreak = (winner.current_streak || 0) + 1;
      await User.update(winner.id, {
        games_played: (winner.games_played || 0) + 1,
        total_points: (winner.total_points || 0) + parseInt(gameData.points_awarded),
        wins: (winner.wins || 0) + 1,
        current_streak: newStreak,
        best_streak: Math.max(winner.best_streak || 0, newStreak)
      });

      // Update other players stats (reset streak)
      for (const playerEmail of gameData.players) {
        if (playerEmail !== gameData.winner_email) {
          const player = users.find(u => u.email === playerEmail);
          if (player) {
            await User.update(player.id, {
              games_played: (player.games_played || 0) + 1,
              current_streak: 0
            });
          }
        }
      }

      navigate(createPageUrl("Leaderboard"));
    } catch (error) {
      console.error("Error recording game:", error);
      alert("Failed to record game. Please try again.");
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#16171B] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <Plus className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Record New Game</h1>
              <p className="text-gray-400">Log a poker session and update rankings</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="bg-[#1A1B20] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Game Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="game_date" className="text-gray-300">Game Date</Label>
                  <Input
                    id="game_date"
                    type="date"
                    value={gameData.game_date}
                    onChange={(e) => setGameData({...gameData, game_date: e.target.value})}
                    className="bg-gray-900 border-gray-700 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="game_type" className="text-gray-300">Game Type</Label>
                  <Select 
                    value={gameData.game_type}
                    onValueChange={(value) => setGameData({...gameData, game_type: value})}
                  >
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="Texas Hold'em">Texas Hold'em</SelectItem>
                      <SelectItem value="Omaha">Omaha</SelectItem>
                      <SelectItem value="Seven Card Stud">Seven Card Stud</SelectItem>
                      <SelectItem value="Tournament">Tournament</SelectItem>
                      <SelectItem value="Cash Game">Cash Game</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="location" className="text-gray-300">Location / Host's Place</Label>
                  <Input
                    id="location"
                    type="text"
                    value={gameData.location}
                    onChange={(e) => setGameData({...gameData, location: e.target.value})}
                    className="bg-gray-900 border-gray-700 text-white"
                    placeholder="e.g. Mike's Garage, The Basement..."
                  />
                </div>


              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Players</Label>
                <div className="grid md:grid-cols-2 gap-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`player-${user.id}`}
                        checked={gameData.players.includes(user.email)}
                        onCheckedChange={() => togglePlayer(user.email)}
                        className="border-gray-600"
                      />
                      <label
                        htmlFor={`player-${user.id}`}
                        className="text-sm text-gray-300 cursor-pointer"
                      >
                        {user.full_name || user.email}
                      </label>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <div className="text-gray-500 col-span-2 text-center py-4">
                      No users found. Invite players first.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="winner" className="text-gray-300">Winner</Label>
                  <Select 
                    value={gameData.winner_email}
                    onValueChange={(value) => setGameData({...gameData, winner_email: value})}
                  >
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue placeholder="Select winner" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {gameData.players.map((email) => {
                        const user = users.find(u => u.email === email);
                        return (
                          <SelectItem key={email} value={email}>
                            {user?.full_name || email}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points" className="text-gray-300">Points Awarded</Label>
                  <Input
                    id="points"
                    type="number"
                    value={gameData.points_awarded}
                    onChange={(e) => setGameData({...gameData, points_awarded: e.target.value})}
                    className="bg-gray-900 border-gray-700 text-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-gray-300">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={gameData.notes}
                  onChange={(e) => setGameData({...gameData, notes: e.target.value})}
                  className="bg-gray-900 border-gray-700 text-white h-24"
                  placeholder="Any memorable moments or notes about the game..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
              onClick={() => navigate(createPageUrl("Leaderboard"))}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4 mr-2" />
                  Record Game
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}