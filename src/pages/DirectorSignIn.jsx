import React, { useState } from "react";

import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, AlertCircle, Lock } from "lucide-react";

const DIRECTOR_CODE = "3855";
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function isDirectorSessionValid() {
  const accessTime = localStorage.getItem("directorAccessTime");
  if (!accessTime) return false;
  return Date.now() - parseInt(accessTime) < SIX_HOURS_MS;
}

export default function DirectorSignIn() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-redirect if session still valid
  React.useEffect(() => {
    if (isDirectorSessionValid()) {
      navigate(createPageUrl("DirectorDashboard"));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (code === DIRECTOR_CODE) {
      localStorage.setItem("directorAccess", "true");
      localStorage.setItem("directorAccessTime", Date.now().toString());
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
    <div className="min-h-screen relative overflow-x-hidden flex items-center justify-center" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none" style={{background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08), transparent 70%)"}} />
      <div className="relative w-full max-w-md px-4 flex flex-col gap-3">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-white/80" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">Director Access</h1>
            <p className="text-base text-white/40 mt-0.5 leading-none">Enter the director code</p>
          </div>
        </div>

        <div className="w-full rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="password"
              placeholder="Enter director code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="bg-white/5 border-white/10 text-white text-center text-lg tracking-widest"
              autoFocus
            />

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-base">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={!code || isSubmitting}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-xl"
            >
              {isSubmitting ? "Verifying..." : "Access Dashboard"}
            </Button>
          </form>

          <Button
            onClick={() => navigate(createPageUrl("Home"))}
            variant="outline"
            className="w-full border-white/10 text-white/50 hover:bg-white/5 rounded-xl"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}