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
    const guardAndLoad = async () => {
      const directorAccess = localStorage.getItem("directorAccess");
      const accessTime = localStorage.getItem("directorAccessTime");
      const FOUR_HOURS = 4 * 60 * 60 * 1000;
      if (!directorAccess || !accessTime || Date.now() - parseInt(accessTime) > FOUR_HOURS) {
        navigate(createPageUrl("Home"));
        return;
      }
      loadUsers();
    };
    guardAndLoad();
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
    <div className="min-h-screen relative overflow-x-hidden" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none" style={{background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08), transparent 70%)"}} />
      <div className="relative max-w-md mx-auto w-full px-4 pt-5 pb-10 flex flex-col gap-3">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5 text-white/80" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">Record New Game</h1>
            <p className="text-base text-white/40 mt-0.5 leading-none">Log a poker session and update rankings</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="w-full rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="game_date" className="text-gray-300">Game Date</Label>
                  <Input
                    id="game_date"
                    type="date"
                    value={gameData.game_date}
                    onChange={(e) => setGameData({...gameData, game_date: e.target.value})}
                    className="bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="game_type" className="text-gray-300">Game Type</Label>
                  <Select 
                    value={gameData.game_type}
                    onValueChange={(value) => setGameData({...gameData, game_type: value})}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a35] border-white/10">
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
                    className="bg-white/5 border-white/10 text-white"
                    placeholder="e.g. Mike's Garage, The Basement..."
                  />
                </div>


              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Placements</Label>
                <p className="text-base text-gray-500">Assign players to their finishing positions. Points: 1st=1000, 2nd=900 … 9th=100</p>
                <div className="space-y-2">
                  {PLACE_LABELS.map((label, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-10 text-base font-bold text-right shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-700' : 'text-gray-500'}`}>
                        {label}
                      </div>
                      <div className="text-base text-gray-600 w-16 shrink-0">{POINTS[i]} pts</div>
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
                        <SelectTrigger className="bg-white/5 border-white/10 text-white flex-1">
                          <SelectValue placeholder={`Select ${label} place`} />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2a2a35] border-white/10">
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
                  className="bg-white/5 border-white/10 text-white h-24"
                  placeholder="Any memorable moments or notes about the game..."
                />
              </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-white/10 text-white/50 hover:bg-white/5 rounded-xl"
              onClick={() => navigate(createPageUrl("Leaderboard"))}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white rounded-xl"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Recording...</>
              ) : (
                <><Trophy className="w-4 h-4 mr-2" />Record Game</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}