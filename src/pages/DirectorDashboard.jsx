import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Game } from "@/entities/Game";
import { User } from "@/entities/User";
import { GameSession } from "@/entities/GameSession";
import { WinnerPhoto } from "@/entities/WinnerPhoto";
import { InviteRequest } from "@/entities/InviteRequest";
import { hasPermission } from "@/components/directorPermissions";
import WinnerPhotoReminderModal from "@/components/director/WinnerPhotoReminderModal";
import EditGameModal from "@/components/director/EditGameModal";
import { getPlayerById, getPlayerByEmail, getPlayerDisplayName, getEffectiveSignedInIds, getEffectiveHandOfWeekIds, buildPlayersById, getPlayerNameById } from "@/utils/playerUtils";
import { searchPlayers } from "@/functions/searchPlayers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Plus, Trophy, Loader2, Users, Trash2, CalendarPlus, ImagePlus, X, Mail, Search, ChevronDown, ChevronUp, Pencil } from "lucide-react";
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
  const getLocalDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const [newSession, setNewSession] = useState({
    session_date: getLocalDateString(),
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

  const [expandedGameId, setExpandedGameId] = useState(null);
  const [dirSignInStatus, setDirSignInStatus] = useState("");
  const [dirSignInMessage, setDirSignInMessage] = useState("");
  const [dirSignInSelectedPlayer, setDirSignInSelectedPlayer] = useState(null);
  const [dirSignInResults, setDirSignInResults] = useState([]);
  const [dirSignInSearchLoading, setDirSignInSearchLoading] = useState(false);
  const [placementSearches, setPlacementSearches] = useState(Array(9).fill(""));
  const [showPlacementSuggestions, setShowPlacementSuggestions] = useState(Array(9).fill(false));
  const [expandedSessions, setExpandedSessions] = useState({});
  const [activeTab, setActiveTab] = useState("sessions");
  const [showWinnerPhotoModal, setShowWinnerPhotoModal] = useState(false);
  const [editingGame, setEditingGame] = useState(null);

  const playersById = useMemo(() => buildPlayersById(players), [players]);

  // Set of all player IDs we've already attempted to fetch (via games or sessions effects)
  const fetchedPlayerIdSet = useMemo(() => new Set(players.map(p => p.id)), [players]);

  // Helper: get name from player ID
  // - "Loading..." if we haven't finished fetching yet (games still loading or fetch in-flight)
  // - "Unknown Player" if we've fetched and it truly doesn't exist
  const nameById = (id) => {
    if (playersById[id]) return getPlayerDisplayName(playersById[id]);
    if (isLoading) return "Loading...";
    // If all game player IDs have been attempted (games effect ran), show Unknown
    const allGameIds = new Set(games.flatMap(g => g.player_ids || []));
    if (allGameIds.has(id) && fetchedPlayerIdSet.size > 0) return "Unknown Player";
    return "Loading...";
  };

  // Whenever sessions change (e.g. new sign-ins via subscription), fetch any missing Player records
  useEffect(() => {
    const openSessions = sessions.filter(s => s.is_open);
    const allIds = [...new Set(openSessions.flatMap(s => s.signed_in_player_ids || []))];
    const missingIds = allIds.filter(id => !playersById[id]);
    if (missingIds.length === 0) return;
    base44.entities.Player.filter({ id: { $in: missingIds } }, null, missingIds.length)
      .then(fetched => {
        if (fetched.length > 0) setPlayers(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          return [...prev, ...fetched.filter(p => !existingIds.has(p.id))];
        });
      });
  }, [sessions]);

  // Whenever games change, fetch any Player records referenced in game.player_ids that aren't loaded yet
  useEffect(() => {
    if (games.length === 0) return;
    const allIds = [...new Set(games.flatMap(g => g.player_ids || []))];
    const missingIds = allIds.filter(id => !playersById[id]);
    if (missingIds.length === 0) return;
    base44.entities.Player.filter({ id: { $in: missingIds } }, null, missingIds.length)
      .then(fetched => {
        if (fetched.length > 0) setPlayers(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          return [...prev, ...fetched.filter(p => !existingIds.has(p.id))];
        });
      });
  }, [games]);

  // Precomputed roster for the open session in sign-in order.
  // Built from signed_in_player_ids directly so every signed-in player is included
  // as soon as their record is loaded.
  const signedInSearchIndex = useMemo(() => {
    const openSession = sessions.find(s => s.is_open);
    const ids = openSession?.signed_in_player_ids || [];
    return ids
      .map(id => {
        const p = playersById[id];
        const displayName = p ? getPlayerDisplayName(p) : null;
        if (!displayName) return null;
        return { id, displayName, searchText: displayName.toLowerCase() };
      })
      .filter(Boolean);
    // Intentionally NOT sorted — preserves session sign-in order
  }, [sessions, playersById]);

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
    return signedInSearchIndex.filter(entry => {
      if (alreadyPlaced.has(entry.id)) return false;
      if (!q) return true;
      return entry.searchText.includes(q);
    });
    // No slice — show the full roster so no signed-in player is hidden
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

    // Fetch all Player records referenced in open sessions immediately
    const openSessions = fetchedSessions.filter(s => s.is_open);
    const allIds = [...new Set(openSessions.flatMap(s => s.signed_in_player_ids || []))];
    if (allIds.length > 0) {
      const fetchedPlayers = await base44.entities.Player.filter({ id: { $in: allIds } }, null, allIds.length);
      setPlayers(fetchedPlayers);
    }

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

    // Award winner a card guard in the Player database
    if (winnerPlayer) {
      await base44.entities.Player.update(winnerPlayer.id, {
        card_guards: (winnerPlayer.card_guards || 0) + 1,
      });
    }

    // Update QuarterlyStats for all placed players (1st–9th)
    const gameDate = new Date(gameData.game_date + 'T12:00:00');
    const quarter = `${gameDate.getFullYear()}-Q${Math.floor(gameDate.getMonth() / 3) + 1}`;
    for (let i = 0; i < filledIds.length; i++) {
      const pid = filledIds[i];
      const pts = POINTS[i] || 0;
      const isWin = i === 0;
      const playerRec = playersById[pid];
      const existing = await base44.entities.QuarterlyStats.filter({ quarter, player_id: pid });
      if (existing.length > 0) {
        await base44.entities.QuarterlyStats.update(existing[0].id, {
          points: (existing[0].points || 0) + pts,
          wins: (existing[0].wins || 0) + (isWin ? 1 : 0),
        });
      } else {
        await base44.entities.QuarterlyStats.create({
          quarter,
          player_id: pid,
          player_email: playerRec?.email || "",
          player_name: playerRec ? getPlayerDisplayName(playerRec) : "",
          points: pts,
          wins: isWin ? 1 : 0,
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
    setShowWinnerPhotoModal(true);
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

  const handleDeleteGame = async (gameId) => {
    if (!confirm("Delete this game? This will remove all associated wins and points.")) return;
    
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    // Delete QuarterlyStats entries for all placed players
    const gameDate = new Date(game.game_date + 'T12:00:00');
    const quarter = `${gameDate.getFullYear()}-Q${Math.floor(gameDate.getMonth() / 3) + 1}`;
    const placedIds = game.player_ids || [];
    
    for (let i = 0; i < placedIds.length; i++) {
      const pid = placedIds[i];
      const pts = POINTS[i] || 0;
      const isWin = i === 0;
      
      const stats = await base44.entities.QuarterlyStats.filter({ quarter, player_id: pid });
      if (stats.length > 0) {
        const existing = stats[0];
        const newPoints = Math.max(0, (existing.points || 0) - pts);
        const newWins = Math.max(0, (existing.wins || 0) - (isWin ? 1 : 0));
        
        if (newPoints === 0 && newWins === 0) {
          // Delete the record if nothing left
          await base44.entities.QuarterlyStats.delete(existing.id);
        } else {
          // Update with reduced totals
          await base44.entities.QuarterlyStats.update(existing.id, {
            points: newPoints,
            wins: newWins,
          });
        }
      }
    }
    
    // Remove card guard from winner if applicable
    if (game.winner_player_id && playersById[game.winner_player_id]) {
      const winner = playersById[game.winner_player_id];
      await base44.entities.Player.update(winner.id, {
        card_guards: Math.max(0, (winner.card_guards || 0) - 1),
      });
    }
    
    // Delete the game
    await Game.delete(gameId);
    setGames(prev => prev.filter(g => g.id !== gameId));
  };

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
    <>
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="w-full flex flex-wrap justify-center gap-2 mb-6">
            {hasPermission(directorRole, "canManageSessions") && (
              <button onClick={() => setActiveTab("sessions")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border font-medium text-sm transition-all ${activeTab === "sessions" ? "border-red-500 text-red-400 bg-red-900/15" : "border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white"}`}>
                <CalendarPlus className="w-4 h-4" /> Sessions
              </button>
            )}
            {hasPermission(directorRole, "canRecordGames") && (
              <button onClick={() => setActiveTab("record")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border font-medium text-sm transition-all ${activeTab === "record" ? "border-red-500 text-red-400 bg-red-900/15" : "border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white"}`}>
                <Plus className="w-4 h-4" /> Record Game
              </button>
            )}
            {hasPermission(directorRole, "canApproveRequests") && (
              <button onClick={() => setActiveTab("requests")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border font-medium text-sm transition-all ${activeTab === "requests" ? "border-red-500 text-red-400 bg-red-900/15" : "border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white"}`}>
                <Mail className="w-4 h-4" /> Requests
                {inviteRequests.length > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">{inviteRequests.length}</span>
                )}
              </button>
            )}
            <button onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border font-medium text-sm transition-all ${activeTab === "history" ? "border-red-500 text-red-400 bg-red-900/15" : "border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white"}`}>
              <Trophy className="w-4 h-4" /> Games
            </button>
          </div>

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
                    {sessions.filter(s => s.is_open).sort((a, b) => {
                      if (a.location < b.location) return -1;
                      if (a.location > b.location) return 1;
                      // Within same location: Main Game before Turbo
                      const order = { "Main Game": 0, "Turbo": 1 };
                      return (order[a.game_type] ?? 0) - (order[b.game_type] ?? 0);
                    }).map(session => {
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
                            <div className="mt-2 border-t border-gray-800 pt-2 space-y-1">
                              {signedInIds.map((pid, i) => (
                                <div key={pid} className="flex items-center justify-between text-xs p-2 hover:bg-gray-800/40 rounded transition-colors">
                                  <div className="flex items-center gap-2 flex-1 text-gray-300 min-w-0">
                                    <span className="text-gray-500 shrink-0 w-6 text-right">{i + 1}.</span>
                                    <span className="truncate">{nameById(pid)}</span>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      const updatedIds = signedInIds.filter(id => id !== pid);
                                      const updatedEmails = (session.signed_in_players || []).filter((_, idx) => signedInIds[idx] !== pid);
                                      await base44.entities.GameSession.update(session.id, {
                                        signed_in_player_ids: updatedIds,
                                        signed_in_players: updatedEmails
                                      });
                                      setSessions(prev => prev.map(s => s.id === session.id
                                        ? { ...s, signed_in_player_ids: updatedIds, signed_in_players: updatedEmails }
                                        : s));
                                    }}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded px-1.5 py-0.5 ml-2 shrink-0">
                                    ✕
                                  </button>
                                </div>
                              ))}
                              {signedInIds.length > 20 && (
                                <p className="text-xs text-gray-600 pt-1">Total: {signedInIds.length} players</p>
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
                {games.map(game => {
                  const isExpanded = expandedGameId === game.id;
                  const placementIds = game.player_ids || [];
                  return (
                    <div key={game.id} className="bg-gray-900/60 rounded-xl border border-gray-800 overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/40 transition-colors"
                        onClick={() => setExpandedGameId(isExpanded ? null : game.id)}
                      >
                        <div>
                          <div className="font-medium text-white">{game.game_type}</div>
                          <div className="text-sm text-gray-400">
                            {game.game_date ? new Date(game.game_date + 'T12:00:00').toLocaleDateString() : ''} {game.location && `· ${game.location}`}
                          </div>
                          <div className="text-sm text-red-400 mt-1">Winner: {resolveGameWinner(game)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                          {directorRole === "Head Director" && (
                            <>
                              <Button size="icon" variant="ghost"
                                className="border border-gray-600 text-gray-400 hover:bg-gray-700/40 rounded-lg"
                                onClick={e => { e.stopPropagation(); setEditingGame(game); }}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost"
                                className="border border-red-500 text-red-400 hover:bg-red-600/20 rounded-lg"
                                onClick={e => { e.stopPropagation(); handleDeleteGame(game.id); }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-800 pt-3">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Placements</p>
                          {placementIds.length > 0 ? (
                            <div className="space-y-1">
                              {placementIds.map((pid, i) => (
                                <div key={pid} className="flex items-center gap-3 text-sm">
                                  <span className="text-gray-500 w-6 text-right shrink-0">{i + 1}.</span>
                                  <span className={i === 0 ? 'text-yellow-400 font-semibold' : 'text-gray-300'}>
                                    {nameById(pid)}
                                  </span>
                                  <span className="text-gray-600 text-xs ml-auto">{POINTS[i] ? `${POINTS[i]} pts` : ''}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-600 text-sm">No placement data recorded.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {games.length === 0 && <p className="text-gray-500 text-center py-4">No games recorded yet.</p>}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>

    {showWinnerPhotoModal && (
      <WinnerPhotoReminderModal
        onClose={() => setShowWinnerPhotoModal(false)}
        onTakePhoto={() => setShowWinnerPhotoModal(false)}
      />
    )}

    {editingGame && directorRole === "Head Director" && (
      <EditGameModal
        game={editingGame}
        playersById={playersById}
        onClose={() => setEditingGame(null)}
        onSaved={(updatedGame) => {
          setGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g));
          setEditingGame(null);
        }}
      />
    )}
    </>
  );
}