import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn, Loader2 } from "lucide-react";
import { localClient } from "@/api/localClient";

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
      await localClient.auth.login(email, password);
      window.location.reload();
    } catch (err) {
      setError(err.message || "Email or password is incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] sm:px-5">
      <div className="flex items-center gap-2 mb-4">
        <LogIn className="w-5 h-5 text-red-400" />
        <h2 className="text-lg font-semibold text-white">Player Login</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-base font-medium text-white mb-2">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="h-12 px-4 text-base rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/30"
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="email"
            required
          />
        </div>
        <div>
          <label className="block text-base font-medium text-white mb-2">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="h-12 px-4 text-base rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/30"
            required
          />
        </div>
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-base">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-white shadow-lg shadow-red-900/40 transition-all duration-200 text-base font-semibold rounded-xl active:scale-[0.99]"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Signing in...</>
          ) : (
            <><LogIn className="w-5 h-5 mr-2" /> Sign In</>
          )}
        </Button>
      </form>
    </div>
  );
}
