import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { getPlayerDisplayName, buildPlayersById } from "@/utils/playerUtils";
import { searchPlayers } from "@/functions/searchPlayers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X, Trophy, Search } from "lucide-react";

const POINTS = [1000, 750, 600, 500, 400, 300, 200, 100, 50];
const PLACE_LABELS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];

function getQuarter(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

export default function EditGameModal({ game, playersById, onClose, onSaved }) {
  const [placements, setPlacements] = useState([...( game.player_ids || []), ...Array(9).fill("")].slice(0, 9));
  const [searches, setSearches] = useState(Array(9).fill(""));
  const [suggestions, setSuggestions] = useState(Array(9).fill([]));
  const [searchLoading, setSearchLoading] = useState(Array(9).fill(false));
  const [isSaving, setIsSaving] = useState(false);
  const [localPlayersById, setLocalPlayersById] = useState({ ...playersById });

  // Resolve name for a player id
  const nameFor = (pid) => {
    if (!pid) return "";
    const p = localPlayersById[pid];
    return p ? getPlayerDisplayName(p) : pid;
  };

  const handleSearchChange = async (index, value) => {
    const s = [...searches]; s[index] = value; setSearches(s);
    const p = [...placements]; p[index] = ""; setPlacements(p);
    if (value.trim().length < (/^\d+$/.test(value.trim()) ? 1 : 2)) {
      const sg = [...suggestions]; sg[index] = []; setSuggestions(sg);
      return;
    }
    const l = [...searchLoading]; l[index] = true; setSearchLoading(l);
    const res = await searchPlayers({ query: value.trim() });
    const results = res.data?.players || [];
    // Cache fetched players locally
    const newMap = { ...localPlayersById };
    results.forEach(p => { newMap[p.id] = p; });
    setLocalPlayersById(newMap);
    const sg = [...suggestions]; sg[index] = results; setSuggestions(sg);
    const l2 = [...searchLoading]; l2[index] = false; setSearchLoading(l2);
  };

  const selectPlayer = (index, player) => {
    const p = [...placements];
    // Dedup: clear any other slot that has this player
    for (let j = 0; j < p.length; j++) { if (p[j] === player.id) p[j] = ""; }
    p[index] = player.id;
    setPlacements(p);
    const s = [...searches]; s[index] = ""; setSearches(s);
    const sg = [...suggestions]; sg[index] = []; setSuggestions(sg);
  };

  const clearSlot = (index) => {
    const p = [...placements]; p[index] = ""; setPlacements(p);
    const s = [...searches]; s[index] = ""; setSearches(s);
  };

  const handleSave = async () => {
    const filledIds = placements.filter(Boolean);
    if (filledIds.length < 1) { alert("At least 1st place is required."); return; }

    setIsSaving(true);

    // --- Subtract old stats ---
    const oldQuarter = getQuarter(game.game_date);
    const oldIds = game.player_ids || [];
    for (let i = 0; i < oldIds.length; i++) {
      const pid = oldIds[i];
      const oldPts = POINTS[i] || 0;
      const wasWin = i === 0;
      const existing = await base44.entities.QuarterlyStats.filter({ quarter: oldQuarter, player_id: pid });
      if (existing.length > 0) {
        const rec = existing[0];
        const newPts = Math.max(0, (rec.points || 0) - oldPts);
        const newWins = Math.max(0, (rec.wins || 0) - (wasWin ? 1 : 0));
        if (newPts === 0 && newWins === 0) {
          await base44.entities.QuarterlyStats.delete(rec.id);
        } else {
          await base44.entities.QuarterlyStats.update(rec.id, { points: newPts, wins: newWins });
        }
      }
    }

    // --- Update Game record ---
    const winnerPlayer = localPlayersById[filledIds[0]];
    await base44.entities.Game.update(game.id, {
      player_ids: filledIds,
      winner_player_id: filledIds[0],
      winner_name: winnerPlayer ? getPlayerDisplayName(winnerPlayer) : "",
      winner_email: winnerPlayer?.email || "",
      players: filledIds.map(id => localPlayersById[id]?.email || id),
      points_awarded: POINTS[0],
    });

    // --- Add new stats ---
    const newQuarter = getQuarter(game.game_date);
    for (let i = 0; i < filledIds.length; i++) {
      const pid = filledIds[i];
      const pts = POINTS[i] || 0;
      const isWin = i === 0;
      const playerRec = localPlayersById[pid];
      const existing = await base44.entities.QuarterlyStats.filter({ quarter: newQuarter, player_id: pid });
      if (existing.length > 0) {
        await base44.entities.QuarterlyStats.update(existing[0].id, {
          points: (existing[0].points || 0) + pts,
          wins: (existing[0].wins || 0) + (isWin ? 1 : 0),
        });
      } else {
        await base44.entities.QuarterlyStats.create({
          quarter: newQuarter,
          player_id: pid,
          player_email: playerRec?.email || "",
          player_name: playerRec ? getPlayerDisplayName(playerRec) : "",
          points: pts,
          wins: isWin ? 1 : 0,
        });
      }
    }

    setIsSaving(false);
    onSaved({ ...game, player_ids: filledIds, winner_player_id: filledIds[0] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div>
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Trophy className="w-4 h-4 text-red-400" /> Correct Game
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">
              {game.game_date} · {game.location} · {game.game_type}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500 mb-1">1st=1000pts, 2nd=750pts … 9th=50pts. QuarterlyStats will be updated automatically.</p>
          {PLACE_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-gray-500 text-xs w-7 text-right shrink-0">{label}</span>
              <span className="text-gray-700 text-xs w-14 shrink-0">{POINTS[i]}pts</span>
              <div className="relative flex-1">
                {placements[i] ? (
                  <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
                    <span className="text-white text-sm flex-1">{nameFor(placements[i])}</span>
                    <button type="button" onClick={() => clearSlot(i)} className="text-gray-500 hover:text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                      <Input
                        placeholder={`Search ${label}...`}
                        value={searches[i]}
                        onChange={e => handleSearchChange(i, e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white text-sm pl-8 h-8 rounded-lg"
                      />
                      {searchLoading[i] && (
                        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-gray-500" />
                      )}
                    </div>
                    {suggestions[i].length > 0 && (
                      <div className="absolute z-50 w-full mt-0.5 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-36 overflow-y-auto">
                        {suggestions[i].map(p => (
                          <button key={p.id} type="button"
                            className="w-full text-left px-3 py-1.5 hover:bg-gray-800 text-white text-sm border-b border-gray-800 last:border-0"
                            onMouseDown={() => selectPlayer(i, p)}>
                            {p.display_name}{p.player_number != null ? ` (#${p.player_number})` : ''}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-gray-800 flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1 text-gray-400 border border-gray-700">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white">
            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Correction"}
          </Button>
        </div>
      </div>
    </div>
  );
}