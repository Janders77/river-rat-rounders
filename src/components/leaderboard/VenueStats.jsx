import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Trophy, Gamepad2 } from "lucide-react";

export default function VenueStats({ games }) {
  const venueMap = {};
  games.forEach(game => {
    if (!game.location) return;
    if (!venueMap[game.location]) {
      venueMap[game.location] = { games: 0, totalPoints: 0 };
    }
    venueMap[game.location].games += 1;
    venueMap[game.location].totalPoints += game.points_awarded || 0;
  });

  const venues = Object.entries(venueMap)
    .sort(([, a], [, b]) => b.games - a.games)
    .slice(0, 5);

  if (venues.length === 0) return null;

  return (
    <Card className="bg-[#1A1B20] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-400" />
          Top Venues
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {venues.map(([name, stats], index) => (
          <div key={name} className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg border border-gray-800">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
              index === 0 ? 'bg-amber-500/20 text-amber-400' :
              index === 1 ? 'bg-gray-400/20 text-gray-300' :
              index === 2 ? 'bg-amber-700/20 text-amber-700' :
              'bg-gray-800 text-gray-500'
            }`}>
              #{index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium truncate">{name}</div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Gamepad2 className="w-4 h-4" />
                {stats.games}
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <Trophy className="w-4 h-4" />
                {stats.totalPoints} pts
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}