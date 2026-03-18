import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, History, UserPlus, CalendarDays, ChevronRight } from "lucide-react";

import PlayerSignIn from "../components/home/PlayerSignIn";
import PlayerSignUp from "../components/home/PlayerSignUp";
import LoginCard from "../components/home/LoginCard";

const BG = { background: "linear-gradient(170deg, #14141c 0%, #1a1a26 60%, #14141c 100%)" };
const GLOW = { background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.09), transparent 60%)" };

const NAV_ITEMS = [
  { title: "Leaderboard",    desc: "Season rankings & stats",   icon: Trophy,       url: createPageUrl("Leaderboard") },
  { title: "Game History",   desc: "Browse all past sessions",  icon: History,      url: createPageUrl("GameHistory") },
  { title: "Calendar",       desc: "Upcoming events & games",   icon: CalendarDays, url: createPageUrl("LeagueCalendar") },
  { title: "Join the League",desc: "Pay dues · enter the action",icon: UserPlus,    url: createPageUrl("JoinTheLeague") },
];

function NavTile({ icon: Icon, title, desc, url }) {
  return (
    <Link
      to={url}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 group"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.11)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.2)" }}
      >
        <Icon className="w-3.5 h-3.5 text-red-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold text-sm leading-tight">{title}</div>
        <div className="text-gray-600 text-xs mt-0.5 truncate">{desc}</div>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-gray-700 shrink-0 group-hover:text-gray-500 transition-colors" />
    </Link>
  );
}

function Brand({ compact = false }) {
  return (
    <div className={`flex flex-col items-center ${compact ? "pt-2 pb-0" : "pt-4 pb-2"}`}>
      <img
        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/8de2d69e1_ChatGPTImageMar2202603_07_22PM.png"
        alt="River Rat Rounders"
        className={`object-contain ${compact ? "w-36" : "w-44"}`}
      />
      {!compact && (
        <p className="text-gray-600 text-xs tracking-wide mt-1">Memphis' Freeroll Bar Poker League</p>
      )}
    </div>
  );
}

export default function Home() {
  const [loggedInPlayer, setLoggedInPlayer] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const storedEmail = localStorage.getItem("playerEmail");
    setLoggedInPlayer(storedEmail || null);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={BG}>
        <div className="w-4 h-4 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin" />
      </div>
    );
  }

  /* ── LOGGED IN ─────────────────────────────────── */
  if (loggedInPlayer) {
    return (
      <div className="min-h-screen relative" style={BG}>
        <div className="absolute inset-0 pointer-events-none" style={GLOW} />
        <div className="relative max-w-md mx-auto px-4 pt-5 pb-10 flex flex-col gap-4">

          <Brand compact />

          {/* Primary action */}
          <PlayerSignIn />

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
            <span className="text-gray-700 text-[10px] uppercase tracking-widest font-semibold">Explore</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
          </div>

          {/* Secondary nav */}
          <div className="flex flex-col gap-1.5">
            {NAV_ITEMS.map(item => (
              <NavTile key={item.title} {...item} />
            ))}
          </div>

          <PlayerSignUp />
        </div>
      </div>
    );
  }

  /* ── LOGGED OUT ────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative px-4" style={BG}>
      <div className="absolute inset-0 pointer-events-none" style={GLOW} />
      <div className="relative w-full max-w-sm flex flex-col gap-5">
        <Brand />
        <LoginCard onLoginSuccess={() => {
          const email = localStorage.getItem("playerEmail");
          setLoggedInPlayer(email || null);
        }} />
      </div>
    </div>
  );
}