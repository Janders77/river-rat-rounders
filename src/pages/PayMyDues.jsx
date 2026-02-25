import React from "react";
import { CreditCard } from "lucide-react";

export default function PayMyDues() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto">
          <CreditCard className="w-8 h-8 text-purple-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">Pay My Dues</h1>
        <p className="text-gray-400">Coming soon — dues payment will be available here.</p>
      </div>
    </div>
  );
}