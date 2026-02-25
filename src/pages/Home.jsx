import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, History, Zap, CreditCard } from "lucide-react";

import PlayerSignIn from "../components/home/PlayerSignIn";
import PlayerSignUp from "../components/home/PlayerSignUp";

const navLinks = [
  {
    title: "Leaderboard",
    description: "View community rankings and player stats",
    icon: Trophy,
    url: createPageUrl("Leaderboard"),
    color: "from-red-600/30 to-red-700/20 border-red-600/40 hover:border-red-500/70",
    iconColor: "text-red-400",
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
    title: "Break Time Bump",
    description: "Top up or re-enter during the break",
    icon: Zap,
    url: createPageUrl("BreakTimeBump"),
    color: "from-yellow-500/30 to-yellow-600/20 border-yellow-500/40 hover:border-yellow-400/70",
    iconColor: "text-yellow-400",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#16171B] flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full text-center mb-12">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/515aaf9cc_blackcroppaint.jpeg"
          alt="River Rat Rounders"
          className="mx-auto mb-6 w-64 object-contain"
        />
        <p className="text-gray-400 text-lg">Your poker community hub</p>
      </div>

      <div className="max-w-lg w-full space-y-4 mb-6">
        <PlayerSignIn />
        <PlayerSignUp />
      </div>

      <div className="max-w-lg w-full space-y-4">
        {navLinks.map((link) => (
          <Link
            key={link.title}
            to={link.url}
            className={`flex items-center gap-4 p-5 rounded-xl border bg-gradient-to-r ${link.color} transition-all duration-200 group`}
          >
            <div className="w-12 h-12 bg-gray-900/60 rounded-lg flex items-center justify-center shrink-0">
              <link.icon className={`w-6 h-6 ${link.iconColor}`} />
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