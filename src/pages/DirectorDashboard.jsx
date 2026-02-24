import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Game } from "@/entities/Game";
import { User } from "@/entities/User";
import { GameSession } from "@/entities/GameSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Plus, Trophy, Loader2, Users, Trash2, CalendarPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const POINTS = [1000, 900, 800, 700, 600, 500, 400, 200, 100];
const PLACE_LABELS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];

export default function DirectorDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");

  const [gameData, setGameData] = useState({
    game_date: new Date().toISOString().split('T')[0],
    game_type: "Texas Hold'em",
    location: "",
    notes: ""
  });
  const [placements, setPlacements] = useState(Array(9).fill(""));
  const [sessions, setSessions] = useState([]);
  const [newSession, setNewSession] = useState({
    session_date: new Date().toISOString().split('T')[0],
    location: "",
    game_type: "Texas Hold'em"
  });
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    const me = await base44.auth.me();
    setCurrentUser(me);
    if (me?.role !== "admin") {
      setIsLoading(false);
      return;
    }
    const [fetchedUsers, fetchedGames, fetchedSessions] = await Promise.all([
      User.list(),
      Game.list("-created_date", 20),
      GameSession.list("-session_date", 20)
    ]);
    setUsers(fetchedUsers);
    setGames(fetchedGames);
    setSessions(fetchedSessions);
    setIsLoading(false);
  };

  const handleRecordGame = async (e) => {
    e.preventDefault();
    const filledPlacements = placements.filter(p => p !== "");
    if (filledPlacements.length < 2 || !placements[0]) {
      alert("Please assign at least 1st and 2nd place");
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
      } else {
        await User.update(player.id, {
          games_played: (player.games_played || 0) + 1,
          total_points: (player.total_points || 0) + pts,
          current_streak: 0
        });
      }
    }

    setPlacements(Array(9).fill(""));
    setGameData({ game_date: new Date().toISOString().split('T')[0], game_type: "Texas Hold'em", location: "", notes: "" });
    setIsSubmitting(false);
    await loadAll();
    alert("Game recorded successfully!");
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteStatus("sending");
    await base44.users.inviteUser(inviteEmail, "user");
    setInviteEmail("");
    setInviteStatus("sent");
    setTimeout(() => setInviteStatus(""), 3000);
  };

  const handleDeleteGame = async (gameId) => {
    if (!confirm("Delete this game? Player stats will NOT be automatically reversed.")) return;
    await Game.delete(gameId);
    setGames(prev => prev.filter(g => g.id !== gameId));
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setIsCreatingSession(true);
    await GameSession.create({ ...newSession, is_open: true, signed_in_players: [] });
    setNewSession({ session_date: new Date().toISOString().split('T')[0], location: "", game_type: "Texas Hold'em" });
    const updated = await GameSession.list("-session_date", 20);
    setSessions(updated);
    setIsCreatingSession(false);
  };

  const handleToggleSession = async (session) => {
    await GameSession.update(session.id, { is_open: !session.is_open });
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, is_open: !s.is_open } : s));
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm("Delete this session?")) return;
    await GameSession.delete(sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-red-400" />
        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
        <p className="text-gray-400">This area is for Tournament Directors only.</p>
        <Button onClick={() => navigate(createPageUrl("Home"))} variant="outline" className="border-gray-700 text-gray-300">
          Go Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
            <ShieldAlert className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Director Dashboard</h1>
            <p className="text-gray-400">Tournament Directors only</p>
          </div>
        </div>

        <Tabs defaultValue="record">
          <TabsList className="bg-gray-800 border-gray-700 mb-6">
            <TabsTrigger value="record" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Plus className="w-4 h-4 mr-2" /> Record Game
            </TabsTrigger>
            <TabsTrigger value="players" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" /> Player Management
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Trophy className="w-4 h-4 mr-2" /> Recent Games
            </TabsTrigger>
          </TabsList>

          {/* Record Game Tab */}
          <TabsContent value="record">
            <form onSubmit={handleRecordGame}>
              <Card className="bg-[#1A1B20] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">New Game</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Game Date</Label>
                      <Input type="date" value={gameData.game_date}
                        onChange={e => setGameData({...gameData, game_date: e.target.value})}
                        className="bg-gray-900 border-gray-700 text-white" required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Game Type</Label>
                      <Select value={gameData.game_type} onValueChange={v => setGameData({...gameData, game_type: v})}>
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                          {["Texas Hold'em","Omaha","Seven Card Stud","Tournament","Cash Game"].map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-gray-300">Location</Label>
                      <Select value={gameData.location} onValueChange={v => setGameData({...gameData, location: v})}>
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-white"><SelectValue placeholder="Select location" /></SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                          <SelectItem value="Tavern 018 Sunday">Tavern 018 Sunday</SelectItem>
                          <SelectItem value="Tavern 018 Wednesday">Tavern 018 Wednesday</SelectItem>
                          <SelectItem value="East End Grill">East End Grill</SelectItem>
                          <SelectItem value="Habana Club">Habana Club</SelectItem>
                          <SelectItem value="Meddlesome">Meddlesome</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Placements</Label>
                    <p className="text-xs text-gray-500">1st=1000pts, 2nd=900pts … 9th=100pts</p>
                    <div className="space-y-2">
                      {PLACE_LABELS.map((label, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`w-10 text-sm font-bold text-right shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-700' : 'text-gray-500'}`}>{label}</div>
                          <div className="text-xs text-gray-600 w-16 shrink-0">{POINTS[i]} pts</div>
                          <Select value={placements[i]} onValueChange={val => {
                            const updated = [...placements];
                            for (let j = 0; j < updated.length; j++) { if (updated[j] === val) updated[j] = ""; }
                            updated[i] = val;
                            setPlacements(updated);
                          }}>
                            <SelectTrigger className="bg-gray-900 border-gray-700 text-white flex-1">
                              <SelectValue placeholder={`Select ${label} place`} />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700">
                              <SelectItem value={null}>— None —</SelectItem>
                              {users.map(u => (
                                <SelectItem key={u.email} value={u.email}>{u.full_name || u.email}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Notes (Optional)</Label>
                    <Textarea value={gameData.notes}
                      onChange={e => setGameData({...gameData, notes: e.target.value})}
                      className="bg-gray-900 border-gray-700 text-white h-20"
                      placeholder="Any notes about the game..." />
                  </div>

                  <Button type="submit" disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white">
                    {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Recording...</> : <><Trophy className="w-4 h-4 mr-2" />Record Game</>}
                  </Button>
                </CardContent>
              </Card>
            </form>
          </TabsContent>

          {/* Player Management Tab */}
          <TabsContent value="players">
            <div className="space-y-6">
              <Card className="bg-[#1A1B20] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Invite Player</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleInvite} className="flex gap-3">
                    <Input
                      type="email"
                      placeholder="player@email.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      className="bg-gray-900 border-gray-700 text-white flex-1"
                      required
                    />
                    <Button type="submit" disabled={inviteStatus === "sending"}
                      className="bg-purple-600 hover:bg-purple-700 text-white">
                      {inviteStatus === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Invite"}
                    </Button>
                  </form>
                  {inviteStatus === "sent" && <p className="text-emerald-400 text-sm mt-2">Invitation sent!</p>}
                </CardContent>
              </Card>

              <Card className="bg-[#1A1B20] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">All Players ({users.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {users.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                        <div>
                          <div className="font-medium text-white">{user.full_name || user.email}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right text-sm">
                            <div className="text-amber-400 font-bold">{user.total_points || 0} pts</div>
                            <div className="text-gray-500">{user.games_played || 0} games</div>
                          </div>
                          <Badge variant="outline" className={user.role === "admin" ? "border-purple-500 text-purple-400" : "border-gray-600 text-gray-400"}>
                            {user.role === "admin" ? "Director" : "Player"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {users.length === 0 && <p className="text-gray-500 text-center py-4">No players yet.</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Recent Games Tab */}
          <TabsContent value="history">
            <Card className="bg-[#1A1B20] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Recent Games</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {games.map(game => (
                    <div key={game.id} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                      <div>
                        <div className="font-medium text-white">{game.game_type}</div>
                        <div className="text-sm text-gray-400">
                          {new Date(game.game_date).toLocaleDateString()} {game.location && `· ${game.location}`}
                        </div>
                        <div className="text-sm text-emerald-400 mt-1">Winner: {game.winner_name || game.winner_email}</div>
                      </div>
                      <Button size="icon" variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        onClick={() => handleDeleteGame(game.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {games.length === 0 && <p className="text-gray-500 text-center py-4">No games recorded yet.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}