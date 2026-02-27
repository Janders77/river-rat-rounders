import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
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
    notes: ""
  });
  // placements[0] = 1st place email, placements[1] = 2nd, etc.
  const [placements, setPlacements] = useState(Array(9).fill(""));

  const isTurbo = gameData.game_type === "Turbo";
  const POINTS = isTurbo ? [500, 250] : [1000, 900, 800, 700, 600, 500, 400, 200, 100];
  const PLACE_LABELS = isTurbo ? ["1st", "2nd"] : ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const fetchedUsers = await User.list();
    setUsers(fetchedUsers);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const filledPlacements = placements.filter(p => p !== "");
    if (filledPlacements.length < 2) {
      alert("Please assign at least 2 places");
      return;
    }
    if (!placements[0]) {
      alert("Please assign 1st place (winner)");
      return;
    }

    setIsSubmitting(true);

    const winner = users.find(u => u.email === placements[0]);

    await Game.create({
      ...gameData,
      players: filledPlacements,
      winner_email: placements[0],
      winner_name: winner?.full_name || winner?.email,
      points_awarded: POINTS[0],
    });

    // Update all placed players
    for (let i = 0; i < filledPlacements.length; i++) {
      const email = filledPlacements[i];
      const player = users.find(u => u.email === email);
      if (!player) continue;
      const pts = POINTS[i] || 0;
      if (i === 0) {
        const newStreak = (player.current_streak || 0) + 1;
        await User.update(player.id, {
          games_played: (player.games_played || 0) + 1,
          total_points: (player.total_points || 0) + pts,
          wins: (player.wins || 0) + 1,
          current_streak: newStreak,
          best_streak: Math.max(player.best_streak || 0, newStreak)
        });
        // Add 1 card guard for 1st place winner
        const playerRecord = await base44.entities.Player.filter({ email: email });
        if (playerRecord.length > 0) {
          await base44.entities.Player.update(playerRecord[0].id, {
            card_guards: (playerRecord[0].card_guards || 0) + 1
          });
        }
      } else {
        await User.update(player.id, {
          games_played: (player.games_played || 0) + 1,
          total_points: (player.total_points || 0) + pts,
          current_streak: 0
        });
      }
    }

    navigate(createPageUrl("Leaderboard"));
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen p-6">
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
                <Label className="text-gray-300">Placements</Label>
                <p className="text-xs text-gray-500">Assign players to their finishing positions. Points: 1st=1000, 2nd=900 … 9th=100</p>
                <div className="space-y-2">
                  {PLACE_LABELS.map((label, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-10 text-sm font-bold text-right shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-700' : 'text-gray-500'}`}>
                        {label}
                      </div>
                      <div className="text-xs text-gray-600 w-16 shrink-0">{POINTS[i]} pts</div>
                      <Select
                        value={placements[i]}
                        onValueChange={(val) => {
                          const updated = [...placements];
                          // Clear duplicate from other slots
                          for (let j = 0; j < updated.length; j++) {
                            if (updated[j] === val) updated[j] = "";
                          }
                          updated[i] = val;
                          setPlacements(updated);
                        }}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-white flex-1">
                          <SelectValue placeholder={`Select ${label} place`} />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                          <SelectItem value={null}>— None —</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.email} value={user.email}>
                              {user.full_name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
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