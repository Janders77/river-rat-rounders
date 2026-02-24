import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Users, Loader2, LogIn, MapPin, Calendar } from "lucide-react";

export default function PlayerSignIn() {
  const [sessions, setSessions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(null);
  const [selectedSession, setSelectedSession] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [me, fetchedSessions] = await Promise.all([
      base44.auth.me().catch(() => null),
      base44.entities.GameSession.filter({ is_open: true }, "-session_date", 10)
    ]);
    setCurrentUser(me);
    setSessions(fetchedSessions);
    setIsLoading(false);
  };

  const handleSignIn = async (session) => {
    if (!currentUser) {
      base44.auth.redirectToLogin();
      return;
    }
    setSigningIn(session.id);
    const alreadySigned = session.signed_in_players?.includes(currentUser.email);
    if (!alreadySigned) {
      const updated = [...(session.signed_in_players || []), currentUser.email];
      await base44.entities.GameSession.update(session.id, { signed_in_players: updated });
    }
    await loadData();
    setSigningIn(null);
  };

  const isSignedIn = (session) =>
    currentUser && session.signed_in_players?.includes(currentUser.email);

  if (isLoading) {
    return (
      <Card className="bg-emerald-900/30 border-emerald-700/50">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="bg-emerald-900/30 border-emerald-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <LogIn className="w-5 h-5 text-emerald-400" /> Sign In to a Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">No open sessions right now. Check back later!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-emerald-900/30 border-emerald-700/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <LogIn className="w-5 h-5 text-emerald-400" /> Sign In to Tonight's Game
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.map((session) => (
          <div key={session.id} className="p-4 bg-gray-900/60 rounded-xl border border-gray-800 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-white font-semibold">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  {session.location}
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(session.session_date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  {session.game_type && <span className="text-gray-600">· {session.game_type}</span>}
                </div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shrink-0">
                Open
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Users className="w-4 h-4" />
              <span>{session.signed_in_players?.length || 0} signed in</span>
            </div>

            {isSignedIn(session) ? (
              <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
                <CheckCircle2 className="w-4 h-4" />
                You're signed in!
              </div>
            ) : (
              <Button
                onClick={() => handleSignIn(session)}
                disabled={signingIn === session.id}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
              >
                {signingIn === session.id ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                ) : (
                  <><LogIn className="w-4 h-4 mr-2" /> Sign In</>
                )}
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}