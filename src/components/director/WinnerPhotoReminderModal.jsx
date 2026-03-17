import React from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WinnerPhotoReminderModal({ onClose, onTakePhoto }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-gray-700 p-8 shadow-2xl"
        style={{ background: "linear-gradient(135deg, #1e1e2a 0%, #111118 100%)" }}
      >
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center">
            <Camera className="w-8 h-8 text-red-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-3">
          Game Recorded Successfully!
        </h2>

        {/* Message */}
        <p className="text-gray-300 text-center text-base leading-relaxed mb-8">
          Please take the winner's picture before continuing.
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={onTakePhoto}
            className="w-full bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white font-semibold text-base py-3 h-auto shadow-lg shadow-red-900/40"
          >
            <Camera className="w-5 h-5 mr-2" />
            Take Winner Photo
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white text-base py-3 h-auto"
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}