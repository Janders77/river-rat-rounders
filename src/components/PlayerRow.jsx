import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Check, X, Eye } from "lucide-react";

export default function PlayerRow({ player, isAdmin, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: player.first_name,
    last_name: player.last_name,
    email: player.email,
    card_guards: player.card_guards || 0,
    date_joined: player.date_joined || "",
  });

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Player.update(player.id, form);
    onUpdate(player.id, form);
    setEditing(false);
    setSaving(false);
  };

  const handleCancel = () => {
    setForm({
      first_name: player.first_name,
      last_name: player.last_name,
      email: player.email,
      card_guards: player.card_guards || 0,
      date_joined: player.date_joined || "",
    });
    setEditing(false);
  };

  if (editing && isAdmin) {
    return (
      <div className="p-4 rounded-lg bg-transparent border border-amber-500/50 space-y-3">
        <div className="flex gap-3">
          <Input
            placeholder="First name"
            value={form.first_name}
            onChange={(e) => setForm(prev => ({ ...prev, first_name: e.target.value }))}
            className="bg-gray-900 border-gray-700 text-white flex-1"
          />
          <Input
            placeholder="Last name"
            value={form.last_name}
            onChange={(e) => setForm(prev => ({ ...prev, last_name: e.target.value }))}
            className="bg-gray-900 border-gray-700 text-white flex-1"
          />
        </div>
        <Input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
          className="bg-gray-900 border-gray-700 text-white w-full"
        />
        <div className="flex gap-3">
          <Input
            type="number"
            placeholder="Card guards"
            value={form.card_guards}
            onChange={(e) => setForm(prev => ({ ...prev, card_guards: parseInt(e.target.value) || 0 }))}
            className="bg-gray-900 border-gray-700 text-white flex-1"
          />
          <Input
            type="date"
            value={form.date_joined}
            onChange={(e) => setForm(prev => ({ ...prev, date_joined: e.target.value }))}
            className="bg-gray-900 border-gray-700 text-white flex-1"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={saving}
            className="border-gray-700 text-gray-400"
          >
            <X className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            <Check className="w-4 h-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => isAdmin && setEditing(true)}
      className={`p-2 rounded-lg bg-transparent border border-red-500/30 w-full overflow-hidden transition-colors ${
        isAdmin ? "cursor-pointer hover:border-red-400/70" : ""
      }`}
    >
      <div className="flex items-center gap-1.5 w-full min-w-0">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shrink-0" style={{fontSize: player.player_number >= 1000 ? "9px" : player.player_number >= 100 ? "10px" : "12px", letterSpacing: "0", fontFamily: "monospace"}}>
          {player.player_number ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-medium text-sm truncate min-w-0">{player.first_name} {player.last_name}</span>
            {player.card_guards > 0 && <span className="text-amber-400 text-xs shrink-0">🛡️{player.card_guards}</span>}
          </div>
          <div className="text-gray-400 text-xs truncate w-full">{player.email}</div>
        </div>
        <div className="flex items-center shrink-0">
          {isAdmin && (
            <>
              <Link
                to={`${createPageUrl("PlayerProfile")}?email=${player.email}`}
                onClick={e => e.stopPropagation()}
                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(player.id);
                }}
                className="text-gray-600 hover:text-red-400 hover:bg-red-400/10 h-7 w-7"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}