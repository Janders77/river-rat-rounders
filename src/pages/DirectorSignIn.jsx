import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, AlertCircle, Lock } from "lucide-react";

const DIRECTOR_CODE = "3855";

export default function DirectorSignIn() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (code === DIRECTOR_CODE) {
      // Expire at midnight (end of today)
      const midnight = new Date();
      midnight.setHours(23, 59, 59, 999);
      const expiresAt = midnight.getTime();
      localStorage.setItem("directorAccess", "true");
      localStorage.setItem("directorAccessExpiry", expiresAt.toString());
      setTimeout(() => {
        navigate(createPageUrl("DirectorDashboard"));
      }, 300);
    } else {
      setError("Invalid director code. Please try again.");
      setCode("");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <Card className="w-full max-w-md bg-transparent border border-red-500/40 backdrop-blur-sm">
        <CardHeader>
          <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-red-500" />
          </div>
          <CardTitle className="text-white text-2xl">Director Access</CardTitle>
          <p className="text-gray-400 text-sm mt-2">Enter the director code to access the dashboard</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Enter director code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white text-center text-lg tracking-widest"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={!code || isSubmitting}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold"
            >
              {isSubmitting ? "Verifying..." : "Access Dashboard"}
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