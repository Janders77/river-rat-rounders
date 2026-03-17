import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, History, Zap, UserPlus, CalendarDays } from "lucide-react";
import { base44 } from "@/api/base44Client";

import PlayerSignIn from "../components/home/PlayerSignIn";
import PlayerSignUp from "../components/home/PlayerSignUp";
import LoginCard from "../components/home/LoginCard";
import GameClock from "../components/home/GameClock";

const cardClass = "flex items-center gap-4 p-5 rounded-xl border border-red-900/40 bg-gradient-to-r from-red-900/20 to-red-950/60 hover:border-red-700/70 hover:from-red-700/40 hover:to-red-800/50 hover:bg-red-800/30 transition-all duration-200 group";

const navLinks = [
  {
    title: "Leaderboard",
    description: "View community rankings and player stats",
    icon: Trophy,
    url: createPageUrl("Leaderboard"),
    iconColor: "text-red-400",
  },
  {
    title: "Game History",
    description: "Browse all past games and results",
    icon: History,
    url: createPageUrl("GameHistory"),
    iconColor: "text-red-400",
  },
  {
    title: "Calendar",
    description: "View upcoming league events and games",
    icon: CalendarDays,
    url: createPageUrl("LeagueCalendar"),
    iconColor: "text-red-400",
  },
];

export default function Home() {
  const [loggedInPlayer, setLoggedInPlayer] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = () => {
    const storedEmail = localStorage.getItem("playerEmail");
    setLoggedInPlayer(storedEmail || null);
    setLoading(false);
  };

  const bgStyle = {background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"};
  const radialGlow = {background: "radial-gradient(circle at top, rgba(220,38,38,0.08), transparent 40%)"};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={bgStyle}>
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (loggedInPlayer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative" style={bgStyle}>
        <div className="absolute inset-0 pointer-events-none" style={radialGlow} />
        <div className="max-w-lg w-full relative">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/8de2d69e1_ChatGPTImageMar2202603_07_22PM.png"
            alt="River Rat Rounders"
            className="mx-auto mb-8 w-64 object-contain"
          />
          <div className="space-y-6">
            <GameClock />
            <PlayerSignIn />

            <Link to={createPageUrl("JoinTheLeague")} className={cardClass}>
              <div className="w-10 h-10 bg-gray-900/60 rounded-lg flex items-center justify-center shrink-0">
                <UserPlus className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-white text-base">Join the League</div>
                <div className="text-gray-400 text-sm">Pay your dues and join the action</div>
              </div>
            </Link>

            {navLinks.map((link) => (
              <Link key={link.title} to={link.url} className={cardClass}>
                <div className="w-10 h-10 bg-gray-900/60 rounded-lg flex items-center justify-center shrink-0">
                  {link.image ? (
                    <img src={link.image} alt={link.title} className="w-8 h-8 object-contain" />
                  ) : (
                    <link.icon className={`w-5 h-5 ${link.iconColor}`} />
                  )}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white text-base group-hover:text-white">{link.title}</div>
                  <div className="text-gray-400 text-sm">{link.description}</div>
                </div>
              </Link>
            ))}

            <PlayerSignUp />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative" style={bgStyle}>
      <div className="absolute inset-0 pointer-events-none" style={radialGlow} />
      <div className="max-w-lg w-full text-center mb-12 relative">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/8de2d69e1_ChatGPTImageMar2202603_07_22PM.png"
          alt="River Rat Rounders"
          className="mx-auto mb-6 w-64 object-contain"
        />
        <p className="text-gray-400 text-lg">Memphis' Freeroll Bar Poker League</p>
      </div>

      <div className="max-w-lg w-full mb-8 relative">
        <LoginCard onLoginSuccess={() => checkLoginStatus()} />
      </div>
    </div>
  );
}