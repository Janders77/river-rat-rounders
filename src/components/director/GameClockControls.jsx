import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Play, Square, ChevronLeft, ChevronRight, Coffee, Plus, Trash2, Loader2 } from "lucide-react";

const DEFAULT_LEVEL_COUNT = 8;
const DEFAULT_DURATION = 15;

function buildDefaultLevels(count, duration) {
  return Array.from({ length: count }, (_, i) => ({
    level_number: i + 1,
    duration_minutes: duration
  }));
}

export default function GameClockControls({ session, onSessionUpdate }) {
  const [saving, setSaving] = useState(false);
  const [editLevels, setEditLevels] = useState(null); // null = closed, array = editing

  if (!session) return null;

  const levelDefs = session.level_definitions || [];
  const currentIndex = session.current_level_index || 0;
  const totalLevels = levelDefs.length;

  const update = async (data) => {
    setSaving(true);
    await base44.entities.GameSession.update(session.id, data);
    onSessionUpdate && onSessionUpdate({ ...session, ...data });
    setSaving(false);
  };

  const handleStartClock = async () => {
    const levels = levelDefs.length > 0 ? levelDefs : buildDefaultLevels(DEFAULT_LEVEL_COUNT, DEFAULT_DURATION);
    await update({
      clock_is_running: true,
      current_level_index: 0,
      current_level_start_timestamp: new Date().toISOString(),
      is_break_active: false,
      has_taken_break: false,
      level_definitions: levels
    });
  };

  const handleStopClock = () => update({ clock_is_running: false, is_break_active: false });

  const handlePrevLevel = () => {
    if (currentIndex <= 0) return;
    update({ current_level_index: currentIndex - 1, current_level_start_timestamp: new Date().toISOString(), is_break_active: false });
  };

  const handleNextLevel = () => {
    if (currentIndex >= totalLevels - 1) return;
    update({ current_level_index: currentIndex + 1, current_level_start_timestamp: new Date().toISOString(), is_break_active: false });
  };

  const handleToggleBreak = () => {
    if (session.is_break_active) {
      update({ is_break_active: false, current_level_start_timestamp: new Date().toISOString() });
    } else {
      update({ is_break_active: true, has_taken_break: true, current_level_start_timestamp: new Date().toISOString() });
    }
  };

  const openLevelEditor = () => {
    const existing = levelDefs.length > 0 ? levelDefs : buildDefaultLevels(DEFAULT_LEVEL_COUNT, DEFAULT_DURATION);
    setEditLevels(existing.map(l => ({ ...l })));
  };

  const saveLevels = async () => {
    await update({ level_definitions: editLevels });
    setEditLevels(null);
  };

  return (
    <div className="mt-4 space-y-3 border-t border-gray-800 pt-4">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-red-400" />
        <span className="text-sm font-semibold text-white">Game Clock</span>
        {saving && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
      </div>

      {/* Clock Status */}
      {session.clock_is_running && (
        <div className="flex items-center justify-between text-xs text-gray-400 bg-gray-900/60 rounded-lg px-3 py-2">
          <span>{session.is_break_active ? "🛑 Break Active" : `▶ Level ${currentIndex + 1} of ${totalLevels}`}</span>
          <span className="text-gray-500">{levelDefs[currentIndex]?.duration_minutes || 15} min</span>
        </div>
      )}

      {/* Main Controls */}
      <div className="flex flex-wrap gap-2">
        {!session.clock_is_running ? (
          <Button size="sm" onClick={handleStartClock}
            className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-3">
            <Play className="w-3.5 h-3.5 mr-1" /> Start Clock
          </Button>
        ) : (
          <Button size="sm" onClick={handleStopClock}
            className="border border-red-500 text-red-400 hover:bg-red-600/20 bg-transparent rounded-lg px-3">
            <Square className="w-3.5 h-3.5 mr-1" /> Stop Clock
          </Button>
        )}

        {session.clock_is_running && (
          <>
            <Button size="sm" onClick={handlePrevLevel} disabled={currentIndex <= 0}
              className="border border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent rounded-lg px-3">
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
            </Button>
            <Button size="sm" onClick={handleNextLevel} disabled={currentIndex >= totalLevels - 1}
              className="border border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent rounded-lg px-3">
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
            <Button size="sm" onClick={handleToggleBreak}
              className="border border-amber-700 text-amber-400 hover:bg-amber-900/20 bg-transparent rounded-lg px-3">
              <Coffee className="w-3.5 h-3.5 mr-1" /> {session.is_break_active ? "End Break" : "Break"}
            </Button>
          </>
        )}

        <Button size="sm" onClick={openLevelEditor}
          className="border border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent rounded-lg px-3">
          Edit Levels
        </Button>
      </div>

      {/* Level Editor */}
      {editLevels && (
        <div className="space-y-2 bg-gray-900/60 rounded-xl p-3 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white">Level Definitions</span>
            <Button size="sm" variant="ghost"
              onClick={() => setEditLevels(prev => [...prev, { level_number: prev.length + 1, duration_minutes: DEFAULT_DURATION }])}
              className="text-red-400 hover:text-red-300 h-6 px-2 text-xs">
              <Plus className="w-3 h-3 mr-1" /> Add Level
            </Button>
          </div>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {editLevels.map((lvl, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-14 shrink-0">Level {i + 1}</span>
                <Input
                  type="number" min="1" max="60"
                  value={lvl.duration_minutes}
                  onChange={e => setEditLevels(prev => prev.map((l, j) => j === i ? { ...l, duration_minutes: parseInt(e.target.value) || DEFAULT_DURATION } : l))}
                  className="bg-gray-800 border-gray-700 text-white h-7 text-xs w-20"
                />
                <span className="text-xs text-gray-600">min</span>
                <Button size="icon" variant="ghost"
                  onClick={() => setEditLevels(prev => prev.filter((_, j) => j !== i).map((l, j) => ({ ...l, level_number: j + 1 })))}
                  className="text-gray-600 hover:text-red-400 h-6 w-6">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={saveLevels}
              className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-3 text-xs">Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditLevels(null)}
              className="text-gray-400 hover:text-white text-xs">Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}