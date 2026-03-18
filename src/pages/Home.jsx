import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, History, UserPlus, CalendarDays, ChevronRight } from "lucide-react";

import PlayerSignIn from "../components/home/PlayerSignIn";
import PlayerSignUp from "../components/home/PlayerSignUp";
import LoginCard from "../components/home/LoginCard";

const BG = { background: "linear-gradient(170deg, #14141c 0%, #1a1a26 60%, #14141c 100%)" };
const GLOW = { background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.09), transparent 60%)" };

const CARD = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const NAV_ITEMS = [
  { title: "Leaderboard",     desc: "Season rankings & stats",    icon: Trophy,       url: createPageUrl("Leaderboard") },
  { title: "Game History",    desc: "Browse all past sessions",   icon: History,      url: createPageUrl("GameHistory") },
  { title: "Calendar",        desc: "Upcoming events & games",    icon: CalendarDays, url: createPageUrl("LeagueCalendar") },
  { title: "Join the League", desc: "Pay dues · enter the action", icon: UserPlus,    url: createPageUrl("JoinTheLeague") },
];

function NavTile({ icon: Icon, title, desc, url }) {
  return (
    <Link
      to={url}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150"
      style={CARD}
    >
      <div
        className="w-9 h-9 flex items-center justify-center rounded-lg shrink-0"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-white font-medium text-sm leading-tight">{title}</span>
        <span className="text-xs text-white/40 mt-0.5">{desc}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
    </Link>
  );
}

function Brand() {
  return (
    <div className="flex flex-col items-center pt-4 pb-2">
      <img
        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/8de2d69e1_ChatGPTImageMar2202603_07_22PM.png"
        alt="River Rat Rounders"
        className="w-40 object-contain"
      />
      <p className="text-white/30 text-xs tracking-wide mt-1">Memphis' Freeroll Bar Poker League</p>
    </div>
  );
}

function Divider({ label }) {
  return (
    <div className="w-full flex items-center gap-3 text-xs text-white/30 uppercase tracking-widest">
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
      <span>{label}</span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
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
        <div className="w-4 h-4 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    );
  }

  /* ── LOGGED IN ── */
  if (loggedInPlayer) {
    return (
      <div className="min-h-screen relative" style={BG}>
        <div className="absolute inset-0 pointer-events-none" style={GLOW} />
        <div className="relative max-w-md mx-auto w-full px-4 flex flex-col gap-4 pb-10">
          <Brand />
          <PlayerSignIn />
          <Divider label="Explore" />
          <div className="flex flex-col gap-2">
            {NAV_ITEMS.map(item => (
              <NavTile key={item.title} {...item} />
            ))}
            <PlayerSignUp />
          </div>
        </div>
      </div>
    );
  }

  /* ── LOGGED OUT ── */
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