import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, History, Zap, UserPlus, CalendarDays } from "lucide-react";
import { base44 } from "@/api/base44Client";

import PlayerSignIn from "../components/home/PlayerSignIn";
import PlayerSignUp from "../components/home/PlayerSignUp";
import LoginCard from "../components/home/LoginCard";

const cardClass = "flex items-center gap-4 p-5 rounded-xl border border-red-900/40 bg-gradient-to-r from-red-900/20 to-red-950/60 hover:border-red-800/60 hover:from-red-900/30 hover:to-red-950/80 transition-all duration-200 group";

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (loggedInPlayer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
        <div className="max-w-lg w-full">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/515aaf9cc_blackcroppaint.jpeg"
            alt="River Rat Rounders"
            className="mx-auto mb-8 w-64 object-contain mix-blend-screen"
          />
          <div className="space-y-6">
            <PlayerSignIn />

            <Link
              to={createPageUrl("JoinTheLeague")}
              className={cardClass}
            >
              <div className="w-12 h-12 bg-gray-900/60 rounded-lg flex items-center justify-center shrink-0">
                <UserPlus className="w-6 h-6 text-red-400" />
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
                className={cardClass}
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

            <PlayerSignUp />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
      <div className="max-w-lg w-full text-center mb-12">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/515aaf9cc_blackcroppaint.jpeg"
          alt="River Rat Rounders"
          className="mx-auto mb-6 w-64 object-contain"
        />
        <p className="text-gray-400 text-lg">Memphis' Freeroll Bar Poker League</p>
      </div>

      <div className="max-w-lg w-full mb-8">
        <LoginCard onLoginSuccess={() => checkLoginStatus()} />
      </div>
    </div>
  );
}