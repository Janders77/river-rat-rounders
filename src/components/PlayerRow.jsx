import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
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

  const initials = `${player.first_name?.[0] || ""}${player.last_name?.[0] || ""}`.toUpperCase();

  if (editing && isAdmin) {
    return (
      <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,200,100,0.25)" }}>
        <div className="flex gap-2">
          <Input placeholder="First name" value={form.first_name}
            onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
            className="bg-black/20 border-white/10 text-white flex-1" />
          <Input placeholder="Last name" value={form.last_name}
            onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
            className="bg-black/20 border-white/10 text-white flex-1" />
        </div>
        <Input type="email" placeholder="Email" value={form.email}
          onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          className="bg-black/20 border-white/10 text-white w-full" />
        <div className="flex gap-2">
          <Input type="number" placeholder="Card guards" value={form.card_guards}
            onChange={e => setForm(p => ({ ...p, card_guards: parseInt(e.target.value) || 0 }))}
            className="bg-black/20 border-white/10 text-white flex-1" />
          <Input type="date" value={form.date_joined}
            onChange={e => setForm(p => ({ ...p, date_joined: e.target.value }))}
            className="bg-black/20 border-white/10 text-white flex-1 [color-scheme:dark]" />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={handleCancel} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-base text-white/40 transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-base font-semibold text-white transition-colors"
            style={{ background: "rgba(255,200,100,0.15)", border: "1px solid rgba(255,200,100,0.25)" }}>
            <Check className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => isAdmin && setEditing(true)}
      className={`w-full rounded-xl px-3 py-2.5 flex items-center gap-3 ${isAdmin ? "cursor-pointer" : ""}`}
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-base font-bold text-white/40"
        style={{ background: "rgba(255,255,255,0.06)" }}>
        {player.profile_picture
          ? <img src={player.profile_picture} alt={initials} className="w-full h-full object-cover" />
          : (initials || "?")}
      </div>

      {/* Text column */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-white font-medium text-base truncate min-w-0">
            {player.first_name} {player.last_name}
          </span>
          {player.player_number != null && (
            <span className="text-white/30 font-mono text-sm shrink-0">{player.player_number}</span>
          )}
          {player.card_guards > 0 && (
            <span className="text-base text-amber-400/70 shrink-0">🛡️{player.card_guards}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      {isAdmin && (
        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
          <Link to={`${createPageUrl("PlayerProfile")}?email=${player.email}`}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-white/20 hover:text-white/60"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <Eye className="w-3.5 h-3.5" />
          </Link>
          <button onClick={() => onDelete(player.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-white/20 hover:text-red-400"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}