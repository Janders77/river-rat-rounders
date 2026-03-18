import React, { useState } from "react";
import { UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { InviteRequest } from "@/entities/InviteRequest";

export default function PlayerSignUp() {
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    try {
      await InviteRequest.create({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        status: "pending"
      });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 group"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.2)" }}>
          <UserPlus className="w-3.5 h-3.5 text-red-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="font-semibold text-white text-sm leading-tight">New Player? Sign Up</div>
          <div className="text-gray-600 text-xs mt-0.5">Request to join the River Rat Rounders</div>
        </div>
        <svg className="w-3.5 h-3.5 text-gray-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    );
  }

  if (status === "done") {
    return (
      <div className="w-full flex flex-col items-center gap-3 p-5 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <CheckCircle2 className="w-10 h-10 text-green-400" />
        <p className="text-white font-semibold">Request Sent!</p>
        <p className="text-gray-400 text-sm">The director will send you an invite to join soon.</p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center gap-3 mb-4">
        <UserPlus className="w-5 h-5 text-red-400" />
        <span className="font-semibold text-white">New Player Sign Up</span>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="First name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className="bg-gray-900 border-gray-700 text-white"
            required
          />
          <Input
            placeholder="Last name"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            className="bg-gray-900 border-gray-700 text-white"
            required
          />
        </div>
        <Input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="bg-gray-900 border-gray-700 text-white"
          required
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setExpanded(false)}
            className="flex-1 border-gray-700 text-gray-400 hover:bg-gray-800">
            Cancel
          </Button>
          <Button type="submit" disabled={status === "loading"}
            className="flex-1 bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white shadow-lg shadow-red-900/40 transition-all duration-200">
            {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request Invite"}
          </Button>
        </div>
        {status === "error" && <p className="text-red-400 text-sm text-center">Something went wrong. Please try again.</p>}
      </form>
    </div>
  );
}