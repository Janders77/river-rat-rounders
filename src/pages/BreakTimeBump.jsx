import React from "react";
import { Badge } from "@/components/ui/badge";
import { Zap, ExternalLink } from "lucide-react";

const BUMP_COST = 20;

export default function BreakTimeBump() {
  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none" style={{background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08), transparent 70%)"}} />
      <div className="relative max-w-md mx-auto w-full px-4 pt-5 pb-10 flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white/80" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">Break Time Bump</h1>
            <p className="text-base text-white/40 mt-0.5 leading-none">Get back in the action during the break</p>
          </div>
        </div>

        {/* What is it */}
        <div className="w-full rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-white/60 text-base font-semibold uppercase tracking-wider mb-2">What is a Break Time Bump?</p>
          <p className="text-white/70 text-base leading-relaxed">
            A <span className="text-red-400 font-semibold">Break Time Bump</span> allows you to get back in the action if you bust or want to add on during the break.
          </p>
        </div>

        {/* Price */}
        <div className="w-full rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center justify-center gap-3">
          <span className="text-2xl font-bold text-red-400">{BUMP_COST}.00</span>
          <Badge className="bg-red-900/30 text-red-300 border-red-700/40">Per Bump</Badge>
        </div>

        {/* Payment Button */}
        <a
          href="https://store7781494.ecwid.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 transition-all duration-200 text-white font-bold text-base shadow-lg shadow-red-900/40"
        >
          <ExternalLink className="w-5 h-5" />
          Break Time Bump
        </a>
      </div>
    </div>
  );
}
