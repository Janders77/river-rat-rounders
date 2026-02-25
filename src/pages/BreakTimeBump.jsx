import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, DollarSign, CreditCard, ExternalLink } from "lucide-react";


const BUMP_COST = 20;

export default function BreakTimeBump() {
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
          <CardContent className="text-gray-300 text-sm leading-relaxed">
            <p>A <span className="text-amber-400 font-semibold">Break Time Bump</span> allows you to get back in the action if you bust or want to add on during the break.</p>
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
          <CardContent>
            <a
              href="https://store7781494.ecwid.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full p-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors text-white font-bold text-base"
            >
              <ExternalLink className="w-5 h-5" />
              Purchase Break Time Bump — $20
            </a>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}