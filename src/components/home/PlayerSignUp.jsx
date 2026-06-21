import React, { useState } from "react";
import { UserPlus, Loader2, CheckCircle2, ChevronRight } from "lucide-react";
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
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 min-h-[48px] border border-white/10 bg-white/[0.05]"
      >
        <div className="w-10 h-10 flex items-center justify-center rounded-lg shrink-0 bg-white/5">
          <UserPlus className="w-5 h-5 text-white/80" />
        </div>
        <div className="flex flex-col flex-1 min-w-0 text-left">
          <span className="text-base font-semibold text-white leading-tight">New Player? Sign Up</span>
          <span className="text-base text-white/65 mt-0.5">Request to join the River Rat Rounders</span>
        </div>
        <ChevronRight className="w-5 h-5 text-white/20 shrink-0" />
      </button>
    );
  }

  if (status === "done") {
    return (
      <div className="w-full flex flex-col items-center gap-4 p-6 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <CheckCircle2 className="w-12 h-12 text-green-400" />
        <p className="text-white font-semibold text-base">Request Sent!</p>
        <p className="text-gray-400 text-base">The director will send you an invite to join soon.</p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center gap-3 mb-5">
        <UserPlus className="w-5 h-5 text-red-400" />
        <span className="font-semibold text-white text-base">New Player Sign Up</span>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <Input
            placeholder="First name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className="bg-gray-900 border-gray-700 text-white h-12 text-base"
            required
          />
          <Input
            placeholder="Last name"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            className="bg-gray-900 border-gray-700 text-white h-12 text-base"
            required
          />
        </div>
        <Input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="bg-gray-900 border-gray-700 text-white h-12 text-base"
          required
        />
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => setExpanded(false)}
            className="flex-1 border-gray-700 text-gray-400 hover:bg-gray-800 h-12 text-base">
            Cancel
          </Button>
          <Button type="submit" disabled={status === "loading"}
            className="flex-1 h-12 bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white shadow-lg shadow-red-900/40 transition-all duration-200 text-base font-semibold">
            {status === "loading" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Request Invite"}
          </Button>
        </div>
        {status === "error" && <p className="text-red-400 text-base text-center">Something went wrong. Please try again.</p>}
      </form>
    </div>
  );
}