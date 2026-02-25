import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, LogIn, AlertCircle, Eye, EyeOff } from "lucide-react";

const DIRECTOR_CREDENTIALS = {
  username: "director",
  password: "RiverRats2026",
};

export default function DirectorSignIn() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check if already signed in
  useEffect(() => {
    const signedIn = localStorage.getItem("directorSignedIn");
    if (signedIn === "true") {
      navigate(createPageUrl("DirectorDashboard"));
    }
  }, [navigate]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validate credentials
    if (username === DIRECTOR_CREDENTIALS.username && password === DIRECTOR_CREDENTIALS.password) {
      localStorage.setItem("directorSignedIn", "true");
      setTimeout(() => {
        navigate(createPageUrl("DirectorDashboard"));
      }, 500);
    } else {
      setError("Invalid username or password.");
      setPassword("");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen p-6 flex items-center justify-center" style={{background: "radial-gradient(ellipse at center, #2d5a27 0%, #1a3d15 50%, #0f2a0a 100%)"}}>
      <Card className="w-full max-w-md bg-[#1A1B20] border-gray-800">
        <CardHeader>
          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6 text-purple-500" />
          </div>
          <CardTitle className="text-white text-2xl">Director Portal</CardTitle>
          <p className="text-gray-400 text-sm mt-2">Access the director dashboard</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Username</Label>
              <Input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-600"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white placeholder-gray-600 pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-semibold text-sm">Sign In Failed</p>
                  <p className="text-red-300 text-xs mt-1">{error}</p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white font-semibold flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <Button
            onClick={() => navigate(createPageUrl("Home"))}
            variant="outline"
            className="w-full border-gray-700 text-gray-300 hover:bg-gray-900"
          >
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}