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
        className="w-full flex items-center gap-4 p-5 rounded-xl border border-green-500/25 bg-gradient-to-br from-green-500/20 to-green-700/10 hover:border-green-400/50 transition-all duration-200 group"
      >
        <div className="w-12 h-12 bg-gray-900/60 rounded-lg flex items-center justify-center shrink-0">
          <UserPlus className="w-6 h-6 text-green-400" />
        </div>
        <div className="text-left">
          <div className="font-semibold text-white text-lg">New Player? Sign Up</div>
          <div className="text-gray-400 text-sm">Request to join the River Rat Rounders</div>
        </div>
      </button>
    );
  }

  if (status === "done") {
    return (
      <div className="w-full flex flex-col items-center gap-3 p-6 rounded-xl border border-red-600/40 bg-gradient-to-r from-red-600/20 to-red-700/10 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-400" />
        <p className="text-white font-semibold">Request Sent!</p>
        <p className="text-gray-400 text-sm">The director will send you an invite to join soon.</p>
      </div>
    );
  }

  return (
    <div className="w-full p-5 rounded-xl border border-red-600/40 bg-gradient-to-r from-red-600/20 to-red-700/10">
      <div className="flex items-center gap-3 mb-4">
        <UserPlus className="w-5 h-5 text-green-400" />
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
            className="flex-1 bg-red-600 hover:bg-red-700 text-white">
            {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request Invite"}
          </Button>
        </div>
        {status === "error" && <p className="text-red-400 text-sm text-center">Something went wrong. Please try again.</p>}
      </form>
    </div>
  );
}