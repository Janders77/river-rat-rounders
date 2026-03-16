import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Users, Loader2, LogIn, MapPin, Calendar, ChevronDown, ChevronUp, X } from "lucide-react";
import { usePlayerNameCache } from "./usePlayerNameCache";

export default function PlayerSignIn() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isDirector, setIsDirector] = useState(false);

  const [allPlayers, setAllPlayers] = useState([]);
  const { normalizeEmail, ensurePlayerName, getPlayerName } = usePlayerNameCache(allPlayers);
  const normalize = normalizeEmail;

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const playerEmail = localStorage.getItem("playerEmail");
      setCurrentUser(playerEmail ? { email: normalizeEmail(playerEmail) } : null);

      // Check if current player is a director
      if (playerEmail) {
        const directorCheck = await base44.entities.Director.filter({ email: playerEmail.trim().toLowerCase() }).catch(() => []);
        setIsDirector(directorCheck.length > 0);
      }

      // Load all players to seed cache
      const players = await base44.entities.Player.filter({}, "-created_date", 500).catch(() => []);
      setAllPlayers(players);

      const fetchedSessions = await base44.entities.GameSession.filter({ is_open: true }, "-session_date", 10);
      setSessions(fetchedSessions);
      setIsLoading(false);

      // Ensure names for any signed-in emails not in cache
      const allEmails = [...new Set(fetchedSessions.flatMap(s => s.signed_in_players || []))];
      allEmails.forEach(email => ensurePlayerName(email));
    }

    loadData();

    const unsubscribe = base44.entities.GameSession.subscribe(async (event) => {
      setSessions(prev => {
        let updated;
        if (event.type === 'create') updated = [...prev, event.data].filter(s => s.is_open);
        else if (event.type === 'update') {
          if (!event.data.is_open) updated = prev.filter(s => s.id !== event.id);
          else updated = prev.map(s => s.id === event.id ? event.data : s);
        } else if (event.type === 'delete') updated = prev.filter(s => s.id !== event.id);
        else updated = prev;

        const allEmails = [...new Set(updated.flatMap(s => s.signed_in_players || []))];
        allEmails.forEach(email => ensurePlayerName(email));
        return updated;
      });
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async (session) => {
    const playerEmail = localStorage.getItem("playerEmail");
    if (!playerEmail) { base44.auth.redirectToLogin(); return; }
    setSigningIn(session.id);
    const normalEmail = normalize(playerEmail);
    const alreadySigned = session.signed_in_players?.map(normalize).includes(normalEmail);
    if (!alreadySigned) {
      const updated = [...(session.signed_in_players || []), playerEmail.trim()];
      await base44.entities.GameSession.update(session.id, { signed_in_players: updated });
    }
    setSigningIn(null);
  };

  const isSignedIn = (session) =>
    currentUser && session.signed_in_players?.map(normalize).includes(currentUser.email);

  const handleRemovePlayer = async (session, emailToRemove) => {
    const updated = (session.signed_in_players || []).filter(e => normalize(e) !== normalize(emailToRemove));
    await base44.entities.GameSession.update(session.id, { signed_in_players: updated });
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-red-900/20 to-red-950/60 border-red-900/40">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-red-400" />
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="bg-gradient-to-r from-red-900/20 to-red-950/60 border-red-900/40">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-900/60 rounded-lg flex items-center justify-center shrink-0">
              <LogIn className="w-6 h-6 text-red-400" />
            </div>
            Sign In to Today's Game
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">No open sessions right now. Check back later!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-red-900/20 to-red-950/60 border-red-900/40">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-900/60 rounded-lg flex items-center justify-center shrink-0">
            <LogIn className="w-6 h-6 text-red-400" />
          </div>
          Sign In to Tonight's Game
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {sessions.map((session) => (
          <div key={session.id} className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-gray-800/60">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-white font-semibold text-base">
                  <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{session.location}</span>
                </div>
                <Badge className="bg-red-700/30 text-red-300 border-red-700/50 text-xs shrink-0 animate-pulse" style={{boxShadow: "0 0 8px rgba(220,38,38,0.6), 0 0 16px rgba(220,38,38,0.3)"}}>Open</Badge>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(session.session_date + 'T12:00:00').toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
                {session.game_type && <><span className="text-gray-600">·</span><span className="text-gray-500">{session.game_type}</span></>}
              </div>
            </div>

            <button
              className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800/40 transition-colors"
              onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
            >
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {session.signed_in_players?.length || 0} player{session.signed_in_players?.length !== 1 ? "s" : ""} signed in
              </span>
              {session.signed_in_players?.length > 0 && (
                expandedSession === session.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {expandedSession === session.id && session.signed_in_players?.length > 0 && (
              <div className="px-4 pb-3 flex flex-col gap-1.5">
                {session.signed_in_players.map((email, index) => (
                  <div key={email} className="flex items-center gap-2 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    <span className="truncate flex-1">{index + 1}. {getPlayerName(email)}</span>
                    {isDirector && (
                      <button
                        onClick={() => handleRemovePlayer(session, email)}
                        className="shrink-0 text-gray-600 hover:text-red-400 transition-colors"
                        title="Remove player"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="px-4 pb-4">
              {isSignedIn(session) ? (
                <div className="flex items-center justify-center gap-2 text-green-400 font-medium text-sm py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                  You're signed in!
                </div>
              ) : (
                <Button
                  onClick={() => handleSignIn(session)}
                  disabled={signingIn === session.id}
                  className="w-full bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white shadow-lg shadow-red-900/40 transition-all duration-200"
                >
                  {signingIn === session.id
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                    : <><LogIn className="w-4 h-4 mr-2" /> Sign In</>}
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}