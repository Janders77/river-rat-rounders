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
      <div className="p-4 rounded-lg bg-[#1A1B20] border border-amber-500/50 space-y-3">
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
      className={`p-4 rounded-lg bg-[#1A1B20] border border-gray-800 ${
        isAdmin ? "cursor-pointer hover:border-amber-500/30 transition-colors" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
          {player.player_number ?? "?"}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="text-white font-medium truncate">{player.first_name} {player.last_name}</div>
          <div className="text-gray-400 text-xs break-all">{player.email}</div>
          {(player.card_guards > 0 || player.date_joined) && (
            <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-gray-500">
              {player.card_guards > 0 && <span className="text-amber-400">🛡️ {player.card_guards}</span>}
              {player.date_joined && <span>{new Date(player.date_joined).toLocaleDateString("en-US", {month:"short", year:"numeric"})}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link
            to={`${createPageUrl("PlayerProfile")}?email=${player.email}`}
            onClick={e => e.stopPropagation()}
            className="p-2 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </Link>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(player.id);
              }}
              className="text-gray-600 hover:text-red-400 hover:bg-red-400/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}