import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Users, Loader2, LogIn, MapPin, Calendar, ChevronDown, ChevronUp } from "lucide-react";

export default function PlayerSignIn() {
  const [sessions, setSessions] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(null);
  const [selectedSession, setSelectedSession] = useState("");
  const [expandedSession, setExpandedSession] = useState(null);

  useEffect(() => {
    async function loadData() {
      await loadSessions();
      await loadPlayers();
    }

    loadData();

    const unsubscribe = base44.entities.GameSession.subscribe((event) => {
      setSessions(prev => {
        if (event.type === 'create') return [...prev, event.data].filter(s => s.is_open);
        if (event.type === 'update') {
          if (!event.data.is_open) return prev.filter(s => s.id !== event.id);
          return prev.map(s => s.id === event.id ? event.data : s);
        }
        if (event.type === 'delete') return prev.filter(s => s.id !== event.id);
        return prev;
      });
    });

    return () => unsubscribe();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    const playerEmail = localStorage.getItem("playerEmail");
    const fetchedSessions = await base44.entities.GameSession.filter({ is_open: true }, "-session_date", 10);
    setCurrentUser(playerEmail ? { email: playerEmail } : null);
    setSessions(fetchedSessions);
    setIsLoading(false);
    return fetchedSessions;
  };

  const loadPlayers = async () => {
    const currentSessions = await base44.entities.GameSession.filter({ is_open: true }, "-session_date", 10);
    const allEmails = [...new Set(currentSessions.flatMap(s => s.signed_in_players || []))];
    const playerResults = await Promise.all(
      allEmails.map(email => base44.entities.Player.filter({ email }, "-created_date", 1).catch(() => []))
    );
    setAllPlayers(playerResults.flat());
  };

  const handleSignIn = async (session) => {
    const playerEmail = localStorage.getItem("playerEmail");
    if (!playerEmail) {
      base44.auth.redirectToLogin();
      return;
    }
    setSigningIn(session.id);
    const alreadySigned = session.signed_in_players?.includes(playerEmail);
    if (!alreadySigned) {
      const updated = [...(session.signed_in_players || []), playerEmail];
      await base44.entities.GameSession.update(session.id, { signed_in_players: updated });
    }
    await loadSessions();
    await loadPlayers();
    setSigningIn(null);
  };

  const isSignedIn = (session) =>
    currentUser && session.signed_in_players?.includes(currentUser.email);

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
          <CardTitle className="text-white flex items-center gap-2">
            <LogIn className="w-5 h-5 text-red-400" /> Sign In to Today's Game
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
        <CardTitle className="text-white flex items-center gap-2">
          <LogIn className="w-5 h-5 text-red-400" /> Sign In to Tonight's Game
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {sessions.map((session) => (
          <div key={session.id} className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
            {/* Session Info */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-800/60">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-white font-semibold text-base">
                  <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{session.location}</span>
                </div>
                <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-xs shrink-0">
                  Open
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(session.session_date + 'T12:00:00').toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
                {session.game_type && (
                  <span className="text-gray-600">·</span>
                )}
                {session.game_type && <span className="text-gray-500">{session.game_type}</span>}
              </div>
            </div>

            {/* Players count + expand */}
            <button
              className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800/40 transition-colors"
              onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
            >
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {session.signed_in_players?.length || 0} player{session.signed_in_players?.length !== 1 ? "s" : ""} signed in
              </span>
              {session.signed_in_players?.length > 0 && (
                expandedSession === session.id
                  ? <ChevronUp className="w-3.5 h-3.5" />
                  : <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Expanded player list */}
            {expandedSession === session.id && session.signed_in_players?.length > 0 && (
              <div className="px-4 pb-3 flex flex-col gap-1.5">
                {session.signed_in_players.map((email, index) => {
                  const player = allPlayers.find(p => p.email?.toLowerCase() === email?.toLowerCase());
                  const name = player
                    ? `${player.first_name || ""} ${player.last_name || ""}`.trim() || "Unknown Player"
                    : "Unknown Player";
                  return (
                    <div key={email} className="flex items-center gap-2 text-sm text-gray-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      <span className="truncate">{index + 1}. {name}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sign In / Signed In */}
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
                  {signingIn === session.id ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                  ) : (
                    <><LogIn className="w-4 h-4 mr-2" /> Sign In</>
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}