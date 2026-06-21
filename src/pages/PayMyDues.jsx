import React from "react";
import { CreditCard } from "lucide-react";

export default function PayMyDues() {
  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none" style={{background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08), transparent 70%)"}} />
      <div className="relative max-w-md mx-auto w-full px-4 pt-5 pb-10 flex flex-col gap-3">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-white/80" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">Pay My Dues</h1>
            <p className="text-base text-white/40 mt-0.5 leading-none">League membership payment</p>
          </div>
        </div>
        <div className="w-full rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <CreditCard className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 text-base">Coming soon — dues payment will be available here.</p>
        </div>
      </div>
    </div>
  );
}
