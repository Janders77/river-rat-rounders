import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Gamepad2, Trophy, MapPin } from "lucide-react";

export default function StatsGrid({ stats }) {
  const statCards = [
    {
      title: "Total Players",
      value: stats.totalPlayers,
      icon: Users,
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Games Played",
      value: stats.totalGames,
      icon: Gamepad2,
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "Total Points",
      value: stats.totalPoints,
      icon: Trophy,
      color: "from-amber-500 to-amber-600"
    },
    {
      title: "Top Location",
      value: stats.topLocation || "N/A",
      icon: MapPin,
      color: "from-emerald-500 to-emerald-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="bg-[#1A1B20] border-gray-800 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-2">{stat.title}</p>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}