import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, LogIn, AlertCircle } from "lucide-react";

export default function DirectorSignIn() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [directorData, setDirectorData] = useState(null);

  useEffect(() => {
    const checkDirector = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Check if user is designated director
        const directors = await base44.entities.Director.filter({ email: currentUser.email });
        if (directors.length > 0) {
          setDirectorData(directors[0]);
          // Redirect to director dashboard
          setTimeout(() => {
            navigate(createPageUrl("DirectorDashboard"));
          }, 1000);
        }
      } catch (err) {
        setError("Authentication failed. Please try logging in again.");
      } finally {
        setLoading(false);
      }
    };

    checkDirector();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (isDirector) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-4">Verified director. Redirecting...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <Card className="w-full max-w-md bg-[#1A1B20] border-gray-800">
        <CardHeader>
          <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
          <CardTitle className="text-white text-2xl">Director Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold text-sm">Access Denied</p>
              <p className="text-red-300 text-xs mt-1">
                {user?.email || "Your account"} is not authorized to access the Director Dashboard.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-400">
            <p>Only designated directors can access the Director Dashboard.</p>
            <p>If you should have director access, please contact the league administrator.</p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => navigate(createPageUrl("Home"))}
              variant="outline"
              className="w-full border-gray-700 text-gray-300 hover:bg-gray-900"
            >
              Back to Home
            </Button>
            <Button
              onClick={() => base44.auth.logout()}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign In as Different User
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}