import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, Coffee } from "lucide-react";

function useCountdown(targetTimestamp, durationMinutes) {
  const [secondsLeft, setSecondsLeft] = useState(null);

  useEffect(() => {
    if (!targetTimestamp || !durationMinutes) { setSecondsLeft(null); return; }
    const calc = () => {
      const start = new Date(targetTimestamp).getTime();
      const end = start + durationMinutes * 60 * 1000;
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetTimestamp, durationMinutes]);

  return secondsLeft;
}

function formatTime(seconds) {
  if (seconds === null) return "--:--";
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function GameClock() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    base44.entities.GameSession.filter({ is_open: true }, "-session_date", 1)
      .then(sessions => setSession(sessions[0] || null))
      .catch(() => {});

    const unsub = base44.entities.GameSession.subscribe((event) => {
      if (event.type === "delete") { setSession(null); return; }
      if (event.data?.is_open) setSession(event.data);
      else setSession(null);
    });
    return () => unsub();
  }, []);

  const breakSecondsLeft = useCountdown(
    session?.is_break_active ? session.break_start_timestamp : null,
    15
  );
  const levelSecondsLeft = useCountdown(
    !session?.is_break_active ? session?.current_level_start_timestamp : null,
    session?.level_duration_minutes || 15
  );

  if (!session || !session.is_clock_running) return null;

  const isBreak = session.is_break_active;
  const secondsLeft = isBreak ? breakSecondsLeft : levelSecondsLeft;
  const isUrgent = secondsLeft !== null && secondsLeft <= 60;

  return (
    <div className={`rounded-xl border p-4 text-center transition-all duration-500 ${
      isBreak
        ? "border-blue-700/50 bg-gradient-to-r from-blue-900/30 to-blue-950/50"
        : "border-red-700/50 bg-gradient-to-r from-red-900/20 to-red-950/50"
    }`}>
      <div className="flex items-center justify-center gap-2 mb-1">
        {isBreak
          ? <Coffee className="w-4 h-4 text-blue-400" />
          : <Clock className="w-4 h-4 text-red-400" />
        }
        <span className={`text-sm font-semibold uppercase tracking-widest ${isBreak ? "text-blue-300" : "text-red-300"}`}>
          {isBreak ? "Break" : `Level ${session.current_level}`}
        </span>
      </div>
      <div className={`text-5xl font-mono font-bold tabular-nums transition-colors duration-300 ${
        isBreak ? "text-blue-200" : isUrgent ? "text-red-400 animate-pulse" : "text-white"
      }`}>
        {formatTime(secondsLeft)}
      </div>
      {!isBreak && (
        <div className="text-xs text-gray-500 mt-1">
          Level {session.current_level} of {session.total_levels}
        </div>
      )}
      {isBreak && (
        <div className="text-xs text-blue-500 mt-1">Resumes at Level 5</div>
      )}
    </div>
  );
}