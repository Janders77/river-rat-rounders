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
import LiveStatusIndicator from "@/components/LiveStatusIndicator";
import { getPlayerById, getPlayerByEmail, getPlayerDisplayName, getEffectiveSignedInIds, getEffectiveHandOfWeekIds, buildPlayersById, getPlayerNameById } from "@/utils/playerUtils";
import { searchPlayers } from "@/functions/searchPlayers";
import { externalApi } from "@/functions/externalApi";
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

    // Push to external API: create game → submit results → finalize
    try {
      const extGame = await externalApi({ action: "createGame", params: { location: gameData.location } });
      if (extGame?.id) {
        const POINTS_MAP = [1000, 750, 600, 500, 400, 300, 200, 100, 50];
        for (let i = 0; i < filledIds.length; i++) {
          const pid = filledIds[i];
          const playerRec = playersById[pid];
          const extPlayerId = playerRec?.player_number;
          if (extPlayerId) {
            await externalApi({ action: "createResult", params: { game_id: extGame.id, player_id: extPlayerId, points: POINTS_MAP[i] || 0 } });
          }
        }
        await externalApi({ action: "finalizeGame", params: { game_id: extGame.id } });
      }
    } catch (extErr) {
      console.warn("External API sync failed (non-blocking):", extErr);
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
    
    // Handle card guard removal from winner
    if (game.winner_player_id && playersById[game.winner_player_id]) {
      const winner = playersById[game.winner_player_id];
      // Decrement card guard count
      const newCardGuards = Math.max(0, (winner.card_guards || 0) - 1);
      await base44.entities.Player.update(winner.id, {
        card_guards: newCardGuards,
      });
      // Update local state
      setPlayers(prev => prev.map(p => p.id === winner.id ? { ...p, card_guards: newCardGuards } : p));
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

  const CARD = "w-full rounded-xl border border-white/10 bg-white/5 p-3 flex flex-col gap-3";
  const CARD_HEADER = "flex items-center gap-3";
  const ICON_BOX = "w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0";
  const tabBtn = (tab) =>
    `flex-1 rounded-lg border py-2 text-sm text-center transition-all ${
      activeTab === tab
        ? "border-white/20 bg-white/10 text-white font-semibold"
        : "border-white/10 bg-white/5 text-white/50 hover:text-white/80"
    }`;

  return (
    <>
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: "linear-gradient(170deg, #14141c 0%, #1a1a26 60%, #14141c 100%)" }}>
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08), transparent 70%)" }} />

      <div className="relative max-w-md mx-auto w-full px-4 pt-5 pb-10 flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className={ICON_BOX}>
              <ShieldAlert className="w-5 h-5 text-white/80" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">Director Dashboard</h1>
              <p className="text-[10px] text-white/30 mt-0.5 leading-none">Tournament Directors only</p>
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex items-center gap-1.5">
          {hasPermission(directorRole, "canManageSessions") && (
            <button onClick={() => setActiveTab("sessions")} className={tabBtn("sessions")}>
              Sessions
            </button>
          )}
          {hasPermission(directorRole, "canRecordGames") && (
            <button onClick={() => setActiveTab("record")} className={tabBtn("record")}>
              Record
            </button>
          )}
          {hasPermission(directorRole, "canApproveRequests") && (
            <button onClick={() => setActiveTab("requests")} className={`${tabBtn("requests")} relative`}>
              Requests
              {inviteRequests.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 leading-none">{inviteRequests.length}</span>
              )}
            </button>
          )}
          <button onClick={() => setActiveTab("history")} className={tabBtn("history")}>
            Games
          </button>
        </div>

        {/* ── SESSIONS TAB ── */}
        {activeTab === "sessions" && hasPermission(directorRole, "canManageSessions") && (
          <div className="flex flex-col gap-3">

            {/* Open Games */}
            <div className={CARD}>
              <div className={CARD_HEADER}>
                <div className={ICON_BOX}><CalendarPlus className="w-5 h-5 text-white/80" /></div>
                <span className="text-white font-medium">Open Games</span>
              </div>

              {sessions.filter(s => s.is_open).length === 0 ? (
              <div className="flex flex-col items-center py-4 gap-1">
                <CalendarPlus className="w-5 h-5 text-white/15" />
                <p className="text-white/50 text-sm">No open games</p>
                <p className="text-white/25 text-xs">Start a new game below</p>
              </div>
              ) : (
              <div className="flex flex-col gap-2">
                {sessions.filter(s => s.is_open).sort((a, b) => {
                  if (a.location < b.location) return -1;
                  if (a.location > b.location) return 1;
                  const order = { "Main Game": 0, "Turbo": 1 };
                  return (order[a.game_type] ?? 0) - (order[b.game_type] ?? 0);
                }).map(session => {
                  const signedInIds = getEffectiveSignedInIds(session, players);
                  const handIds = getEffectiveHandOfWeekIds(session, players);
                  const isExpanded = !!expandedSessions[session.id];
                  const isHotwExpanded = !!expandedSessions[`hotw_${session.id}`];
                  return (
                    <div key={session.id} className="rounded-xl border border-white/10 bg-white/5 p-3 flex flex-col gap-3">
                      {/* Top: LIVE badge + location + delete button */}
                       <div className="flex items-center justify-between gap-2">
                         <div className="flex items-center gap-2 flex-1 min-w-0">
                             <LiveStatusIndicator />
                             <span className="font-medium text-white text-sm truncate">{session.location}</span>
                           </div>
                        <button onClick={() => handleDeleteSession(session.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 transition-colors shrink-0"
                          style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Metadata row */}
                      <div className="text-xs text-white/40">
                        {session.session_date ? new Date(session.session_date + 'T12:00:00').toLocaleDateString("en-US", {month: "short", day: "numeric"}) : ''} · {session.game_type}
                      </div>

                      {/* Primary actions grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className="text-xs px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/8 transition-colors text-center"
                          onClick={() => { setTimeout(() => document.getElementById('dir-sign-in-search')?.focus(), 50); }}>
                          + Add Player
                        </button>
                        <button
                          className="text-xs px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/8 transition-colors text-center"
                          onClick={() => setActiveTab("record")}>
                          Record Game
                        </button>
                        <button
                          className={`text-xs px-3 py-2 rounded-lg border transition-colors text-center ${isHotwExpanded ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/8'}`}
                          onClick={() => setExpandedSessions(prev => ({ ...prev, [`hotw_${session.id}`]: !prev[`hotw_${session.id}`] }))}>
                          🃏 Hand of Week
                        </button>
                        <button
                          className="text-xs px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/5 text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-colors text-center"
                          onClick={() => handleToggleSession(session)}>
                          {session.is_open ? "End Game" : "Reopen"}
                        </button>
                      </div>

                        {/* Players Signed In section */}
                        <button
                          className="w-full flex items-center justify-between px-0 py-2.5 border-t border-white/10 transition-colors hover:bg-white/[0.02]"
                          onClick={() => setExpandedSessions(prev => ({ ...prev, [session.id]: !prev[session.id] }))}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">Players signed in</span>
                            <span className="text-xs text-white/50">({signedInIds.length})</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-white/50 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        </button>

                        {isExpanded && (
                          <div className="flex flex-col divide-y" style={{ divideColor: "rgba(255,255,255,0.05)" }}>
                            {signedInIds.length === 0 ? (
                              <div className="py-2.5 text-sm text-white/60">No players signed in yet</div>
                            ) : signedInIds.map((pid, index) => {
                              const player = playersById[pid];
                              const hasProfilePic = player?.profile_picture;
                              return (
                                <div key={pid} className="flex items-center justify-between gap-3 py-2.5">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-7 h-7 rounded-full bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                      {hasProfilePic ? (
                                        <img src={player.profile_picture} alt={nameById(pid)} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-[11px] font-medium text-white/70">
                                          {(player?.first_name?.[0] || "").toUpperCase()}{(player?.last_name?.[0] || "").toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs font-medium text-white/50 shrink-0">{index + 1}.</span>
                                    <span className="text-sm text-white/85 truncate">{nameById(pid)}</span>
                                  </div>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const updatedIds = signedInIds.filter(id => id !== pid);
                                      const updatedEmails = (session.signed_in_players || []).filter((_, idx) => signedInIds[idx] !== pid);
                                      await base44.entities.GameSession.update(session.id, { signed_in_player_ids: updatedIds, signed_in_players: updatedEmails });
                                      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, signed_in_player_ids: updatedIds, signed_in_players: updatedEmails } : s));
                                    }}
                                    className="text-white/20 hover:text-red-400 transition-colors shrink-0">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {isHotwExpanded && (
                          <div className="border-t border-white/10 pt-2.5 flex flex-col gap-2">
                            <Select value="__none__" onValueChange={async (pid) => {
                              if (pid === "__none__" || handIds.includes(pid)) return;
                              const playerRecord = playersById[pid];
                              const user = users.find(u => u.email?.trim().toLowerCase() === playerRecord?.email?.trim().toLowerCase());
                              if (user) {
                                await base44.entities.User.update(user.id, { total_points: (user.total_points || 0) + 50 });
                                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, total_points: (u.total_points || 0) + 50 } : u));
                              }
                              const newIds = [...handIds, pid];
                              await GameSession.update(session.id, { hand_of_week_player_ids: newIds });
                              setSessions(prev => prev.map(s => s.id === session.id ? { ...s, hand_of_week_player_ids: newIds } : s));
                            }}>
                              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm h-9">
                                <SelectValue placeholder="Add player..." />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-900 border-gray-700">
                                <SelectItem value="__none__" disabled className="text-gray-500">Add player...</SelectItem>
                                {signedInSearchIndex.filter(e => !handIds.includes(e.id)).map(e => (
                                  <SelectItem key={e.id} value={e.id} className="text-white">{e.displayName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {handIds.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {handIds.map(pid => (
                                  <span key={pid} className="flex items-center gap-2 bg-white/5 border border-white/10 text-white/70 text-xs rounded-full px-2.5 py-1">
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
                                    }} className="hover:text-white">✕</button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Open a New Game */}
            <div className={CARD}>
              <div className={CARD_HEADER}>
                <div className={ICON_BOX}><Plus className="w-5 h-5 text-white/80" /></div>
                <span className="text-white font-medium">Open a New Game</span>
              </div>
              <form onSubmit={handleCreateSession} className="flex flex-col gap-3">
                {/* Date + Type row — stacked on mobile, 2-col on sm+ */}
                <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div className="flex flex-col gap-1 min-w-0 overflow-hidden">
                    <label className="text-[10px] text-white/40 uppercase tracking-wide">Date</label>
                    <input
                      type="date"
                      value={newSession.session_date}
                      onChange={e => setNewSession({...newSession, session_date: e.target.value})}
                      required
                      className="w-full h-9 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white [color-scheme:dark] outline-none"
                      style={{ boxSizing: "border-box", minWidth: 0 }}
                    />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0 overflow-hidden">
                    <label className="text-[10px] text-white/40 uppercase tracking-wide">Type</label>
                    <Select value={newSession.game_type || "__none__"} onValueChange={v => setNewSession({...newSession, game_type: v === "__none__" ? "" : v})}>
                      <SelectTrigger className="w-full h-9 bg-white/5 border-white/10 text-white rounded-lg text-sm" style={{ boxSizing: "border-box", minWidth: 0 }}>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700 text-white">
                        <SelectItem value="__none__" disabled className="text-gray-400">Select type</SelectItem>
                        {["Main Game","Turbo"].map(t => <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Location — full width */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-white/40 uppercase tracking-wide">Location</label>
                  <Select value={newSession.location || "__none__"} onValueChange={v => setNewSession({...newSession, location: v === "__none__" ? "" : v})}>
                    <SelectTrigger className="w-full h-9 bg-white/5 border-white/10 text-white rounded-lg text-sm" style={{ boxSizing: "border-box" }}>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-white">
                      <SelectItem value="__none__" disabled className="text-gray-400">Select location</SelectItem>
                      {["Tavern 018 Sunday","Tavern 018 Wednesday","East End Grill","Habana Club","Meddlesome"].map(loc =>
                        <SelectItem key={loc} value={loc} className="text-white">{loc}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <button type="submit" disabled={isCreatingSession || !newSession.location}
                  className="w-full h-9 rounded-lg border border-white/15 text-white text-sm font-medium transition-all disabled:opacity-40"
                  style={{ background: "rgba(255,255,255,0.07)", boxSizing: "border-box" }}>
                  {isCreatingSession ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Open Game"}
                </button>
              </form>
            </div>

            {/* Sign In Player */}
            <div className={CARD}>
              <div className={CARD_HEADER}>
                <div className={ICON_BOX}><Users className="w-5 h-5 text-white/80" /></div>
                <span className="text-white font-medium">Sign In Player</span>
              </div>
              <form onSubmit={handleDirectorSignInPlayer} className="flex flex-col gap-2">
                <div className="relative">
                  <input
                    id="dir-sign-in-search"
                    placeholder="Search player name or #..."
                    value={dirSignInSearch}
                    onChange={e => { setDirSignInSearch(e.target.value); if (dirSignInSelectedPlayer) setDirSignInSelectedPlayer(null); }}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none"
                    autoComplete="off"
                  />
                  {dirSignInSearchLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                    </div>
                  )}
                  {!dirSignInSelectedPlayer && !dirSignInSearchLoading && dirSignInSearch.trim().length >= 1 && dirSignInResults.length === 0 && (
                    <div className="absolute z-50 w-full mt-1 rounded-lg border border-white/10 bg-gray-900 p-3 text-white/40 text-sm text-center shadow-lg">
                      No players found
                    </div>
                  )}
                  {!dirSignInSelectedPlayer && dirSignInResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 rounded-lg border border-white/10 bg-gray-900 overflow-hidden max-h-48 overflow-y-auto shadow-lg">
                      {dirSignInResults.map(p => (
                        <button key={p.id} type="button"
                          className="w-full text-left px-3 py-2 hover:bg-white/5 text-sm text-white border-b border-white/5 last:border-0"
                          onMouseDown={() => { setDirSignInSelectedPlayer(p); setDirSignInSearch(p.display_name); setDirSignInResults([]); }}>
                          {p.display_name}{p.player_number != null ? ` (#${p.player_number})` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                  {dirSignInSelectedPlayer && (
                    <div className="mt-1 flex items-center justify-between text-sm px-1">
                      <span className="text-green-400 text-xs">✓ {dirSignInSelectedPlayer.display_name}</span>
                      <button type="button" onClick={() => { setDirSignInSelectedPlayer(null); setDirSignInSearch(""); setDirSignInResults([]); }} className="text-white/25 hover:text-red-400 ml-2">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <button type="submit" disabled={dirSignInStatus === "loading"}
                  className="w-full rounded-lg border border-white/15 py-2 text-white text-sm font-medium transition-all"
                  style={{ background: "rgba(255,255,255,0.07)" }}>
                  {dirSignInStatus === "loading" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Sign In Player"}
                </button>
                {dirSignInMessage && (
                  <p className={`text-xs text-center ${dirSignInStatus === "success" ? "text-green-400" : "text-red-400"}`}>
                    {dirSignInMessage}
                  </p>
                )}
              </form>
            </div>
          </div>
        )}

        {/* ── RECORD TAB ── */}
        {activeTab === "record" && hasPermission(directorRole, "canRecordGames") && (
          !sessions.find(s => s.is_open) ? (
            <div className={CARD}>
              <div className="flex flex-col items-center py-6 gap-1.5">
                <Trophy className="w-5 h-5 text-white/15" />
                <p className="text-white/50 text-sm">No open game session</p>
                <p className="text-white/25 text-xs">Open a game in the Sessions tab first</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRecordGame}>
              <div className={CARD}>
                <div className={CARD_HEADER}>
                  <div className={ICON_BOX}><Trophy className="w-5 h-5 text-white/80" /></div>
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm leading-tight truncate">
                      Record Game — {sessions.find(s => s.is_open)?.location}
                    </p>
                    <p className="text-white/35 text-xs mt-0.5">
                      {sessions.find(s => s.is_open)?.game_type} · {getEffectiveSignedInIds(sessions.find(s => s.is_open) || {}, players).length} signed in
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-white/40 uppercase tracking-wide">Game Date</label>
                  <input type="date" value={gameData.game_date}
                    onChange={e => setGameData({...gameData, game_date: e.target.value})}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white [color-scheme:dark] outline-none"
                    required />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-white/40 uppercase tracking-wide">Placements</label>
                  <p className="text-[10px] text-white/25">1st=1000pts · 2nd=750pts · … · 9th=50pts</p>
                  <div className="flex flex-col gap-1.5 mt-1">
                    {PLACE_LABELS.map((label, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-8 text-xs font-bold text-right shrink-0 text-white/40">{label}</div>
                        <div className="text-xs text-white/25 w-14 shrink-0">{POINTS[i]}pts</div>
                        <div className="relative flex-1">
                          <input
                            placeholder={`${label} place…`}
                            value={placements[i] ? nameById(placements[i]) : placementSearches[i]}
                            onChange={e => {
                              if (placements[i]) { const u = [...placements]; u[i] = ""; setPlacements(u); }
                              const u = [...placementSearches]; u[i] = e.target.value; setPlacementSearches(u);
                              const v = [...showPlacementSuggestions]; v[i] = true; setShowPlacementSuggestions(v);
                            }}
                            onFocus={() => { const u = [...showPlacementSuggestions]; u[i] = true; setShowPlacementSuggestions(u); }}
                            onBlur={() => setTimeout(() => { const u = [...showPlacementSuggestions]; u[i] = false; setShowPlacementSuggestions(u); }, 150)}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/20 outline-none"
                          />
                          {placements[i] && (
                            <button type="button" onClick={() => {
                              const u = [...placements]; u[i] = ""; setPlacements(u);
                              const s = [...placementSearches]; s[i] = ""; setPlacementSearches(s);
                            }} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/25 hover:text-white">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {showPlacementSuggestions[i] && !placements[i] && getPlacementSuggestions(i).length > 0 && (
                            <div className="absolute z-50 w-full mt-1 rounded-lg border border-white/10 bg-gray-900 overflow-hidden shadow-lg">
                              {getPlacementSuggestions(i).map(entry => (
                                <button key={entry.id} type="button"
                                  className="w-full text-left px-3 py-2 hover:bg-white/5 text-sm text-white border-b border-white/5 last:border-0"
                                  onMouseDown={() => {
                                    const u = [...placements];
                                    for (let j = 0; j < u.length; j++) { if (u[j] === entry.id) u[j] = ""; }
                                    u[i] = entry.id; setPlacements(u);
                                    const s = [...placementSearches]; s[i] = ""; setPlacementSearches(s);
                                    const v = [...showPlacementSuggestions]; v[i] = false; setShowPlacementSuggestions(v);
                                  }}>
                                  {entry.displayName}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-white/40 uppercase tracking-wide">Notes (optional)</label>
                  <textarea value={gameData.notes}
                    onChange={e => setGameData({...gameData, notes: e.target.value})}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none h-16 resize-none"
                    placeholder="Any notes…" />
                </div>

                <button type="submit" disabled={isSubmitting}
                  className="w-full rounded-lg border border-white/15 py-2 text-white text-sm font-semibold transition-all"
                  style={{ background: "rgba(255,255,255,0.07)" }}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Record Game"}
                </button>
              </div>
            </form>
          )
        )}

        {/* ── REQUESTS TAB ── */}
        {activeTab === "requests" && hasPermission(directorRole, "canApproveRequests") && (
          <div className={CARD}>
            <div className={CARD_HEADER}>
              <div className={ICON_BOX}><Mail className="w-5 h-5 text-white/80" /></div>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">Pending Requests</span>
                {inviteRequests.length > 0 && (
                  <span className="text-[10px] font-bold bg-red-600/80 text-white rounded-full px-1.5 py-0.5 leading-none">{inviteRequests.length}</span>
                )}
              </div>
            </div>
            {inviteRequests.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-1">
                <Mail className="w-5 h-5 text-white/15" />
                <p className="text-white/50 text-sm">No pending requests</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {inviteRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/3 px-3 py-2.5"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{req.first_name} {req.last_name}</p>
                      <p className="text-white/35 text-xs truncate">{req.email}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => handleApproveRequest(req)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/8 text-white font-medium transition-colors hover:bg-white/15"
                        style={{ background: "rgba(255,255,255,0.07)" }}>
                        Approve
                      </button>
                      <button onClick={() => handleDeclineRequest(req)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/3 text-white/50 transition-colors hover:text-white/80">
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── GAMES HISTORY TAB ── */}
        {activeTab === "history" && (
          <div className={CARD}>
            <div className={CARD_HEADER}>
              <div className={ICON_BOX}><Trophy className="w-5 h-5 text-white/80" /></div>
              <span className="text-white font-medium">Recent Games</span>
            </div>
            {games.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-1">
                <Trophy className="w-5 h-5 text-white/15" />
                <p className="text-white/50 text-sm">No games recorded yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {games.map(game => {
                  const isExpanded = expandedGameId === game.id;
                  const placementIds = game.player_ids || [];
                  return (
                    <div key={game.id} className="rounded-xl overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/3 transition-colors"
                        onClick={() => setExpandedGameId(isExpanded ? null : game.id)}>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{game.game_type} {game.location && `· ${game.location}`}</p>
                          <p className="text-white/35 text-xs">
                            {game.game_date ? new Date(game.game_date + 'T12:00:00').toLocaleDateString() : ''} · Winner: {resolveGameWinner(game)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                          {directorRole === "Head Director" && (
                            <>
                              <button
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-white/70 transition-colors"
                                style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                                onClick={() => setEditingGame(game)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-red-400 transition-colors"
                                style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                                onClick={() => handleDeleteGame(game.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <span className="text-white/20 text-xs" onClick={() => setExpandedGameId(isExpanded ? null : game.id)}>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </span>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-white/5 pt-2 flex flex-col gap-0.5">
                          {placementIds.length === 0 ? (
                            <p className="text-white/25 text-xs">No placement data.</p>
                          ) : placementIds.map((pid, i) => (
                            <div key={pid} className="flex items-center gap-2 text-xs">
                              <span className="text-white/25 w-5 text-right shrink-0">{i + 1}.</span>
                              <span className={i === 0 ? 'text-yellow-400 font-semibold' : 'text-white/60'}>{nameById(pid)}</span>
                              <span className="text-white/20 ml-auto">{POINTS[i] ? `${POINTS[i]}pts` : ''}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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