import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, Coffee } from "lucide-react";

function useCountdown(startTimestamp, durationMinutes) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!startTimestamp || !durationMinutes) {
      setTimeLeft(null);
      return;
    }
    const endTime = new Date(startTimestamp).getTime() + durationMinutes * 60 * 1000;

    const tick = () => setTimeLeft(Math.max(0, endTime - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTimestamp, durationMinutes]);

  return timeLeft;
}

function formatTime(ms) {
  if (ms === null || ms === undefined) return "--:--";
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function GameClock() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    base44.entities.GameSession.filter({ is_open: true }, "-session_date", 5)
      .then(sessions => {
        setSession(sessions.find(s => s.clock_is_running) || null);
      });

    const unsub = base44.entities.GameSession.subscribe(event => {
      if (event.type === "update") {
        if (event.data.is_open && event.data.clock_is_running) {
          setSession(event.data);
        } else {
          setSession(prev => prev?.id === event.id ? null : prev);
        }
      } else if (event.type === "delete") {
        setSession(prev => prev?.id === event.id ? null : prev);
      }
    });
    return () => unsub();
  }, []);

  const currentLevelDef = session?.level_definitions?.[session.current_level_index || 0];
  const breakTimeLeft = useCountdown(
    session?.is_break_active ? session.current_level_start_timestamp : null,
    session?.is_break_active ? 15 : null
  );
  const levelTimeLeft = useCountdown(
    !session?.is_break_active ? session?.current_level_start_timestamp : null,
    !session?.is_break_active ? (currentLevelDef?.duration_minutes || 15) : null
  );

  if (!session) return null;

  const levelNumber = (session.current_level_index || 0) + 1;
  const totalLevels = session.level_definitions?.length || session.total_levels || 8;

  if (session.is_break_active) {
    return (
      <div className="rounded-xl border border-amber-700/50 bg-gradient-to-r from-amber-900/30 to-amber-950/50 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-900/60 rounded-lg flex items-center justify-center shrink-0">
              <Coffee className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-amber-400 font-bold text-lg leading-tight">BREAK TIME</div>
              <div className="text-amber-600 text-sm">Resumes at Level 5</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-amber-300 font-mono text-4xl font-bold tracking-wider">{formatTime(breakTimeLeft)}</div>
            <div className="text-amber-700 text-xs">remaining</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-900/40 bg-gradient-to-r from-red-900/20 to-red-950/60 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900/60 rounded-lg flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">Level {levelNumber}</div>
            <div className="text-gray-400 text-sm">of {totalLevels} · {currentLevelDef?.duration_minutes || 15} min</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-red-300 font-mono text-4xl font-bold tracking-wider">{formatTime(levelTimeLeft)}</div>
          <div className="text-gray-500 text-xs">remaining</div>
        </div>
      </div>
    </div>
  );
}