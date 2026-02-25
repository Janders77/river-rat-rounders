import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, DollarSign, CreditCard, CheckCircle2 } from "lucide-react";

const BUMP_COST = 20;

export default function BreakTimeBump() {
  const [copied, setCopied] = useState(null);

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
            <Zap className="w-9 h-9 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white">Break Time Bump</h1>
          <p className="text-gray-400 mt-2">Top-up or re-enter during the break</p>
        </div>

        {/* What is it */}
        <Card className="bg-[#1A1B20] border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white text-lg">What is a Break Time Bump?</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300 space-y-2 text-sm leading-relaxed">
            <p>
              A <span className="text-amber-400 font-semibold">Break Time Bump</span> lets you top up your chip stack or re-enter the game during the scheduled break.
            </p>
            <p>
              Simply pay <span className="text-amber-400 font-bold">${BUMP_COST}</span> via Venmo or PayPal before the break ends, then let the director know — and you're back in action!
            </p>
          </CardContent>
        </Card>

        {/* Price */}
        <div className="flex items-center justify-center gap-3 mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <DollarSign className="w-6 h-6 text-amber-400" />
          <span className="text-2xl font-bold text-amber-400">${BUMP_COST}.00</span>
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">Per Bump</Badge>
        </div>

        {/* Payment Options */}
        <Card className="bg-[#1A1B20] border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              How to Pay
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Venmo */}
            <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-700/40">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-blue-300 text-base">Venmo</div>
                  <div className="text-blue-200 text-sm mt-0.5">@RiverRatRounders</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy("@RiverRatRounders", "venmo")}
                    className="text-xs bg-blue-700/40 hover:bg-blue-700/60 text-blue-200 px-3 py-1.5 rounded-md transition-colors"
                  >
                    {copied === "venmo" ? <CheckCircle2 className="w-4 h-4 inline" /> : "Copy"}
                  </button>
                  <a
                    href="https://venmo.com/RiverRatRounders"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition-colors"
                  >
                    Open
                  </a>
                </div>
              </div>
            </div>

            {/* PayPal */}
            <div className="p-4 rounded-lg bg-indigo-900/20 border border-indigo-700/40">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-indigo-300 text-base">PayPal</div>
                  <div className="text-indigo-200 text-sm mt-0.5">@RiverRatRounders</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy("@RiverRatRounders", "paypal")}
                    className="text-xs bg-indigo-700/40 hover:bg-indigo-700/60 text-indigo-200 px-3 py-1.5 rounded-md transition-colors"
                  >
                    {copied === "paypal" ? <CheckCircle2 className="w-4 h-4 inline" /> : "Copy"}
                  </button>
                  <a
                    href="https://paypal.me/RiverRatRounders"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md transition-colors"
                  >
                    Open
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-[#1A1B20] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Steps to Complete Your Bump</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {[
                `Send $${BUMP_COST} via Venmo or PayPal to @RiverRatRounders`,
                'Include your name in the payment note (e.g. "Bump - John Smith")',
                "Let the Tournament Director know you've paid before the break ends",
                "Get your chips and get back in the game!",
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-300">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}