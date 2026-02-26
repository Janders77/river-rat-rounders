import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Zap, CalendarDays, Database, ShieldAlert, BarChart3, Trophy, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalPlayers: 0, totalGames: 0, upcomingEvents: 0 });
  const [recentGames, setRecentGames] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    const currentUser = await base44.auth.me();
    setUser(currentUser);

    if (currentUser?.role !== "admin") {
      window.location.href = createPageUrl("Home");
      return;
    }

    // Load stats
    const players = await base44.entities.Player.list();
    const games = await base44.entities.Game.list('-game_date', 100);
    const events = await base44.entities.LeagueEvent.list();
    
    const now = new Date();
    const upcoming = events.filter(e => new Date(e.event_date) >= now);
    const recent = games.slice(0, 5);

    setStats({
      totalPlayers: players.length,
      totalGames: games.length,
      upcomingEvents: upcoming.length,
    });
    setRecentGames(recent);
    setUpcomingEvents(upcoming.slice(0, 5));
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#16171B] p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#16171B] p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Admin Dashboard</h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-900/60 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-gray-400 text-sm font-medium">Total Players</CardTitle>
              <Users className="h-5 w-5 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.totalPlayers}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/60 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-gray-400 text-sm font-medium">Total Games</CardTitle>
              <Trophy className="h-5 w-5 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.totalGames}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/60 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-gray-400 text-sm font-medium">Upcoming Events</CardTitle>
              <CalendarDays className="h-5 w-5 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.upcomingEvents}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Games */}
          <Card className="bg-gray-900/60 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <History className="h-5 w-5 text-amber-400" />
                Recent Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentGames.length > 0 ? (
                <div className="space-y-3">
                  {recentGames.map(game => (
                    <div key={game.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div>
                        <p className="text-white font-medium">{game.winner_name}</p>
                        <p className="text-gray-400 text-sm">{new Date(game.game_date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-semibold">{game.points_awarded} pts</p>
                        <p className="text-gray-400 text-sm">{game.location}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No games recorded</p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="bg-gray-900/60 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-400" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map(event => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div>
                        <p className="text-white font-medium">{event.title}</p>
                        <p className="text-gray-400 text-sm">{new Date(event.event_date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm">{event.event_type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No upcoming events</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Admin Functions */}
        <Card className="bg-gray-900/60 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Admin Functions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to={createPageUrl("PlayerDatabase")}>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Player Database
                </Button>
              </Link>
              <Link to={createPageUrl("DirectorManagement")}>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Manage Directors
                </Button>
              </Link>
              <Link to={createPageUrl("Locations")}>
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Manage Locations
                </Button>
              </Link>
              <Link to={createPageUrl("LeagueCalendar")}>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  League Calendar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}