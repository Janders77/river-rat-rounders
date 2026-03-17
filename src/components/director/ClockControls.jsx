import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, SkipForward, SkipBack, Coffee, Clock, Loader2, X } from "lucide-react";

export default function ClockControls({ session, onSessionUpdate }) {
  const [saving, setSaving] = useState(false);
  const [levelInput, setLevelInput] = useState("");
  const [durationInput, setDurationInput] = useState("");
  const [totalLevelsInput, setTotalLevelsInput] = useState("");

  if (!session) return null;

  const update = async (fields) => {
    setSaving(true);
    await base44.entities.GameSession.update(session.id, fields);
    onSessionUpdate && onSessionUpdate({ ...session, ...fields });
    setSaving(false);
  };

  const handleStartClock = () => {
    const now = new Date().toISOString();
    const fields = { is_clock_running: true };
    if (!session.current_level_start_timestamp) {
      fields.current_level_start_timestamp = now;
      fields.current_level = session.current_level || 1;
    }
    if (!session.scheduled_start_time) {
      fields.scheduled_start_time = now;
    }
    update(fields);
  };

  const handleAdjustLevel = (e) => {
    e.preventDefault();
    const lvl = parseInt(levelInput);
    if (!lvl || lvl < 1) return;
    update({ current_level: lvl, current_level_start_timestamp: new Date().toISOString() });
    setLevelInput("");
  };

  const handleAdjustDuration = (e) => {
    e.preventDefault();
    const dur = parseInt(durationInput);
    if (!dur || dur < 1) return;
    update({ level_duration_minutes: dur });
    setDurationInput("");
  };

  const handleAdjustTotalLevels = (e) => {
    e.preventDefault();
    const total = parseInt(totalLevelsInput);
    if (!total || total < 1) return;
    update({ total_levels: total });
    setTotalLevelsInput("");
  };

  const handleStartBreak = () => update({
    is_break_active: true,
    break_start_timestamp: new Date().toISOString(),
    has_taken_break: true,
  });

  const handleEndBreak = () => update({
    is_break_active: false,
    break_start_timestamp: null,
    current_level: 5,
    current_level_start_timestamp: new Date().toISOString(),
  });

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
        <div className="w-10 h-10 bg-gray-900/60 rounded-lg flex items-center justify-center">
          <Clock className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Game Clock</h2>
          <p className="text-xs text-gray-500">
            {session.is_clock_running
              ? session.is_break_active ? "🟡 On Break" : `▶ Running — Level ${session.current_level}`
              : "⏸ Paused"}
          </p>
        </div>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-auto" />}
      </div>

      {/* Start / Pause */}
      <div className="flex gap-3">
        {session.is_clock_running ? (
          <Button onClick={() => update({ is_clock_running: false })} disabled={saving} className="flex-1 bg-yellow-700 hover:bg-yellow-600 text-white">
            <Pause className="w-4 h-4 mr-2" /> Pause Clock
          </Button>
        ) : (
          <Button onClick={handleStartClock} disabled={saving} className="flex-1 bg-green-700 hover:bg-green-600 text-white">
            <Play className="w-4 h-4 mr-2" /> {session.current_level_start_timestamp ? "Resume" : "Start"} Clock
          </Button>
        )}
      </div>

      {/* Level navigation */}
      <div className="flex gap-3">
        <Button
          onClick={() => update({ current_level: Math.max(1, (session.current_level || 1) - 1), current_level_start_timestamp: new Date().toISOString() })}
          disabled={saving} variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:text-white">
          <SkipBack className="w-4 h-4 mr-1" /> Prev Level
        </Button>
        <Button
          onClick={() => update({ current_level: (session.current_level || 1) + 1, current_level_start_timestamp: new Date().toISOString() })}
          disabled={saving} variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:text-white">
          <SkipForward className="w-4 h-4 mr-1" /> Next Level
        </Button>
      </div>

      {/* Break controls */}
      <div>
        {session.is_break_active ? (
          <Button onClick={handleEndBreak} disabled={saving} className="w-full bg-blue-700 hover:bg-blue-600 text-white">
            <X className="w-4 h-4 mr-2" /> End Break (→ Level 5)
          </Button>
        ) : (
          <Button onClick={handleStartBreak} disabled={saving} variant="outline" className="w-full border-blue-700 text-blue-300 hover:bg-blue-900/30">
            <Coffee className="w-4 h-4 mr-2" /> Start Break
          </Button>
        )}
      </div>

      {/* Adjust current level */}
      <form onSubmit={handleAdjustLevel} className="space-y-1">
        <Label className="text-gray-400 text-xs">Jump to Level</Label>
        <div className="flex gap-2">
          <Input type="number" min="1" placeholder={`Current: ${session.current_level || 1}`}
            value={levelInput} onChange={e => setLevelInput(e.target.value)}
            className="bg-gray-900 border-gray-700 text-white" />
          <Button type="submit" disabled={saving} className="bg-red-700 hover:bg-red-600 text-white shrink-0">Set</Button>
        </div>
      </form>

      {/* Adjust level duration */}
      <form onSubmit={handleAdjustDuration} className="space-y-1">
        <Label className="text-gray-400 text-xs">Level Duration (minutes)</Label>
        <div className="flex gap-2">
          <Input type="number" min="1" placeholder={`Current: ${session.level_duration_minutes || 15} min`}
            value={durationInput} onChange={e => setDurationInput(e.target.value)}
            className="bg-gray-900 border-gray-700 text-white" />
          <Button type="submit" disabled={saving} className="bg-red-700 hover:bg-red-600 text-white shrink-0">Set</Button>
        </div>
      </form>

      {/* Adjust total levels */}
      <form onSubmit={handleAdjustTotalLevels} className="space-y-1">
        <Label className="text-gray-400 text-xs">Total Levels</Label>
        <div className="flex gap-2">
          <Input type="number" min="1" placeholder={`Current: ${session.total_levels || 10}`}
            value={totalLevelsInput} onChange={e => setTotalLevelsInput(e.target.value)}
            className="bg-gray-900 border-gray-700 text-white" />
          <Button type="submit" disabled={saving} className="bg-red-700 hover:bg-red-600 text-white shrink-0">Set</Button>
        </div>
      </form>
    </div>
  );
}