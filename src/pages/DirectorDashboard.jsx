import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Game } from "@/entities/Game";
import { User } from "@/entities/User";
import { GameSession } from "@/entities/GameSession";
import { WinnerPhoto } from "@/entities/WinnerPhoto";
import { InviteRequest } from "@/entities/InviteRequest";
import { hasPermission } from "@/components/directorPermissions";
import { getPlayerById, getPlayerByEmail, getPlayerDisplayName, getEffectiveSignedInIds, getEffectiveHandOfWeekIds, buildPlayersById, getPlayerNameById } from "@/utils/playerUtils";
import { searchPlayers } from "@/functions/searchPlayers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Plus, Trophy, Loader2, Users, Trash2, CalendarPlus, ImagePlus, X, Mail, Search, ChevronDown, ChevronUp } from "lucide-react";
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
  const [players, setPlayers] = useState([]);

  const [gameData, setGameData] = useState({
    game_date: new Date().toISOString().split('T')[0],
    game_type: "Main Game",
    location: "",
    notes: ""
  });
  const [currentSessionId, setCurrentSessionId] = useState(null);
  // placements now store player IDs
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
  const [dirSignInSearch, setDirSignInSearch] = useState("");

  const [dirSignInStatus, setDirSignInStatus] = useState("");
  const [dirSignInMessage, setDirSignInMessage] = useState("");
  const [dirSignInSelectedPlayer, setDirSignInSelectedPlayer] = useState(null);
  const [dirSignInResults, setDirSignInResults] = useState([]);
  const [dirSignInSearchLoading, setDirSignInSearchLoading] = useState(false);
  const [placementSearches, setPlacementSearches] = useState(Array(9).fill(""));
  const [showPlacementSuggestions, setShowPlacementSuggestions] = useState(Array(9).fill(false));
  const [expandedSessions, setExpandedSessions] = useState({});
  const [activeTab, setActiveTab] = useState("sessions");

  const playersById = useMemo(() => buildPlayersById(players), [players]);

  // Helper: get name from player ID
  const nameById = (id) => getPlayerDisplayName(playersById[id]);

  // Fetch any player IDs that are signed in but not yet in our local players array
  useEffect(() => {
    const openSession = sessions.find(s => s.is_open);
    if (!openSession) return;
    const ids = getEffectiveSignedInIds(openSession, players);
    const missingIds = ids.filter(id => !playersById[id]);
    if (missingIds.length === 0) return;
    Promise.all(missingIds.map(id => base44.entities.Player.filter({ id }).catch(() => [])))
      .then(results => {
        const fetched = results.flat().filter(Boolean);
        if (fetched.length > 0) setPlayers(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          return [...prev, ...fetched.filter(p => !existingIds.has(p.id))];
        });
      });
  }, [sessions, playersById]);

  // Precomputed index of signed-in players for the open session — rebuilt only when session/players change
  const signedInSearchIndex = useMemo(() => {
    const openSession = sessions.find(s => s.is_open);
    const ids = getEffectiveSignedInIds(openSession || {}, players);
    return ids
      .map(id => {
        const p = playersById[id];
        const displayName = p ? getPlayerDisplayName(p) : null;
        if (!displayName) return null;
        return { id, displayName, searchText: displayName.toLowerCase() };
      })
      .filter(Boolean)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [sessions, playersById, players]);

  useEffect(() => { loadAll(); }, []);

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

  useEffect(() => {
    const unsubSessions = base44.entities.GameSession.subscribe((event) => {
      if (event.type === 'create') setSessions(prev => [event.data, ...prev]);
      else if (event.type === 'update') setSessions(prev => prev.map(s => s.id === event.id ? event.data : s));
      else if (event.type === 'delete') setSessions(prev => prev.filter(s => s.id !== event.id));
    });
    const unsubGames = base44.entities.Game.subscribe((event) => {
      if (event.type === 'create') setGames(prev => [event.data, ...prev]);
      else if (event.type === 'update') setGames(prev => prev.map(g => g.id === event.id ? event.data : g));
      else if (event.type === 'delete') setGames(prev => prev.filter(g => g.id !== event.id));
    });
    const unsubInvites = base44.entities.InviteRequest.subscribe((event) => {
      if (event.type === 'create') setInviteRequests(prev => [event.data, ...prev]);
      else if (event.type === 'update') setInviteRequests(prev => prev.map(r => r.id === event.id ? event.data : r));
      else if (event.type === 'delete') setInviteRequests(prev => prev.filter(r => r.id !== event.id));
    });
    return () => { unsubSessions(); unsubGames(); unsubInvites(); };
  }, []);

  // Debounced server-backed typeahead for Sign In Player search
  useEffect(() => {
    if (dirSignInSelectedPlayer) return;
    const q = dirSignInSearch.trim();
    const minLen = /^\d+$/.test(q) ? 1 : 2;
    if (q.length < minLen) { setDirSignInResults([]); return; }
    const timer = setTimeout(async () => {
      setDirSignInSearchLoading(true);
      const res = await searchPlayers({ query: q });
      setDirSignInResults(res.data?.players || []);
      setDirSignInSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [dirSignInSearch, dirSignInSelectedPlayer]);

  const getPlacementSuggestions = (index) => {
    const q = placementSearches[index]?.trim().toLowerCase();
    const alreadyPlaced = new Set(placements.filter((p, i) => p && i !== index));
    return signedInSearchIndex
      .filter(entry => {
        if (alreadyPlaced.has(entry.id)) return false;
        if (!q) return true;
        return entry.searchText.includes(q);
      })
      .slice(0, 8);
  };

  const loadAll = async () => {
    setIsLoading(true);
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

    const playerEmail = localStorage.getItem("playerEmail");
    const emailsToCheck = [...new Set([me.email, playerEmail].filter(Boolean))];
    let directorRecord = null;
    for (const email of emailsToCheck) {
      const check = await base44.entities.Director.filter({ email });
      if (check.length > 0) { directorRecord = check[0]; break; }
    }
    if (!directorRecord) { setIsLoading(false); return; }

    setDirectorRole(directorRecord.role);
    setActiveTab(hasPermission(directorRecord.role, "canManageSessions") ? "sessions" : "record");
    const [fetchedUsers, fetchedGames, fetchedSessions, fetchedPhotos, fetchedRequests] = await Promise.all([
      User.list(),
      Game.list("-created_date", 20),
      GameSession.list("-session_date", 20),
      WinnerPhoto.list("-created_date", 50),
      InviteRequest.filter({ status: "pending" }, "-created_date", 50),
    ]);
    setUsers(fetchedUsers);
    setGames(fetchedGames);
    setSessions(fetchedSessions);
    setPhotos(fetchedPhotos);
    setInviteRequests(fetchedRequests);

    base44.entities.User.subscribe((event) => {
      if (event.type === 'update') setUsers(prev => prev.map(u => u.id === event.id ? event.data : u));
      else if (event.type === 'create') setUsers(prev => [event.data, ...prev]);
    });
    setIsLoading(false);
  };

  const handleRecordGame = async (e) => {
    e.preventDefault();
    const filledIds = placements.filter(p => p !== "");
    if (filledIds.length < 2 || !placements[0]) {
      alert("Please assign at least 1st and 2nd place");
      return;
    }
    setIsSubmitting(true);
    const winnerPlayer = playersById[placements[0]];
    const winnerName = getPlayerDisplayName(winnerPlayer);
    const winnerEmail = winnerPlayer?.email || "";

    await Game.create({
      ...gameData,
      player_ids: filledIds,
      players: filledIds.map(id => getPlayerById(players, id)?.email || id), // legacy compat
      winner_player_id: placements[0],
      winner_email: winnerEmail, // legacy compat
      winner_name: winnerName,
      points_awarded: POINTS[0],
    });

    for (let i = 0; i < filledIds.length; i++) {
      const pid = filledIds[i];
      const user = users.find(u => {
        const pr = getPlayerById(players, pid);
        return pr && u.email?.trim().toLowerCase() === pr.email?.trim().toLowerCase();
      });
      const pts = POINTS[i] || 0;
      if (i === 0) {
        const newStreak = (user.current_streak || 0) + 1;

        await User.update(user.id, {
          games_played: (user.games_played || 0) + 1,
          total_points: (user.total_points || 0) + pts,
          wins: (user.wins || 0) + 1,
          current_streak: newStreak,
          best_streak: Math.max(user.best_streak || 0, newStreak)
        });
      } else {
        await User.update(user.id, {
          games_played: (user.games_played || 0) + 1,
          total_points: (user.total_points || 0) + pts,
          current_streak: 0
        });
      }
    }

    if (currentSessionId) {
      await GameSession.update(currentSessionId, { is_open: false, signed_in_player_ids: [], signed_in_players: [] });
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

  const handleDeleteGame = (gameId) => setGames(prev => prev.filter(g => g.id !== gameId));

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setIsCreatingSession(true);
    await GameSession.create({ ...newSession, is_open: true, signed_in_player_ids: [], signed_in_players: [] });
    setNewSession({ session_date: new Date().toISOString().split('T')[0], location: "", game_type: "Main Game" });
    const updated = await GameSession.list("-session_date", 20);
    setSessions(updated);
    setIsCreatingSession(false);
  };

  const handleToggleSession = async (session) => {
    await GameSession.update(session.id, { is_open: !session.is_open });
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, is_open: !s.is_open } : s));
  };

  const handleDeleteSession = (sessionId) => setSessions(prev => prev.filter(s => s.id !== sessionId));

  const handleUploadPhoto = async (e) => {
    e.preventDefault();
    if (!photoFile) return;
    setIsUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: photoFile });
    await WinnerPhoto.create({ ...photoForm, photo_url: file_url });
    setPhotoForm({ title: "", winner_name: "", game_date: new Date().toISOString().split('T')[0], location: "" });
    setPhotoFile(null);
    setPhotos(await WinnerPhoto.list("-created_date", 50));
    setIsUploadingPhoto(false);
  };

  const handleDirectorSignInPlayer = async (e) => {
    e.preventDefault();
    setDirSignInStatus("loading");
    setDirSignInMessage("");

    const player = dirSignInSelectedPlayer;
    if (!player) {
      setDirSignInStatus("error");
      setDirSignInMessage("Please select a player from the search dropdown.");
      return;
    }

    const openSession = sessions.find(s => s.is_open);
    if (!openSession) {
      setDirSignInStatus("error");
      setDirSignInMessage("No open game session. Open a game first.");
      return;
    }

    const currentIds = openSession.signed_in_player_ids || [];
    if (currentIds.includes(player.id)) {
      setDirSignInStatus("error");
      setDirSignInMessage(`${player.display_name} is already signed in.`);
      return;
    }

    const updatedIds = [...currentIds, player.id];
    const updatedEmails = [...(openSession.signed_in_players || []), player.email]; // legacy compat
    await base44.entities.GameSession.update(openSession.id, {
      signed_in_player_ids: updatedIds,
      signed_in_players: updatedEmails
    });
    setSessions(prev => prev.map(s => s.id === openSession.id
      ? { ...s, signed_in_player_ids: updatedIds, signed_in_players: updatedEmails }
      : s));

    setDirSignInStatus("success");
    setDirSignInMessage(`${player.display_name} signed in successfully!`);
    setDirSignInSearch("");
    setDirSignInSelectedPlayer(null);
    setDirSignInResults([]);
    setTimeout(() => { setDirSignInStatus(""); setDirSignInMessage(""); }, 3000);
  };

  const handleDeletePhoto = async (photoId) => {
    if (!confirm("Delete this photo?")) return;
    await WinnerPhoto.delete(photoId);
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const resolveGameWinner = (game) => {
    if (game.winner_player_id && playersById[game.winner_player_id])
      return getPlayerDisplayName(playersById[game.winner_player_id]);
    if (game.winner_email) {
      const p = getPlayerByEmail(players, game.winner_email);
      if (p) return getPlayerDisplayName(p);
    }
    return game.winner_name || "Unknown Player";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-400" />
      </div>
    );
  }

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
    <div className="min-h-screen p-3 md:p-6 overflow-x-hidden relative" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
      <div className="absolute inset-0 pointer-events-none" style={{background: "radial-gradient(circle at top, rgba(220,38,38,0.08), transparent 40%)"}} />
      <div className="max-w-4xl mx-auto w-full relative">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900/60 rounded-lg flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Director Dashboard</h1>
            <p className="text-gray-400 text-sm">Tournament Directors only</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900/40 p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { setActiveTab("sessions"); setTimeout(() => document.getElementById('dir-sign-in-search')?.focus(), 100); }}
              className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-lg text-xs px-3">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Player
            </Button>
            <Button size="sm" onClick={() => setActiveTab("record")}
              className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-lg text-xs px-3">
              <Trophy className="w-3.5 h-3.5 mr-1" /> Record Game
            </Button>
            <Button size="sm" onClick={() => setActiveTab("sessions")}
              className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-lg text-xs px-3">
              🃏 Hand of the Week
            </Button>
            <Button size="sm" onClick={() => navigate(createPageUrl("Leaderboard"))}
              className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-lg text-xs px-3">
              <Users className="w-3.5 h-3.5 mr-1" /> View Leaderboard
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
              <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 space-y-4 transition hover:border-gray-700 hover:bg-gray-900/60">
                <div className="flex items-center gap-3 mb-4 pb-4 border-t-0 border-b border-gray-800">
                  <div className="w-10 h-10 bg-gray-900/60 rounded-lg flex items-center justify-center">
                    <CalendarPlus className="w-5 h-5 text-red-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Open Games</h2>
                </div>
                <div className="space-y-3">
                    {sessions.filter(s => s.is_open).map(session => {
                      const signedInIds = getEffectiveSignedInIds(session, players);
                      const handIds = getEffectiveHandOfWeekIds(session, players);
                      const isExpanded = !!expandedSessions[session.id];
                      const isHotwExpanded = !!expandedSessions[`hotw_${session.id}`];
                      return (
                        <div key={session.id} className="p-4 bg-gray-900/50 rounded-xl border border-green-900/30">
                          {/* LIVE Badge */}
                          <div className="mb-2">
                            <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-semibold px-2 py-0.5">
                              🟢 LIVE GAME
                            </Badge>
                          </div>

                          {/* Location + delete */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-medium text-white text-base">{session.location}</div>
                              <div className="text-sm text-gray-400">
                                {session.session_date ? new Date(session.session_date + 'T12:00:00').toLocaleDateString("en-US", {month: "short", day: "numeric"}) : ''} · {session.game_type}
                              </div>
                            </div>
                            <Button size="icon" variant="ghost"
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              onClick={() => handleDeleteSession(session.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Director Actions Row */}
                          <div className="flex flex-wrap gap-2 mt-3 pb-3 border-b border-gray-800">
                            <Button size="sm"
                              className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-lg text-xs px-3"
                              onClick={() => { setTimeout(() => document.getElementById('dir-sign-in-search')?.focus(), 50); }}>
                              <Plus className="w-3.5 h-3.5 mr-1" /> Add Player
                            </Button>
                            <Button size="sm"
                              className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-lg text-xs px-3"
                              onClick={() => setActiveTab("record")}>
                              <Trophy className="w-3.5 h-3.5 mr-1" /> Record Game
                            </Button>
                            <Button size="sm"
                              className={`rounded-lg text-xs px-3 ${isHotwExpanded ? 'bg-red-900/40 border border-red-700 text-red-300' : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'}`}
                              onClick={() => setExpandedSessions(prev => ({ ...prev, [`hotw_${session.id}`]: !prev[`hotw_${session.id}`] }))}>
                              🃏 Hand of Week
                            </Button>
                            <Button size="sm"
                              className="border border-red-500 text-red-400 hover:bg-red-600/20 bg-transparent rounded-lg text-xs px-3"
                              onClick={() => handleToggleSession(session)}>
                              {session.is_open ? "End Game" : "Reopen"}
                            </Button>
                          </div>

                          {/* Collapsible Players Signed In */}
                          <button
                            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-300 transition-colors mt-3 w-full text-left"
                            onClick={() => setExpandedSessions(prev => ({ ...prev, [session.id]: !prev[session.id] }))}
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Players Signed In ({signedInIds.length})</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
                          </button>

                          {isExpanded && signedInIds.length > 0 && (
                            <div className="mt-2 border-t border-gray-800 pt-2">
                              <div className="flex gap-4">
                                {Array.from({ length: Math.min(4, Math.ceil(signedInIds.length / 20)) }, (_, col) => {
                                  const start = col * 20;
                                  const slice = signedInIds.slice(start, start + 20);
                                  return (
                                    <div key={col} className="flex-1 min-w-0 space-y-0.5">
                                      {slice.map((pid, i) => (
                                        <div key={pid} className="flex items-baseline text-xs text-gray-300 leading-5">
                                          <span className="text-gray-500 shrink-0 w-8 text-right pr-1">{start + i + 1}.</span>
                                          <span className="truncate">{nameById(pid)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                              {signedInIds.length > 80 && (
                                <p className="text-xs text-gray-600 mt-1">+{signedInIds.length - 80} more</p>
                              )}
                            </div>
                          )}
                          {isExpanded && signedInIds.length === 0 && (
                            <p className="text-xs text-gray-500 mt-2 pl-1">No players signed in yet.</p>
                          )}

                          {/* Hand of the Week (expandable) */}
                          {isHotwExpanded && (
                            <div className="mt-3 space-y-2 border-t border-gray-800 pt-3">
                              <label className="text-xs text-red-400 font-semibold">🃏 Hand of the Week</label>
                              <Select
                                value="__none__"
                                onValueChange={async (pid) => {
                                  if (pid === "__none__") return;
                                  if (handIds.includes(pid)) return;
                                  const playerRecord = playersById[pid];
                                  const user = users.find(u => u.email?.trim().toLowerCase() === playerRecord?.email?.trim().toLowerCase());
                                  if (user) {
                                    await base44.entities.User.update(user.id, { total_points: (user.total_points || 0) + 50 });
                                    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, total_points: (u.total_points || 0) + 50 } : u));
                                  }
                                  const newIds = [...handIds, pid];
                                  await GameSession.update(session.id, { hand_of_week_player_ids: newIds });
                                  setSessions(prev => prev.map(s => s.id === session.id ? { ...s, hand_of_week_player_ids: newIds } : s));
                                }}
                              >
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-sm h-8">
                                  <SelectValue placeholder="Add player..." />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-700">
                                  <SelectItem value="__none__" disabled className="text-gray-500">Add player...</SelectItem>
                                  {signedInSearchIndex
                                    .filter(entry => !handIds.includes(entry.id))
                                    .map(entry => (
                                      <SelectItem key={entry.id} value={entry.id} className="text-white">{entry.displayName}</SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              {handIds.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {handIds.map(pid => (
                                    <span key={pid} className="flex items-center gap-1 bg-red-900/40 border border-red-700 text-red-300 text-xs rounded-full px-2 py-0.5">
                                      {nameById(pid)}
                                      <button onClick={async () => {
                                        const playerRecord = playersById[pid];
                                        const user = users.find(u => u.email?.trim().toLowerCase() === playerRecord?.email?.trim().toLowerCase());
                                        if (user) {
                                          await base44.entities.User.update(user.id, { total_points: Math.max(0, (user.total_points || 0) - 50) });
                                          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, total_points: Math.max(0, (u.total_points || 0) - 50) } : u));
                                        }
                                        const newIds = handIds.filter(id => id !== pid);
                                        await GameSession.update(session.id, { hand_of_week_player_ids: newIds });
                                        setSessions(prev => prev.map(s => s.id === session.id ? { ...s, hand_of_week_player_ids: newIds } : s));
                                      }} className="ml-1 hover:text-white">×</button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {sessions.filter(s => s.is_open).length === 0 && <p className="text-gray-500 text-center py-4">No open games.</p>}
                </div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 space-y-4 transition hover:border-gray-700 hover:bg-gray-900/60">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800">
                  <div className="w-10 h-10 bg-gray-900/60 rounded-lg flex items-center justify-center">
                    <Plus className="w-5 h-5 text-red-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Open a New Game</h2>
                </div>
                <form onSubmit={handleCreateSession} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2 min-w-0 overflow-hidden">
                      <label className="text-gray-300 text-sm">Date</label>
                      <input type="date" value={newSession.session_date}
                        onChange={e => setNewSession({...newSession, session_date: e.target.value})}
                        className="w-full max-w-full h-10 bg-gray-900 border border-gray-800 text-white rounded-lg px-3 py-2 text-sm [color-scheme:dark] box-border focus:ring-2 focus:ring-red-600"
                        required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-gray-300 text-sm">Game Type</label>
                      <Select value={newSession.game_type || "__none__"} onValueChange={v => setNewSession({...newSession, game_type: v === "__none__" ? "" : v})}>
                        <SelectTrigger className="bg-gray-900 border-gray-800 text-white rounded-lg"><SelectValue placeholder="Select game type" /></SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white">
                          <SelectItem value="__none__" disabled className="text-gray-400">Select game type</SelectItem>
                          {["Main Game","Turbo"].map(t => <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-gray-300 text-sm">Location</label>
                      <Select value={newSession.location || "__none__"} onValueChange={v => setNewSession({...newSession, location: v === "__none__" ? "" : v})}>
                        <SelectTrigger className="bg-gray-900 border-gray-800 text-white rounded-lg"><SelectValue placeholder="Select location" /></SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white">
                          <SelectItem value="__none__" disabled className="text-gray-400">Select location</SelectItem>
                          {["Tavern 018 Sunday","Tavern 018 Wednesday","East End Grill","Habana Club","Meddlesome"].map(loc =>
                            <SelectItem key={loc} value={loc} className="text-white">{loc}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" disabled={isCreatingSession || !newSession.location}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg px-4 py-2">
                    {isCreatingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : "Open Game"}
                  </Button>
                </form>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 space-y-4 transition hover:border-gray-700 hover:bg-gray-900/60">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800">
                  <div className="w-10 h-10 bg-gray-900/60 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-red-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Sign In Player</h2>
                </div>
                <div>
                  <form onSubmit={handleDirectorSignInPlayer} className="space-y-4">
                    <div className="relative">
                        <Input
                          id="dir-sign-in-search"
                          placeholder="Search player name or player #..."
                          value={dirSignInSearch}
                          onChange={e => { setDirSignInSearch(e.target.value); if (dirSignInSelectedPlayer) setDirSignInSelectedPlayer(null); }}
                          className="bg-gray-900 border-gray-800 text-white rounded-lg focus:ring-2 focus:ring-red-600"
                          autoComplete="off"
                        />
                        {dirSignInSearchLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          </div>
                        )}
                        {!dirSignInSelectedPlayer && !dirSignInSearchLoading && dirSignInSearch.trim().length >= 1 && dirSignInResults.length === 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg p-3 text-gray-500 text-sm text-center">
                            {/^\d+$/.test(dirSignInSearch.trim()) ? "No player found for that number" : "No players found"}
                          </div>
                        )}
                        {!dirSignInSelectedPlayer && dirSignInResults.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                            {dirSignInResults.map(p => (
                              <button key={p.id} type="button"
                                className="w-full text-left px-3 py-2 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0"
                                onMouseDown={() => {
                                  setDirSignInSelectedPlayer(p);
                                  setDirSignInSearch(p.display_name);
                                  setDirSignInResults([]);
                                }}>
                                <div className="text-white text-sm font-medium">{p.display_name}{p.player_number != null ? ` (#${p.player_number})` : ''}</div>
                              </button>
                            ))}
                          </div>
                        )}
                        {dirSignInSelectedPlayer && (
                          <div className="mt-1 flex items-center justify-between text-sm px-1">
                            <span className="text-green-400">✓ {dirSignInSelectedPlayer.display_name}</span>
                            <button type="button" onClick={() => { setDirSignInSelectedPlayer(null); setDirSignInSearch(""); setDirSignInResults([]); }} className="text-gray-500 hover:text-red-400 ml-2">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button type="submit" disabled={dirSignInStatus === "loading"}
                      className="w-full bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg px-4 py-2">
                      {dirSignInStatus === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In Player"}
                    </Button>
                    {dirSignInMessage && (
                      <p className={`text-sm text-center ${dirSignInStatus === "success" ? "text-green-400" : "text-red-400"}`}>
                        {dirSignInMessage}
                      </p>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </TabsContent>
          )}

          {hasPermission(directorRole, "canRecordGames") && (
          <TabsContent value="record">
            {!sessions.find(s => s.is_open) ? (
              <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-10 text-center text-gray-500">
                No open game session. Open a game in the Sessions tab first.
              </div>
            ) : (
            <form onSubmit={handleRecordGame}>
              <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 space-y-6 transition hover:border-gray-700 hover:bg-gray-900/60">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
                  <div className="w-10 h-10 bg-gray-900/60 rounded-lg flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Record Game — <span className="text-red-400">{sessions.find(s => s.is_open)?.location}</span>
                    </h2>
                    <p className="text-sm text-gray-400">
                      {sessions.find(s => s.is_open)?.session_date ? new Date(sessions.find(s => s.is_open).session_date + 'T12:00:00').toLocaleDateString() : ''} · {sessions.find(s => s.is_open)?.game_type} · {getEffectiveSignedInIds(sessions.find(s => s.is_open) || {}, players).length} players signed in
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Game Date</Label>
                  <input type="date" value={gameData.game_date}
                    onChange={e => setGameData({...gameData, game_date: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg px-3 py-2 text-sm [color-scheme:dark] focus:ring-2 focus:ring-red-600" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Placements</Label>
                  <p className="text-xs text-gray-500">1st=1000pts, 2nd=750pts … 9th=50pts</p>
                  <div className="space-y-2">
                    {PLACE_LABELS.map((label, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-10 text-sm font-bold text-right shrink-0 text-gray-400">{label}</div>
                        <div className="text-sm text-gray-600 w-16 shrink-0">{POINTS[i]} pts</div>
                        <div className="relative flex-1">
                          <Input
                            placeholder={`Search ${label} place...`}
                            value={placements[i] ? nameById(placements[i]) : placementSearches[i]}
                            onChange={e => {
                              if (placements[i]) {
                                const u = [...placements]; u[i] = ""; setPlacements(u);
                              }
                              const u = [...placementSearches]; u[i] = e.target.value; setPlacementSearches(u);
                              const v = [...showPlacementSuggestions]; v[i] = true; setShowPlacementSuggestions(v);
                            }}
                            onFocus={() => { const u = [...showPlacementSuggestions]; u[i] = true; setShowPlacementSuggestions(u); }}
                            onBlur={() => setTimeout(() => { const u = [...showPlacementSuggestions]; u[i] = false; setShowPlacementSuggestions(u); }, 150)}
                            className="bg-gray-900 border-gray-800 text-white w-full rounded-lg focus:ring-2 focus:ring-red-600"
                          />
                            {placements[i] && (
                              <button type="button" onClick={() => {
                                const u = [...placements]; u[i] = ""; setPlacements(u);
                                const s = [...placementSearches]; s[i] = ""; setPlacementSearches(s);
                              }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {showPlacementSuggestions[i] && !placements[i] && getPlacementSuggestions(i).length > 0 && (
                              <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg overflow-hidden">
                                {getPlacementSuggestions(i).map(entry => (
                                  <button key={entry.id} type="button"
                                    className="w-full text-left px-3 py-2 hover:bg-gray-800 transition-colors"
                                    onMouseDown={() => {
                                      const u = [...placements];
                                      for (let j = 0; j < u.length; j++) { if (u[j] === entry.id) u[j] = ""; }
                                      u[i] = entry.id; setPlacements(u);
                                      const s = [...placementSearches]; s[i] = ""; setPlacementSearches(s);
                                      const v = [...showPlacementSuggestions]; v[i] = false; setShowPlacementSuggestions(v);
                                    }}>
                                    <span className="text-white text-sm">{entry.displayName}</span>
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
                    className="bg-gray-900 border-gray-800 text-white h-20 rounded-lg"
                    placeholder="Any notes about the game..." />
                </div>
                <Button type="submit" disabled={isSubmitting}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg px-4 py-2">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Recording...</> : <><Trophy className="w-4 h-4 mr-2" />Record Game</>}
                </Button>
              </div>
            </form>
            )}
          </TabsContent>
          )}

          {hasPermission(directorRole, "canApproveRequests") && (
          <TabsContent value="requests">
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 space-y-4 transition hover:border-gray-700 hover:bg-gray-900/60">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800">
                <div className="w-10 h-10 bg-gray-900/60 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  Pending Invite Requests
                  {inviteRequests.length > 0 && (
                    <span className="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5">{inviteRequests.length}</span>
                  )}
                </h2>
              </div>
              {inviteRequests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No pending invite requests.</p>
              ) : (
                <div className="space-y-3">
                  {inviteRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-4 bg-gray-900/60 rounded-xl border border-gray-800">
                      <div className="font-medium text-white">{req.first_name} {req.last_name}</div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApproveRequest(req)}
                          className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-3">
                          Approve & Invite
                        </Button>
                        <Button size="sm" onClick={() => handleDeclineRequest(req)}
                          className="border border-red-500 text-red-400 hover:bg-red-600/20 bg-transparent rounded-lg px-3">
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          )}

          {hasPermission(directorRole, "canManagePlayers") && (
          <TabsContent value="players">
            <div className="space-y-6">
              {inviteRequests.length > 0 && (
                <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 space-y-3 transition hover:border-gray-700 hover:bg-gray-900/60">
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-800">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    <h2 className="text-lg font-semibold text-white">Pending Invite Requests ({inviteRequests.length})</h2>
                  </div>
                  {inviteRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-3 bg-gray-900/60 rounded-xl border border-gray-800">
                      <div className="font-medium text-white">{req.first_name} {req.last_name}</div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApproveRequest(req)}
                          className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-3">Approve & Invite</Button>
                        <Button size="sm" onClick={() => handleDeclineRequest(req)}
                          className="border border-red-500 text-red-400 hover:bg-red-600/20 bg-transparent rounded-lg px-3">Decline</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 space-y-4 transition hover:border-gray-700 hover:bg-gray-900/60">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800">
                  <div className="w-10 h-10 bg-gray-900/60 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-red-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">
                    {(() => {
                      const openSession = sessions.find(s => s.is_open);
                      const ids = getEffectiveSignedInIds(openSession || {}, players);
                      return `Players Signed In (${ids.length})`;
                    })()}
                  </h2>
                </div>
                {(() => {
                  const openSession = sessions.find(s => s.is_open);
                  if (!openSession) return <p className="text-gray-500 text-center py-4">No open game session.</p>;
                  const signedInIds = getEffectiveSignedInIds(openSession, players);
                  if (signedInIds.length === 0) return <p className="text-gray-500 text-center py-4">No players have signed in yet.</p>;
                  const signedInPlayers = signedInIds.map(id => playersById[id]).filter(Boolean);
                  const filtered = signedInPlayers.filter(p =>
                    !playerSearch || getPlayerDisplayName(p).toLowerCase().includes(playerSearch.toLowerCase())
                  );
                  return (
                    <>
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input placeholder="Search by name..."
                          value={playerSearch}
                          onChange={e => setPlayerSearch(e.target.value)}
                          className="bg-gray-900 border-gray-800 text-white pl-9 rounded-lg focus:ring-2 focus:ring-red-600" />
                      </div>
                      <div className="space-y-2">
                        {filtered.map(player => (
                          <div key={player.id} className="flex items-center gap-2 text-sm text-gray-300 py-1.5 border-b border-gray-800/60 last:border-0">
                            <span className="text-red-500">•</span>
                            <span className="font-medium text-white truncate">{getPlayerDisplayName(player)}</span>
                          </div>
                        ))}
                        {filtered.length === 0 && playerSearch && <p className="text-gray-500 text-center py-4">No players match your search.</p>}
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 space-y-4 transition hover:border-gray-700 hover:bg-gray-900/60">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800">
                  <div className="w-10 h-10 bg-gray-900/60 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-red-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Invite Player</h2>
                </div>
                <form onSubmit={handleInvite} className="flex gap-3">
                  <Input type="email" placeholder="player@email.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="bg-gray-900 border-gray-800 text-white flex-1 rounded-lg focus:ring-2 focus:ring-red-600"
                    required />
                  <Button type="submit" disabled={inviteStatus === "sending"}
                    className="bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg px-4 py-2">
                    {inviteStatus === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Invite"}
                  </Button>
                </form>
                {inviteStatus === "sent" && <p className="text-green-400 text-sm mt-2">Invitation sent!</p>}
              </div>
            </div>
          </TabsContent>
          )}

          <TabsContent value="history">
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 space-y-4 transition hover:border-gray-700 hover:bg-gray-900/60">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800">
                <div className="w-10 h-10 bg-gray-900/60 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Recent Games</h2>
              </div>
              <div className="space-y-3">
                {games.map(game => (
                  <div key={game.id} className="flex items-center justify-between p-4 bg-gray-900/60 rounded-xl border border-gray-800">
                    <div>
                      <div className="font-medium text-white">{game.game_type}</div>
                      <div className="text-sm text-gray-400">
                        {game.game_date ? new Date(game.game_date + 'T12:00:00').toLocaleDateString() : ''} {game.location && `· ${game.location}`}
                      </div>
                      <div className="text-sm text-red-400 mt-1">Winner: {resolveGameWinner(game)}</div>
                    </div>
                    <Button size="icon" variant="ghost"
                      className="border border-red-500 text-red-400 hover:bg-red-600/20 rounded-lg"
                      onClick={() => handleDeleteGame(game.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {games.length === 0 && <p className="text-gray-500 text-center py-4">No games recorded yet.</p>}
              </div>
            </div>
          </TabsContent>

          {hasPermission(directorRole, "canUploadPhotos") && (
          <TabsContent value="photos">
            <div className="space-y-6">
              <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 space-y-4 transition hover:border-gray-700 hover:bg-gray-900/60">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800">
                  <div className="w-10 h-10 bg-gray-900/60 rounded-lg flex items-center justify-center">
                    <ImagePlus className="w-5 h-5 text-red-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Upload Winner Photo</h2>
                </div>
                <form onSubmit={handleUploadPhoto} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Winner Name</Label>
                      <Input value={photoForm.winner_name}
                        onChange={e => setPhotoForm({...photoForm, winner_name: e.target.value})}
                        className="bg-gray-900 border-gray-800 text-white rounded-lg focus:ring-2 focus:ring-red-600" placeholder="e.g. John Smith" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Game Date</Label>
                      <input type="date" value={photoForm.game_date}
                        onChange={e => setPhotoForm({...photoForm, game_date: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg px-3 py-2 text-sm [color-scheme:dark] focus:ring-2 focus:ring-red-600" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Location</Label>
                      <Select value={photoForm.location || "__none__"} onValueChange={v => setPhotoForm({...photoForm, location: v === "__none__" ? "" : v})}>
                        <SelectTrigger className="bg-gray-900 border-gray-800 text-white rounded-lg"><SelectValue placeholder="Select location" /></SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                          <SelectItem value="__none__" disabled>Select location</SelectItem>
                          {["Tavern 018 Sunday","Tavern 018 Wednesday","East End Grill","Habana Club","Meddlesome"].map(loc =>
                            <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Caption (Optional)</Label>
                      <Input value={photoForm.title}
                        onChange={e => setPhotoForm({...photoForm, title: e.target.value})}
                        className="bg-gray-900 border-gray-800 text-white rounded-lg focus:ring-2 focus:ring-red-600" placeholder="e.g. Final table champion!" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Photo</Label>
                    <input type="file" accept="image/*"
                      onChange={e => setPhotoFile(e.target.files[0])}
                      className="w-full text-gray-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-red-600 file:text-white hover:file:bg-red-500 cursor-pointer"
                      required />
                  </div>
                  <Button type="submit" disabled={isUploadingPhoto || !photoFile}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg px-4 py-2">
                    {isUploadingPhoto ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : <><ImagePlus className="w-4 h-4 mr-2" />Upload Photo</>}
                  </Button>
                </form>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 space-y-4 transition hover:border-gray-700 hover:bg-gray-900/60">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800">
                  <div className="w-10 h-10 bg-gray-900/60 rounded-lg flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-red-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Winner Photos ({photos.length})</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map(photo => (
                    <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-gray-800 bg-gray-900">
                      <img src={photo.photo_url} alt={photo.title || photo.winner_name || "Winner"} className="w-full aspect-square object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <div className="text-white text-sm font-bold">{photo.winner_name}</div>
                        {photo.location && <div className="text-gray-300 text-xs">{photo.location}</div>}
                        {photo.game_date && <div className="text-gray-400 text-xs">{new Date(photo.game_date).toLocaleDateString()}</div>}
                        {photo.title && <div className="text-red-300 text-xs italic mt-1">{photo.title}</div>}
                      </div>
                      <button onClick={() => handleDeletePhoto(photo.id)}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                  {photos.length === 0 && <p className="text-gray-500 text-center py-4 col-span-3">No photos uploaded yet.</p>}
                </div>
              </div>
            </div>
          </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}