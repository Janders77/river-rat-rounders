import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { LogIn, Loader2 } from "lucide-react";

export default function LoginCard({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const players = await base44.entities.Player.filter({ email: email.toLowerCase().trim() });
      
      if (players.length === 0) {
        setError("Email or password is incorrect");
        setLoading(false);
        return;
      }

      const player = players[0];
      const storedPassword = player.password || "Poker123";

      if (password !== storedPassword) {
        setError("Email or password is incorrect");
        setLoading(false);
        return;
      }

      localStorage.setItem("playerEmail", player.email);
      localStorage.setItem("playerName", `${player.first_name}${player.last_name ? ' ' + player.last_name : ''}`);
      window.location.reload();
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-transparent border-gray-700/40 w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <LogIn className="w-5 h-5 text-red-400" /> Player Login
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="bg-gray-900 border-gray-700 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="bg-gray-900 border-gray-700 text-white"
              required
            />
          </div>
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white shadow-lg shadow-red-900/40 transition-all duration-200"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
            ) : (
              <><LogIn className="w-4 h-4 mr-2" /> Sign In</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}