import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, History, Zap, UserPlus, CalendarDays } from "lucide-react";
import { base44 } from "@/api/base44Client";

import PlayerSignIn from "../components/home/PlayerSignIn";
import PlayerSignUp from "../components/home/PlayerSignUp";
import LoginCard from "../components/home/LoginCard";

const navLinks = [
  {
    title: "Leaderboard",
    description: "View community rankings and player stats",
    icon: Trophy,
    url: createPageUrl("Leaderboard"),
    color: "from-yellow-500/30 to-yellow-600/20 border-yellow-500/40 hover:border-yellow-400/70",
    iconColor: "text-yellow-400",
  },
  {
    title: "Game History",
    description: "Browse all past games and results",
    icon: History,
    url: createPageUrl("GameHistory"),
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-500/60",
    iconColor: "text-blue-400",
  },
  {
    title: "Calendar",
    description: "View upcoming league events and games",
    icon: CalendarDays,
    url: createPageUrl("LeagueCalendar"),
    color: "from-cyan-500/30 to-cyan-600/20 border-cyan-500/40 hover:border-cyan-400/70",
    iconColor: "text-cyan-400",
  },
];

export default function Home() {
  const [loggedInPlayer, setLoggedInPlayer] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const storedEmail = localStorage.getItem("playerEmail");
    if (storedEmail) {
      setLoggedInPlayer(storedEmail);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#16171B] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (loggedInPlayer) {
    const playerName = localStorage.getItem("playerName") || "Player";
    return (
      <div className="min-h-screen bg-[#16171B] flex flex-col items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/515aaf9cc_blackcroppaint.jpeg"
            alt="River Rat Rounders"
            className="mx-auto mb-6 w-64 object-contain"
          />
          <h1 className="text-2xl font-bold text-white mb-2">Welcome, {playerName.split(' ')[0]}!</h1>
          <p className="text-gray-400 text-lg mb-8">Use the navigation menu to explore the league.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#16171B] flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full text-center mb-12">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/515aaf9cc_blackcroppaint.jpeg"
          alt="River Rat Rounders"
          className="mx-auto mb-6 w-64 object-contain"
        />
        <p className="text-gray-400 text-lg">Memphis' Freeroll Bar Poker League</p>
      </div>

      <div className="max-w-lg w-full mb-8">
        <LoginCard onLoginSuccess={() => setLoggedInPlayer(true)} />
      </div>

      <div className="max-w-lg w-full space-y-6 mb-6">
        <PlayerSignIn />
        <PlayerSignUp />
      </div>

      <div className="max-w-lg w-full space-y-6">
        {/* Join the League - first card */}
        <Link
          to={createPageUrl("JoinTheLeague")}
          className="flex items-center gap-4 p-5 rounded-xl border bg-gradient-to-r from-purple-500/30 to-purple-600/20 border-purple-500/40 hover:border-purple-400/70 transition-all duration-200 group"
        >
          <div className="w-12 h-12 bg-gray-900/60 rounded-lg flex items-center justify-center shrink-0">
            <UserPlus className="w-6 h-6 text-purple-400" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-white text-lg">Join the League</div>
            <div className="text-gray-400 text-sm">Pay your dues and join the action</div>
          </div>
        </Link>

        {navLinks.map((link) => (
          <Link
            key={link.title}
            to={link.url}
            className={`flex items-center gap-4 p-5 rounded-xl border bg-gradient-to-r ${link.color} transition-all duration-200 group`}
          >
            <div className="w-12 h-12 bg-gray-900/60 rounded-lg flex items-center justify-center shrink-0">
              {link.image ? (
                <img src={link.image} alt={link.title} className="w-10 h-10 object-contain" />
              ) : (
                <link.icon className={`w-6 h-6 ${link.iconColor}`} />
              )}
            </div>
            <div className="text-left">
              <div className="font-semibold text-white text-lg group-hover:text-white">{link.title}</div>
              <div className="text-gray-400 text-sm">{link.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}