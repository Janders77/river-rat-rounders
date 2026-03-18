import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Users, Loader2, LogIn, MapPin, ChevronDown, ChevronRight, X } from "lucide-react";
import { getPlayerByEmail, getPlayerDisplayName, getEffectiveSignedInIds, buildPlayersById } from "@/utils/playerUtils";

const CARD = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const PRIMARY_CARD = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.20)",
};

// Portal dropdown rendered at body level to escape any overflow-hidden parents
function PortalDropdown({ anchorRef, children, onClose }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
  }, [anchorRef]);

  useEffect(() => {
    const handleClick = (e) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [anchorRef, onClose]);

  if (!pos) return null;

  return ReactDOM.createPortal(
    <div style={{
      position: "absolute", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999,
      maxHeight: "320px", overflowY: "auto", background: "#111827",
      border: "1px solid #374151", borderRadius: "0 0 12px 12px",
      boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
    }}>
      {children}
    </div>,
    document.body
  );
}

function SessionRow({ session, playersById, getSignedInIds, isSignedIn, signingIn, handleSignIn, handleRemovePlayer, isDirector }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const signedInIds = getSignedInIds(session);
  const signed = isSignedIn(session);
  const loading = signingIn === session.id;

  return (
    <div
      className={`rounded-xl overflow-hidden transition-all ${!signed && !loading ? "cursor-pointer" : ""}`}
      style={signed ? { background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.18)" } : CARD}
      onClick={!signed && !loading ? () => handleSignIn(session) : undefined}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="w-10 h-10 flex items-center justify-center rounded-lg shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
          {loading ? <Loader2 className="w-5 h-5 text-white/80 animate-spin" /> : signed ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <MapPin className="w-5 h-5 text-white/80" />}
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className={`font-medium text-sm leading-tight ${signed ? "text-green-400" : "text-white"}`}>
            {signed ? "You're signed in!" : session.location}
          </span>
          <span className="text-xs text-white/40 mt-0.5 truncate">
            {signed ? session.location + " · " : ""}
            {new Date(session.session_date + 'T12:00:00').toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            {session.game_type && ` · ${session.game_type}`}
          </span>
        </div>

        {/* Player count + chevron */}
        <div className="flex items-center gap-1.5 shrink-0" ref={anchorRef}>
          {signedInIds.length > 0 && (
            <button
              className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
              onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
            >
              <Users className="w-3 h-3" />
              <span>{signedInIds.length}</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>
          )}
          {!signed && !loading && <ChevronRight className="w-4 h-4 text-white/20" />}
        </div>
      </div>

      {open && signedInIds.length > 0 && (
        <PortalDropdown anchorRef={anchorRef} onClose={() => setOpen(false)}>
          {signedInIds.map((pid, index) => (
            <div key={pid} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 border-b border-gray-800/60 last:border-0 hover:bg-gray-800/40">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              <span className="truncate flex-1">{index + 1}. {getPlayerDisplayName(playersById[pid])}</span>
              {isDirector && (
                <button onClick={e => { e.stopPropagation(); handleRemovePlayer(session, pid); }}
                  className="shrink-0 text-gray-600 hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </PortalDropdown>
      )}
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

      const sorted = [...fetchedSessions].sort((a, b) => {
        if (a.location < b.location) return -1;
        if (a.location > b.location) return 1;
        const order = { "Main Game": 0, "Turbo": 1 };
        return (order[a.game_type] ?? 0) - (order[b.game_type] ?? 0);
      });
      setSessions(sorted);

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
            })).catch(() => {});
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
      if (session.game_type === "Main Game") {
        setSessions(prev => {
          const turbo = prev.find(s => s.is_open && s.game_type === "Turbo" && s.location === session.location);
          if (turbo) {
            const turboIds = getEffectiveSignedInIds(turbo, allPlayers);
            if (!turboIds.includes(me.id)) {
              base44.entities.GameSession.update(turbo.id, {
                signed_in_player_ids: [...turboIds, me.id],
                signed_in_players: [...(turbo.signed_in_players || []), me.email],
              });
            }
          }
          return prev;
        });
      }
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
      <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl" style={PRIMARY_CARD}>
        <div className="w-10 h-10 flex items-center justify-center rounded-lg shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
          <Loader2 className="w-5 h-5 text-white/80 animate-spin" />
        </div>
        <div className="flex flex-col">
          <span className="text-white font-semibold text-sm">Sign In to Today's Game</span>
          <span className="text-xs text-white/40 mt-0.5">Loading sessions...</span>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl" style={PRIMARY_CARD}>
        <div className="w-10 h-10 flex items-center justify-center rounded-lg shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
          <LogIn className="w-5 h-5 text-white/80" />
        </div>
        <div className="flex flex-col">
          <span className="text-white font-semibold text-sm">Sign In to Today's Game</span>
          <span className="text-xs text-white/40 mt-0.5">No open sessions right now. Check back later.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Section label */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={PRIMARY_CARD}>
        <div className="w-10 h-10 flex items-center justify-center rounded-lg shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
          <LogIn className="w-5 h-5 text-white/80" />
        </div>
        <div className="flex flex-col">
          <span className="text-white font-semibold text-sm">Sign In to Tonight's Game</span>
          <span className="text-xs text-white/40 mt-0.5">{sessions.length} open session{sessions.length !== 1 ? "s" : ""} available</span>
        </div>
      </div>
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
    </div>
  );
}