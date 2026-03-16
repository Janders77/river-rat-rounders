import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Game } from "@/entities/Game";
import { User } from "@/entities/User";
import { GameSession } from "@/entities/GameSession";
import { WinnerPhoto } from "@/entities/WinnerPhoto";
import { InviteRequest } from "@/entities/InviteRequest";
import { Player } from "@/entities/Player";
import { usePlayerNameCache } from "@/components/home/usePlayerNameCache";
import { hasPermission } from "@/components/directorPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Plus, Trophy, Loader2, Users, Trash2, CalendarPlus, ImagePlus, X, Mail, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const POINTS = [1000, 750, 600, 500, 400, 300, 200, 100, 50];
const PLACE_LABELS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];

export default function DirectorDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [directorRole, setDirectorRole] = useState(null);
  const [users, setUsers] = useState([]);
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");

  const [gameData, setGameData] = useState({
    game_date: new Date().toISOString().split('T')[0],
    game_type: "Main Game",
    location: "",
    notes: ""
  });
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [placements, setPlacements] = useState(Array(9).fill(""));
  const [sessions, setSessions] = useState([]);
  const [newSession, setNewSession] = useState({
    session_date: new Date().toISOString().split('T')[0],
    location: "",
    game_type: "Main Game"
  });
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [inviteRequests, setInviteRequests] = useState([]);
  const [playerSearch, setPlayerSearch] = useState("");
  const [photos, setPhotos] = useState([]);
  const [photoForm, setPhotoForm] = useState({ title: "", winner_name: "", game_date: new Date().toISOString().split('T')[0], location: "" });
  const [photoFile, setPhotoFile] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [dirSignInEmail, setDirSignInEmail] = useState("");
  const [dirSignInPassword, setDirSignInPassword] = useState("");
  const [dirSignInStatus, setDirSignInStatus] = useState(""); // "", "loading", "success", "error"
  const [dirSignInMessage, setDirSignInMessage] = useState("");
  const [showSignInSuggestions, setShowSignInSuggestions] = useState(false);
  const [placementSearches, setPlacementSearches] = useState(Array(9).fill(""));
  const [showPlacementSuggestions, setShowPlacementSuggestions] = useState(Array(9).fill(false));

  useEffect(() => {
    loadAll();
  }, []);

  // Auto-sync gameData with the current open session
  useEffect(() => {
    const openSession = sessions.find(s => s.is_open);
    if (openSession) {
      setGameData(prev => ({
        ...prev,
        location: openSession.location,
        game_type: openSession.game_type || "Main Game",
        game_date: openSession.session_date || prev.game_date
      }));
      setCurrentSessionId(openSession.id);
    }
  }, [sessions]);

  // Real-time subscriptions for game sessions and games
  useEffect(() => {
    const unsubscribeSessions = base44.entities.GameSession.subscribe((event) => {
      if (event.type === 'create') {
        setSessions(prev => [event.data, ...prev]);
      } else if (event.type === 'update') {
        setSessions(prev => prev.map(s => s.id === event.id ? event.data : s));
      } else if (event.type === 'delete') {
        setSessions(prev => prev.filter(s => s.id !== event.id));
      }
    });

    const unsubscribeGames = base44.entities.Game.subscribe((event) => {
      if (event.type === 'create') {
        setGames(prev => [event.data, ...prev]);
      } else if (event.type === 'update') {
        setGames(prev => prev.map(g => g.id === event.id ? event.data : g));
      } else if (event.type === 'delete') {
        setGames(prev => prev.filter(g => g.id !== event.id));
      }
    });

    const unsubscribeInvites = base44.entities.InviteRequest.subscribe((event) => {
      if (event.type === 'create') {
        setInviteRequests(prev => [event.data, ...prev]);
      } else if (event.type === 'update') {
        setInviteRequests(prev => prev.map(r => r.id === event.id ? event.data : r));
      } else if (event.type === 'delete') {
        setInviteRequests(prev => prev.filter(r => r.id !== event.id));
      }
    });

    return () => {
      unsubscribeSessions();
      unsubscribeGames();
      unsubscribeInvites();
    };
  }, []);

  const [players, setPlayers] = useState([]);

  const { getPlayerName: getCachedPlayerName } = usePlayerNameCache(players);

  const getPlayerData = (email) => {
    const player = players.find(p => p.email?.trim().toLowerCase() === email?.trim().toLowerCase());
    if (!player) return null;
    return {
      fullName: `${player.first_name} ${player.last_name}`,
      image: player.profile_picture
    };
  };

  const filteredSignInSuggestions = useMemo(() => {
    const q = dirSignInEmail.trim().toLowerCase();
    if (!q) return [];
    return players
      .filter(p => {
        const fullName = `${p.first_name || ""} ${p.last_name || ""}`.trim().toLowerCase();
        const email = (p.email || "").trim().toLowerCase();
        return fullName.includes(q) || email.includes(q);
      })
      .slice(0, 8);
  }, [dirSignInEmail, players]);

  const getPlacementSuggestions = (index) => {
    const q = placementSearches[index]?.trim().toLowerCase();
    const session = sessions.find(s => s.id === currentSessionId);
    const signedInEmails = session?.signed_in_players || [];
    const alreadyPlaced = new Set(placements.filter((p, i) => p && i !== index));
    return players
      .filter(p => {
        if (!signedInEmails.includes(p.email)) return false;
        if (alreadyPlaced.has(p.email)) return false;
        if (!q) return true;
        const fullName = `${p.first_name || ""} ${p.last_name || ""}`.trim().toLowerCase();
        return fullName.startsWith(q) || fullName.includes(q);
      })
      .sort((a, b) => {
        if (!q) return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        const aName = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
        const bName = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase();
        return (aName.startsWith(q) ? 0 : 1) - (bName.startsWith(q) ? 0 : 1);
      })
      .slice(0, 8);
  };

  const getPlayerName = (email) => {
    const cached = getCachedPlayerName(email);
    if (cached && cached !== email) return cached;
    // Fallback: look up directly in players array
    const p = players.find(pl => pl.email?.trim().toLowerCase() === email?.trim().toLowerCase());
    if (p) return `${p.first_name || ""} ${p.last_name || ""}`.trim() || email;
    return email || "Unknown Player";
  };

  const fetchAllPlayers = async () => {
    return await base44.entities.Player.filter({}, "-player_number", 500, 0);
  };

  const loadAll = async () => {
   setIsLoading(true);

   // Check director access and 4-hour expiry
   const accessTime = localStorage.getItem("directorAccessTime");
   const FOUR_HOURS = 4 * 60 * 60 * 1000;
   if (!localStorage.getItem("directorAccess") || !accessTime || Date.now() - parseInt(accessTime) > FOUR_HOURS) {
     localStorage.removeItem("directorAccess");
     localStorage.removeItem("directorAccessTime");
     navigate(createPageUrl("DirectorSignIn"));
     return;
   }

   const me = await base44.auth.me();
   setCurrentUser(me);

   // Check director by auth email OR playerEmail stored in localStorage
   const playerEmail = localStorage.getItem("playerEmail");
   const emailsToCheck = [...new Set([me.email, playerEmail].filter(Boolean))];
   
   let directorRecord = null;
   for (const email of emailsToCheck) {
     const check = await base44.entities.Director.filter({ email });
     if (check.length > 0) { directorRecord = check[0]; break; }
   }
   
   if (!directorRecord) {
     setIsLoading(false);
     return;
   }

   setDirectorRole(directorRecord.role);
   const [fetchedUsers, fetchedGames, fetchedSessions, fetchedPhotos, fetchedRequests, fetchedPlayers] = await Promise.all([
     User.list(),
     Game.list("-created_date", 20),
     GameSession.list("-session_date", 20),
     WinnerPhoto.list("-created_date", 50),
     InviteRequest.filter({ status: "pending" }, "-created_date", 50),
     fetchAllPlayers()
   ]);
   setUsers(fetchedUsers);
   setGames(fetchedGames);
   setSessions(fetchedSessions);
   setPhotos(fetchedPhotos);
   setInviteRequests(fetchedRequests);
   setPlayers(fetchedPlayers);

   // Subscribe to user updates for real-time player data
   base44.entities.User.subscribe((event) => {
     if (event.type === 'update') {
       setUsers(prev => prev.map(u => u.id === event.id ? event.data : u));
     } else if (event.type === 'create') {
       setUsers(prev => [event.data, ...prev]);
     }
   });

   setIsLoading(false);
  };

  const getPlayerFullName = (email) => {
    const p = players.find(pl => pl.email?.trim().toLowerCase() === email?.trim().toLowerCase());
    if (p) return `${p.first_name || ""} ${p.last_name || ""}`.trim();
    return null;
  };

  const handleRecordGame = async (e) => {
    e.preventDefault();
    const filledPlacements = placements.filter(p => p !== "");
    if (filledPlacements.length < 2 || !placements[0]) {
      alert("Please assign at least 1st and 2nd place");
      return;
    }
    setIsSubmitting(true);
    const winnerName = getPlayerFullName(placements[0]) || placements[0];

    await Game.create({
      ...gameData,
      players: filledPlacements,
      winner_email: placements[0],
      winner_name: winnerName,
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

    // Close the current session and clear signed-in players
    if (currentSessionId) {
      await GameSession.update(currentSessionId, { is_open: false, signed_in_players: [] });
    }

    setPlacements(Array(9).fill(""));
    setGameData({ game_date: new Date().toISOString().split('T')[0], game_type: "Main Game", location: "", notes: "" });
    setCurrentSessionId(null);
    setIsSubmitting(false);
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

  const handleApproveRequest = async (req) => {
    await base44.users.inviteUser(req.email, "user");
    await InviteRequest.update(req.id, { status: "approved" });
    setInviteRequests(prev => prev.filter(r => r.id !== req.id));
  };

  const handleDeclineRequest = async (req) => {
    await InviteRequest.update(req.id, { status: "declined" });
    setInviteRequests(prev => prev.filter(r => r.id !== req.id));
  };

  const handleDeleteGame = (gameId) => {
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

  const handleDeleteSession = (sessionId) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  const handleUploadPhoto = async (e) => {
    e.preventDefault();
    if (!photoFile) return;
    setIsUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: photoFile });
    await WinnerPhoto.create({ ...photoForm, photo_url: file_url });
    setPhotoForm({ title: "", winner_name: "", game_date: new Date().toISOString().split('T')[0], location: "" });
    setPhotoFile(null);
    const updated = await WinnerPhoto.list("-created_date", 50);
    setPhotos(updated);
    setIsUploadingPhoto(false);
  };

  const handleDirectorSignInPlayer = async (e) => {
    e.preventDefault();
    setDirSignInStatus("loading");
    setDirSignInMessage("");

    const DIRECTOR_PASSWORD = "Poker123";
    if (dirSignInPassword !== DIRECTOR_PASSWORD) {
      setDirSignInStatus("error");
      setDirSignInMessage("Incorrect password.");
      return;
    }

    const normalizedEmail = dirSignInEmail.trim().toLowerCase();
    const playerResults = await base44.entities.Player.filter({ email: normalizedEmail });
    const player = playerResults[0] || players.find(p => p.email?.trim().toLowerCase() === normalizedEmail);
    if (!player) {
      setDirSignInStatus("error");
      setDirSignInMessage("No player found with that email.");
      return;
    }

    const openSession = sessions.find(s => s.is_open);
    if (!openSession) {
      setDirSignInStatus("error");
      setDirSignInMessage("No open game session. Open a game first.");
      return;
    }

    const alreadySignedIn = (openSession.signed_in_players || []).includes(player.email);
    if (alreadySignedIn) {
      setDirSignInStatus("error");
      setDirSignInMessage(`${player.first_name} ${player.last_name} is already signed in.`);
      return;
    }

    const updatedPlayers = [...(openSession.signed_in_players || []), player.email];
    await base44.entities.GameSession.update(openSession.id, { signed_in_players: updatedPlayers });
    setSessions(prev => prev.map(s => s.id === openSession.id ? { ...s, signed_in_players: updatedPlayers } : s));

    setDirSignInStatus("success");
    setDirSignInMessage(`${player.first_name} ${player.last_name} signed in successfully!`);
    setDirSignInEmail("");
    setDirSignInPassword("");
    setTimeout(() => { setDirSignInStatus(""); setDirSignInMessage(""); }, 3000);
  };

  const handleDeletePhoto = async (photoId) => {
    if (!confirm("Delete this photo?")) return;
    await WinnerPhoto.delete(photoId);
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-400" />
      </div>
    );
  }

  // User must be a designated director to access this page
  if (!currentUser || !directorRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-red-400" />
        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
        <p className="text-gray-400">You are not authorized to access the Director Dashboard.</p>
        <Button onClick={() => navigate(createPageUrl("Home"))} variant="outline" className="border-gray-700 text-gray-300">
          Go Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-6 overflow-x-hidden" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
            <ShieldAlert className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Director Dashboard</h1>
            <p className="text-gray-400">Tournament Directors only</p>
          </div>
        </div>

        <Tabs defaultValue={hasPermission(directorRole, "canManageSessions") ? "sessions" : "record"}>
          <TabsList className="bg-gray-800 border-gray-700 mb-6 grid grid-cols-3 gap-1 w-full h-auto p-1">
            {hasPermission(directorRole, "canManageSessions") && (
              <TabsTrigger value="sessions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-700 data-[state=active]:to-red-900 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-red-900/50">
                <CalendarPlus className="w-4 h-4 mr-2" /> Sessions
              </TabsTrigger>
            )}
            {hasPermission(directorRole, "canRecordGames") && (
              <TabsTrigger value="record" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-700 data-[state=active]:to-red-900 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-red-900/50">
                <Plus className="w-4 h-4 mr-2" /> Record Game
              </TabsTrigger>
            )}
            {hasPermission(directorRole, "canApproveRequests") && (
              <TabsTrigger value="requests" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-700 data-[state=active]:to-red-900 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-red-900/50 relative">
                <Mail className="w-4 h-4 mr-2" /> Requests
                {inviteRequests.length > 0 && (
                  <span className="ml-1 bg-red-400 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">{inviteRequests.length}</span>
                )}
              </TabsTrigger>
            )}
            {hasPermission(directorRole, "canManagePlayers") && (
              <TabsTrigger value="players" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-700 data-[state=active]:to-red-900 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-red-900/50">
                <Users className="w-4 h-4 mr-2" /> Players
              </TabsTrigger>
            )}
            <TabsTrigger value="history" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-700 data-[state=active]:to-red-900 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-red-900/50">
              <Trophy className="w-4 h-4 mr-2" /> Games
            </TabsTrigger>
            {hasPermission(directorRole, "canUploadPhotos") && (
              <TabsTrigger value="photos" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-700 data-[state=active]:to-red-900 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-red-900/50">
                <ImagePlus className="w-4 h-4 mr-2" /> Photos
              </TabsTrigger>
            )}
          </TabsList>

          {/* Sessions Tab */}
          {hasPermission(directorRole, "canManageSessions") && (
          <TabsContent value="sessions">
            <div className="space-y-6">
              <Card className="bg-transparent border border-red-500/40">
                 <CardHeader>
                   <CardTitle className="text-red-400">Open Games</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sessions.filter(session => session.is_open).map(session => (
                      <div key={session.id} className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white">{session.location}</div>
                            <div className="text-sm text-gray-400">
                              {session.session_date ? new Date(session.session_date + 'T12:00:00').toLocaleDateString() : ''} · {session.game_type}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {session.signed_in_players?.length || 0} player(s) signed in
                            </div>
                            {session.signed_in_players?.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {session.signed_in_players.map((email, idx) => (
                                  <div key={email} className="flex items-center gap-2 text-xs text-gray-300">
                                    <span className="text-gray-600 w-4 text-right shrink-0">{idx + 1}.</span>
                                    <span>{getPlayerName(email)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="mt-3 space-y-2">
                              <label className="text-xs text-red-400 font-semibold">🃏 Hand of the Week</label>
                              <Select
                                value="__none__"
                                onValueChange={async (val) => {
                                   if (val === "__none__") return;
                                  const currentList = session.hand_of_week_emails || [];
                                  if (currentList.includes(val)) return;
                                  const player = users.find(u => u.email === val);

                                  // Award 50 pts
                                  if (player) {
                                    await base44.entities.User.update(player.id, {
                                      total_points: (player.total_points || 0) + 50
                                    });
                                    setUsers(prev => prev.map(u => u.id === player.id ? { ...u, total_points: (u.total_points || 0) + 50 } : u));
                                  }

                                  const newEmails = [...currentList, val];
                                  const playerRecord = players.find(pl => pl.email?.trim().toLowerCase() === val?.trim().toLowerCase());
                                  const resolvedName = playerRecord ? `${playerRecord.first_name || ""} ${playerRecord.last_name || ""}`.trim() : (player?.full_name || val);
                                  const newNames = [...(session.hand_of_week_names || []), resolvedName];
                                  await GameSession.update(session.id, {
                                    hand_of_week_emails: newEmails,
                                    hand_of_week_names: newNames
                                  });
                                  setSessions(prev => prev.map(s => s.id === session.id ? { ...s, hand_of_week_emails: newEmails, hand_of_week_names: newNames } : s));
                                }}
                              >
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-sm h-8">
                                  <SelectValue placeholder="Add player..." />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-700">
                                  <SelectItem value="__none__" disabled className="text-gray-500">Add player...</SelectItem>
                                  {players
                                    .filter(p => p.email && (session.signed_in_players || []).includes(p.email) && !(session.hand_of_week_emails || []).includes(p.email))
                                    .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`))
                                    .map(p => (
                                      <SelectItem key={p.email} value={p.email} className="text-white">{p.first_name} {p.last_name}</SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              {(session.hand_of_week_names || []).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(session.hand_of_week_emails || []).map((email, idx) => (
                                    <span key={email} className="flex items-center gap-1 bg-red-900/40 border border-red-700 text-red-300 text-xs rounded-full px-2 py-0.5">
                                      {session.hand_of_week_names?.[idx] || email}
                                      <button onClick={async () => {
                                        const player = users.find(u => u.email === email);
                                        if (player) {
                                          await base44.entities.User.update(player.id, {
                                            total_points: Math.max(0, (player.total_points || 0) - 50)
                                          });
                                          setUsers(prev => prev.map(u => u.id === player.id ? { ...u, total_points: Math.max(0, (u.total_points || 0) - 50) } : u));
                                        }
                                        const newEmails = (session.hand_of_week_emails || []).filter(e => e !== email);
                                        const newNames = (session.hand_of_week_names || []).filter((_, i) => i !== idx);
                                        await GameSession.update(session.id, { hand_of_week_emails: newEmails, hand_of_week_names: newNames });
                                        setSessions(prev => prev.map(s => s.id === session.id ? { ...s, hand_of_week_emails: newEmails, hand_of_week_names: newNames } : s));
                                      }} className="ml-1 hover:text-white">×</button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button size="sm" variant="outline"
                              className={session.is_open ? "border-red-600 text-red-400 hover:bg-red-900/20" : "border-gray-700 text-gray-500 hover:bg-gray-800"}
                              onClick={() => handleToggleSession(session)}>
                              {session.is_open ? "Close" : "Reopen"}
                            </Button>
                            <Button size="icon" variant="ghost"
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              onClick={() => handleDeleteSession(session.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {sessions.filter(session => session.is_open).length === 0 && <p className="text-gray-500 text-center py-4">No open games.</p>}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-transparent border border-red-500/40">
                 <CardHeader>
                   <CardTitle className="text-red-400">Open a New Game</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateSession} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2 min-w-0 overflow-hidden">
                        <label className="text-gray-300 text-sm">Date</label>
                        <input type="date" value={newSession.session_date}
                          onChange={e => setNewSession({...newSession, session_date: e.target.value})}
                          className="w-full max-w-full h-10 bg-gray-900 border border-gray-700 text-white rounded-md px-3 py-2 text-sm [color-scheme:dark] box-border"
                          required />
                      </div>
                      <div className="space-y-2">
                       <label className="text-gray-300 text-sm">Game Type</label>
                       <Select value={newSession.game_type || "__none__"} onValueChange={v => setNewSession({...newSession, game_type: v === "__none__" ? "" : v})}>
                         <SelectTrigger className="bg-gray-900 border-gray-700 text-white"><SelectValue placeholder="Select game type" /></SelectTrigger>
                         <SelectContent className="bg-gray-900 border-gray-700 text-white">
                           <SelectItem value="__none__" disabled className="text-gray-400">Select game type</SelectItem>
                             {["Main Game","Turbo"].map(t => (
                               <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
                             ))}
                           </SelectContent>
                       </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                       <label className="text-gray-300 text-sm">Location</label>
                       <Select value={newSession.location || "__none__"} onValueChange={v => setNewSession({...newSession, location: v === "__none__" ? "" : v})}>
                         <SelectTrigger className="bg-gray-900 border-gray-700 text-white"><SelectValue placeholder="Select location" /></SelectTrigger>
                         <SelectContent className="bg-gray-900 border-gray-700 text-white">
                           <SelectItem value="__none__" disabled className="text-gray-400">Select location</SelectItem>
                           {["Tavern 018 Sunday","Tavern 018 Wednesday","East End Grill","Habana Club","Meddlesome"].map(loc => (
                             <SelectItem key={loc} value={loc} className="text-white">{loc}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                      </div>
                    </div>
                    <Button type="submit" disabled={isCreatingSession || !newSession.location}
                      className="w-full bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white shadow-lg shadow-red-900/40 transition-all duration-200">
                      {isCreatingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : "Open Game"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-transparent border border-red-500/40">
                <CardHeader>
                  <CardTitle className="text-red-400">Sign In Player</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleDirectorSignInPlayer} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-gray-300 text-sm">Player Name or Email</label>
                      <div className="relative">
                        <Input
                          placeholder="Search by name or email..."
                          value={dirSignInEmail}
                          onChange={e => { setDirSignInEmail(e.target.value); setShowSignInSuggestions(true); }}
                          onFocus={() => setShowSignInSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSignInSuggestions(false), 150)}
                          className="bg-gray-900 border-gray-700 text-white"
                          required
                        />
                        {showSignInSuggestions && filteredSignInSuggestions.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg overflow-hidden">
                            {filteredSignInSuggestions.map(p => (
                              <button
                                key={p.email}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-gray-800 transition-colors"
                                onMouseDown={() => {
                                  setDirSignInEmail(p.email);
                                  setShowSignInSuggestions(false);
                                }}
                              >
                                <div className="text-white text-sm font-medium">{p.first_name} {p.last_name}</div>
                                <div className="text-gray-400 text-xs">{p.email}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-gray-300 text-sm">Password</label>
                      <Input
                        type="password"
                        placeholder="Enter password"
                        value={dirSignInPassword}
                        onChange={e => setDirSignInPassword(e.target.value)}
                        className="bg-gray-900 border-gray-700 text-white"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={dirSignInStatus === "loading"}
                      className="w-full bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white shadow-lg shadow-red-900/40 transition-all duration-200">
                      {dirSignInStatus === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In Player"}
                    </Button>
                    {dirSignInMessage && (
                      <p className={`text-sm text-center ${dirSignInStatus === "success" ? "text-green-400" : "text-red-400"}`}>
                        {dirSignInMessage}
                      </p>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>
            </TabsContent>
            )}

            {hasPermission(directorRole, "canRecordGames") && (
            <TabsContent value="record">
              {!sessions.find(s => s.is_open) ? (
                <Card className="bg-transparent border border-red-500/40">
                  <CardContent className="py-10 text-center text-gray-500">
                    No open game session. Open a game in the Sessions tab first.
                  </CardContent>
                </Card>
              ) : (
              <form onSubmit={handleRecordGame}>
                <Card className="bg-transparent border border-red-500/40">
                <CardHeader>
                  <CardTitle className="text-white">
                    Record Game — <span className="text-red-400">{sessions.find(s => s.is_open)?.location}</span>
                  </CardTitle>
                  <p className="text-sm text-gray-400 mt-1">
                    {sessions.find(s => s.is_open)?.session_date ? new Date(sessions.find(s => s.is_open).session_date + 'T12:00:00').toLocaleDateString() : ''} · {sessions.find(s => s.is_open)?.game_type} · {sessions.find(s => s.is_open)?.signed_in_players?.length || 0} players signed in
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Game Date</Label>
                    <input type="date" value={gameData.game_date}
                      onChange={e => setGameData({...gameData, game_date: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded-md px-3 py-2 text-sm [color-scheme:dark]" required />
                  </div>

                  <div className="space-y-2">
                  <Label className="text-gray-300">Placements</Label>
                  <p className="text-xs text-gray-500">1st=1000pts, 2nd=900pts … 9th=100pts</p>
                  <div className="space-y-2">
                    {PLACE_LABELS.map((label, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-10 text-sm font-bold text-right shrink-0 text-gray-400">{label}</div>
                        <div className="text-sm text-gray-600 w-16 shrink-0">{POINTS[i]} pts</div>
                        <div className="relative flex-1">
                          <Input
                            placeholder={`Search ${label} place...`}
                            value={placements[i] ? getPlayerName(placements[i]) : placementSearches[i]}
                            onChange={e => {
                              if (placements[i]) {
                                const updatedP = [...placements]; updatedP[i] = ""; setPlacements(updatedP);
                              }
                              const updatedS = [...placementSearches]; updatedS[i] = e.target.value; setPlacementSearches(updatedS);
                              const updatedShow = [...showPlacementSuggestions]; updatedShow[i] = true; setShowPlacementSuggestions(updatedShow);
                            }}
                            onFocus={() => { const u = [...showPlacementSuggestions]; u[i] = true; setShowPlacementSuggestions(u); }}
                            onBlur={() => setTimeout(() => { const u = [...showPlacementSuggestions]; u[i] = false; setShowPlacementSuggestions(u); }, 150)}
                            className="bg-gray-900 border-gray-700 text-white w-full"
                          />
                          {placements[i] && (
                            <button type="button" onClick={() => { const u = [...placements]; u[i] = ""; setPlacements(u); const s = [...placementSearches]; s[i] = ""; setPlacementSearches(s); }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {showPlacementSuggestions[i] && !placements[i] && getPlacementSuggestions(i).length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg overflow-hidden">
                              {getPlacementSuggestions(i).map(p => (
                                <button key={p.email} type="button"
                                  className="w-full text-left px-3 py-2 hover:bg-gray-800 transition-colors"
                                  onMouseDown={() => {
                                    const updatedP = [...placements];
                                    for (let j = 0; j < updatedP.length; j++) { if (updatedP[j] === p.email) updatedP[j] = ""; }
                                    updatedP[i] = p.email; setPlacements(updatedP);
                                    const updatedS = [...placementSearches]; updatedS[i] = ""; setPlacementSearches(updatedS);
                                    const updatedShow = [...showPlacementSuggestions]; updatedShow[i] = false; setShowPlacementSuggestions(updatedShow);
                                  }}
                                >
                                  <span className="text-white text-sm">{p.first_name} {p.last_name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
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
                    className="w-full bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white shadow-lg shadow-red-900/40 transition-all duration-200">
                    {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Recording...</> : <><Trophy className="w-4 h-4 mr-2" />Record Game</>}
                  </Button>
                </CardContent>
                </Card>
              </form>
              )}
            </TabsContent>
            )}

          {hasPermission(directorRole, "canApproveRequests") && (
            <TabsContent value="requests">
            <Card className="bg-transparent border border-red-500/40">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-red-400" />
                  Pending Invite Requests
                  {inviteRequests.length > 0 && (
                    <span className="ml-1 bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5">{inviteRequests.length}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inviteRequests.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No pending invite requests.</p>
                ) : (
                  <div className="space-y-3">
                    {inviteRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between p-4 bg-red-900/20 rounded-lg border border-red-700/40">
                       <div>
                         <div className="font-medium text-white">{req.first_name} {req.last_name}</div>
                         <div className="text-sm text-gray-400">{req.email}</div>
                       </div>
                       <div className="flex gap-2">
                         <Button size="sm" onClick={() => handleApproveRequest(req)}
                           className="bg-gradient-to-r from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 text-white">
                           Approve & Invite
                         </Button>
                         <Button size="sm" variant="outline" onClick={() => handleDeclineRequest(req)}
                           className="border-red-700 text-red-400 hover:bg-red-900/20">
                           Decline
                         </Button>
                       </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </TabsContent>
          )}

          {hasPermission(directorRole, "canManagePlayers") && (
            <TabsContent value="players">
            <div className="space-y-6">
              {inviteRequests.length > 0 && (
                <Card className="bg-transparent border border-red-500/40">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      Pending Invite Requests ({inviteRequests.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {inviteRequests.map(req => (
                        <div key={req.id} className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-700/40">
                           <div>
                             <div className="font-medium text-white">{req.first_name} {req.last_name}</div>
                             <div className="text-sm text-gray-400">{req.email}</div>
                           </div>
                           <div className="flex gap-2">
                             <Button size="sm" onClick={() => handleApproveRequest(req)}
                               className="bg-gradient-to-r from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 text-white">
                               Approve & Invite
                             </Button>
                             <Button size="sm" variant="outline" onClick={() => handleDeclineRequest(req)}
                               className="border-red-700 text-red-400 hover:bg-red-900/20">
                               Decline
                             </Button>
                           </div>
                         </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-transparent border border-red-500/40">
                <CardHeader>
                  <CardTitle className="text-white">
                    {(() => {
                      const openSession = sessions.find(s => s.is_open);
                      const signedInEmails = openSession?.signed_in_players || [];
                      return `Players Signed In to Current Game (${signedInEmails.length})`;
                    })()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const openSession = sessions.find(s => s.is_open);
                    const signedInEmails = openSession?.signed_in_players || [];
                    if (!openSession) {
                      return <p className="text-gray-500 text-center py-4">No open game session. Open a game in the Sessions tab first.</p>;
                    }
                    if (signedInEmails.length === 0) {
                      return <p className="text-gray-500 text-center py-4">No players have signed in yet.</p>;
                    }
                    const signedInPlayers = players.filter(p => signedInEmails.includes(p.email));
                    const filteredPlayers = signedInPlayers.filter(p =>
                      !playerSearch ||
                      `${p.first_name} ${p.last_name}`.toLowerCase().includes(playerSearch.toLowerCase()) ||
                      p.email.toLowerCase().includes(playerSearch.toLowerCase())
                    );
                    return (
                      <>
                        <div className="relative mb-4">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            placeholder="Search by name or email..."
                            value={playerSearch}
                            onChange={e => setPlayerSearch(e.target.value)}
                            className="bg-gray-900 border-gray-700 text-white pl-9"
                          />
                        </div>
                        <div className="space-y-3">
                          {filteredPlayers.map(player => (
                            <div key={player.email} className="flex items-center justify-between gap-2 p-3 bg-gray-900/50 rounded-lg border border-gray-800 min-w-0 overflow-hidden">
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="font-medium text-white truncate">{player.first_name} {player.last_name}</div>
                                <div className="text-xs text-gray-400 truncate">{player.email}</div>
                              </div>
                              <Badge variant="outline" className="shrink-0 text-xs border-green-600 text-green-400">Signed In</Badge>
                            </div>
                          ))}
                          {filteredPlayers.length === 0 && playerSearch && <p className="text-gray-500 text-center py-4">No players match your search.</p>}
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card className="bg-transparent border border-red-500/40">
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
                      className="bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white shadow-lg shadow-red-900/40 transition-all duration-200">
                      {inviteStatus === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Invite"}
                    </Button>
                  </form>
                  {inviteStatus === "sent" && <p className="text-red-400 text-sm mt-2">Invitation sent!</p>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          )}

          {/* Recent Games Tab */}
          <TabsContent value="history">
            <Card className="bg-transparent border border-red-500/40">
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
                          {game.game_date ? new Date(game.game_date + 'T12:00:00').toLocaleDateString() : ''} {game.location && `· ${game.location}`}
                        </div>
                        <div className="text-sm text-red-400 mt-1">Winner: {game.winner_name || game.winner_email}</div>
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

          {hasPermission(directorRole, "canUploadPhotos") && (
            <TabsContent value="photos">
              <div className="space-y-6">
                <Card className="bg-transparent border border-red-500/40">
                  <CardHeader>
                    <CardTitle className="text-white">Upload Winner Photo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUploadPhoto} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-300">Winner Name</Label>
                          <Input value={photoForm.winner_name}
                            onChange={e => setPhotoForm({...photoForm, winner_name: e.target.value})}
                            className="bg-gray-900 border-gray-700 text-white"
                            placeholder="e.g. John Smith" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">Game Date</Label>
                          <input type="date" value={photoForm.game_date}
                            onChange={e => setPhotoForm({...photoForm, game_date: e.target.value})}
                            className="w-full bg-gray-900 border border-gray-700 text-white rounded-md px-3 py-2 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">Location</Label>
                          <Select value={photoForm.location || "__none__"} onValueChange={v => {
                            setPhotoForm({...photoForm, location: v === "__none__" ? "" : v});
                          }}>
                            <SelectTrigger className="bg-gray-900 border-gray-700 text-white"><SelectValue placeholder="Select location" /></SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700">
                              <SelectItem value="__none__" disabled>Select location</SelectItem>
                              {["Tavern 018 Sunday","Tavern 018 Wednesday","East End Grill","Habana Club","Meddlesome"].map(loc => (
                                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">Caption (Optional)</Label>
                          <Input value={photoForm.title}
                            onChange={e => setPhotoForm({...photoForm, title: e.target.value})}
                            className="bg-gray-900 border-gray-700 text-white"
                            placeholder="e.g. Final table champion!" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300">Photo</Label>
                        <input type="file" accept="image/*"
                          onChange={e => setPhotoFile(e.target.files[0])}
                          className="w-full text-gray-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-red-600 file:text-white hover:file:bg-red-700 cursor-pointer"
                          required />
                      </div>
                      <Button type="submit" disabled={isUploadingPhoto || !photoFile}
                        className="w-full bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white font-bold shadow-lg shadow-red-900/40 transition-all duration-200">
                        {isUploadingPhoto ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : <><ImagePlus className="w-4 h-4 mr-2" />Upload Photo</>}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="bg-transparent border border-red-500/40">
                  <CardHeader>
                    <CardTitle className="text-white">Winner Photos ({photos.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {photos.map(photo => (
                        <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-gray-800 bg-gray-900">
                          <img src={photo.photo_url} alt={photo.title || photo.winner_name || "Winner"} className="w-full aspect-square object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                            <div className="text-white text-sm font-bold">{photo.winner_name}</div>
                            {photo.location && <div className="text-gray-300 text-xs">{photo.location}</div>}
                            {photo.game_date && <div className="text-gray-400 text-xs">{new Date(photo.game_date).toLocaleDateString()}</div>}
                            {photo.title && <div className="text-red-300 text-xs italic mt-1">{photo.title}</div>}
                          </div>
                          <button onClick={() => handleDeletePhoto(photo.id)}
                            className="absolute top-2 right-2 w-7 h-7 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700">
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                      {photos.length === 0 && <p className="text-gray-500 text-center py-4 col-span-3">No photos uploaded yet.</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
          </Tabs>
      </div>
    </div>
  );
}