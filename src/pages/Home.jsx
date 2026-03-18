import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, History, UserPlus, CalendarDays } from "lucide-react";

import PlayerSignIn from "../components/home/PlayerSignIn";
import PlayerSignUp from "../components/home/PlayerSignUp";
import LoginCard from "../components/home/LoginCard";

const CARD = "flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-800/70 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-800/50 transition-all duration-200 group";
const ICON_WRAP = "w-9 h-9 rounded-lg bg-gray-800/80 flex items-center justify-center shrink-0";

const navLinks = [
  { title: "Leaderboard",  description: "Rankings and player stats",   icon: Trophy,       url: createPageUrl("Leaderboard") },
  { title: "Game History", description: "Browse all past games",        icon: History,      url: createPageUrl("GameHistory") },
  { title: "Calendar",     description: "Upcoming events and games",    icon: CalendarDays, url: createPageUrl("LeagueCalendar") },
];

const bgStyle    = { background: "linear-gradient(160deg, #22222e 0%, #2e2e3a 60%, #22222e 100%)" };
const radialGlow = { background: "radial-gradient(ellipse at top, rgba(220,38,38,0.07), transparent 55%)" };

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
      <div className="min-h-screen flex items-center justify-center" style={bgStyle}>
        <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
      </div>
    );
  }

  if (loggedInPlayer) {
    return (
      <div className="min-h-screen flex flex-col items-center pt-6 pb-10 px-4 relative" style={bgStyle}>
        <div className="absolute inset-0 pointer-events-none" style={radialGlow} />
        <div className="w-full max-w-md relative space-y-4">
          <div className="flex justify-center pt-2 pb-1">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/8de2d69e1_ChatGPTImageMar2202603_07_22PM.png"
              alt="River Rat Rounders"
              className="w-48 object-contain"
            />
          </div>

          <PlayerSignIn />

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-gray-600 text-xs uppercase tracking-wider">Quick Links</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <div className="space-y-2">
            <Link to={createPageUrl("JoinTheLeague")} className={CARD}>
              <div className={ICON_WRAP}>
                <UserPlus className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm leading-tight">Join the League</div>
                <div className="text-gray-500 text-xs mt-0.5">Pay dues and join the action</div>
              </div>
            </Link>

            {navLinks.map((link) => (
              <Link key={link.title} to={link.url} className={CARD}>
                <div className={ICON_WRAP}>
                  <link.icon className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm leading-tight">{link.title}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{link.description}</div>
                </div>
              </Link>
            ))}
          </div>

          <PlayerSignUp />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative" style={bgStyle}>
      <div className="absolute inset-0 pointer-events-none" style={radialGlow} />
      <div className="w-full max-w-md relative space-y-6">
        <div className="flex flex-col items-center gap-2">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/8de2d69e1_ChatGPTImageMar2202603_07_22PM.png"
            alt="River Rat Rounders"
            className="w-48 object-contain"
          />
          <p className="text-gray-500 text-sm">Memphis' Freeroll Bar Poker League</p>
        </div>
        <LoginCard onLoginSuccess={() => {
          const email = localStorage.getItem("playerEmail");
          setLoggedInPlayer(email || null);
        }} />
      </div>
    </div>
  );
}