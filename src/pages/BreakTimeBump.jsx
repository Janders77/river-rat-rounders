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
          <div className="w-16 h-16 bg-gradient-to-br from-red-700 to-red-900 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/40 mx-auto mb-4">
            <Zap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Break Time Bump</h1>
          <p className="text-gray-400 mt-2">Get back in the action during the break</p>
        </div>

        {/* What is it */}
        <Card className="bg-[#1A1B20] border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white text-lg">What is a Break Time Bump?</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300 text-sm leading-relaxed">
            <p>A <span className="text-red-400 font-semibold">Break Time Bump</span> allows you to get back in the action if you bust or want to add on during the break.</p>
          </CardContent>
        </Card>

        {/* Price */}
        <div className="flex items-center justify-center gap-3 mb-6 p-4 rounded-xl bg-red-900/20 border border-red-700/40">
          <span className="text-2xl font-bold text-red-400">${BUMP_COST}.00</span>
          <Badge className="bg-red-900/30 text-red-300 border-red-700/40">Per Bump</Badge>
        </div>

        {/* Payment Options */}
        <div className="flex justify-center mb-6">
          <a
            href="https://store7781494.ecwid.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 px-8 py-4 rounded-lg bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 transition-all duration-200 text-white font-bold text-base shadow-lg shadow-red-900/40"
          >
            <ExternalLink className="w-5 h-5" />
            Break Time Bump
          </a>
        </div>


      </div>
    </div>
  );
}