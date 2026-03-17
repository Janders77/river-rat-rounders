import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Users, Loader2, LogIn, MapPin, Calendar, ChevronDown, X } from "lucide-react";
import { getPlayerByEmail, getPlayerDisplayName, getEffectiveSignedInIds, buildPlayersById } from "@/utils/playerUtils";

// Portal dropdown rendered at body level to escape any overflow-hidden parents
function PortalDropdown({ anchorRef, children, onClose }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, [anchorRef]);

  useEffect(() => {
    const handleClick = (e) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [anchorRef, onClose]);

  if (!pos) return null;

  return ReactDOM.createPortal(
    <div
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 9999,
        maxHeight: "320px",
        overflowY: "auto",
        background: "#111827",
        border: "1px solid #374151",
        borderRadius: "0 0 12px 12px",
        boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
      }}
    >
      {children}
    </div>,
    document.body
  );
}

function SessionRow({ session, playersById, getSignedInIds, isSignedIn, signingIn, handleSignIn, handleRemovePlayer, isDirector }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const signedInIds = getSignedInIds(session);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-800/60">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <MapPin className="w-4 h-4 text-red-400 shrink-0" />
            <span>{session.location}</span>
          </div>
          <Badge className="bg-red-700/30 text-red-300 border-red-700/50 text-sm font-bold tracking-widest shrink-0 animate-pulse px-3 py-1" style={{ boxShadow: "0 0 8px rgba(220,38,38,0.6), 0 0 16px rgba(220,38,38,0.3)" }}>OPEN</Badge>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-400">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(session.session_date + 'T12:00:00').toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
          {session.game_type && <><span className="text-gray-600">·</span><span className="text-gray-500">{session.game_type}</span></>}
        </div>
      </div>

      {/* Player count toggle — anchor for the portal dropdown */}
      <div ref={anchorRef}>
        <button
          className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800/40 transition-colors"
          onClick={() => setOpen(o => !o)}
        >
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {signedInIds.length} player{signedInIds.length !== 1 ? "s" : ""} signed in
          </span>
          {signedInIds.length > 0 && (
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          )}
        </button>

        {open && signedInIds.length > 0 && (
          <PortalDropdown anchorRef={anchorRef} onClose={() => setOpen(false)}>
            {signedInIds.map((pid, index) => (
              <div key={pid} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 border-b border-gray-800/60 last:border-0 hover:bg-gray-800/40">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <span className="truncate flex-1">{index + 1}. {getPlayerDisplayName(playersById[pid])}</span>
                {isDirector && (
                  <button onClick={() => handleRemovePlayer(session, pid)}
                    className="shrink-0 text-gray-600 hover:text-red-400 transition-colors" title="Remove player">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </PortalDropdown>
        )}
      </div>

      {/* Sign in button */}
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
  );
}

export default function PlayerSignIn() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(null);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [isDirector, setIsDirector] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const playerEmail = localStorage.getItem("playerEmail");

      const [fetchedSessions, meArr, directorCheck] = await Promise.all([
        base44.entities.GameSession.filter({ is_open: true }, "session_date", 10),
        playerEmail ? base44.entities.Player.filter({ email: playerEmail.trim().toLowerCase() }).catch(() => []) : Promise.resolve([]),
        playerEmail ? base44.entities.Director.filter({ email: playerEmail.trim().toLowerCase() }).catch(() => []) : Promise.resolve([]),
      ]);

      const me = meArr[0] || null;
      setCurrentPlayerId(me?.id || null);
      setIsDirector(directorCheck.length > 0);
      setSessions(fetchedSessions);

      const allIds = [...new Set(fetchedSessions.flatMap(s => s.signed_in_player_ids || []))];
      if (me && !allIds.includes(me.id)) allIds.push(me.id);
      if (allIds.length > 0) {
        const fetched = await base44.entities.Player.filter({ id: { $in: allIds } }, null, allIds.length).catch(() => []);
        setAllPlayers(fetched);
      } else if (me) {
        setAllPlayers([me]);
      }

      setIsLoading(false);
    }

    loadData();

    const unsubscribe = base44.entities.GameSession.subscribe(async (event) => {
      setSessions(prev => {
        if (event.type === 'create') return [...prev, event.data].filter(s => s.is_open);
        if (event.type === 'update') {
          if (!event.data.is_open) return prev.filter(s => s.id !== event.id);
          return prev.map(s => s.id === event.id ? event.data : s);
        }
        if (event.type === 'delete') return prev.filter(s => s.id !== event.id);
        return prev;
      });
      if ((event.type === 'create' || event.type === 'update') && event.data?.signed_in_player_ids?.length > 0) {
        setAllPlayers(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const missing = event.data.signed_in_player_ids.filter(id => !existingIds.has(id));
          if (missing.length === 0) return prev;
          base44.entities.Player.filter({ id: { $in: missing } }, null, missing.length)
            .then(fetched => setAllPlayers(cur => {
              const map = new Map(cur.map(p => [p.id, p]));
              fetched.forEach(p => map.set(p.id, p));
              return Array.from(map.values());
            }))
            .catch(() => {});
          return prev;
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const playersById = useMemo(() => buildPlayersById(allPlayers), [allPlayers]);
  const getSignedInIds = (session) => getEffectiveSignedInIds(session, allPlayers);

  const handleSignIn = async (session) => {
    const playerEmail = localStorage.getItem("playerEmail");
    if (!playerEmail) { base44.auth.redirectToLogin(); return; }
    const me = getPlayerByEmail(allPlayers, playerEmail);
    if (!me) return;
    setSigningIn(session.id);
    const currentIds = getSignedInIds(session);
    if (!currentIds.includes(me.id)) {
      await base44.entities.GameSession.update(session.id, {
        signed_in_player_ids: [...currentIds, me.id],
        signed_in_players: [...(session.signed_in_players || []), me.email],
      });
    }
    setSigningIn(null);
  };

  const isSignedIn = (session) => currentPlayerId && getSignedInIds(session).includes(currentPlayerId);

  const handleRemovePlayer = async (session, pidToRemove) => {
    const currentIds = getSignedInIds(session);
    const player = playersById[pidToRemove];
    await base44.entities.GameSession.update(session.id, {
      signed_in_player_ids: currentIds.filter(id => id !== pidToRemove),
      signed_in_players: (session.signed_in_players || []).filter(e => e !== player?.email),
    });
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
          <SessionRow
            key={session.id}
            session={session}
            playersById={playersById}
            getSignedInIds={getSignedInIds}
            isSignedIn={isSignedIn}
            signingIn={signingIn}
            handleSignIn={handleSignIn}
            handleRemovePlayer={handleRemovePlayer}
            isDirector={isDirector}
          />
        ))}
      </CardContent>
    </Card>
  );
}