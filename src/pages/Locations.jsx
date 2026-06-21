import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { externalApi } from "@/functions/externalApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Clock, Plus, Trash2, Camera, Loader2, X, Pencil, ChevronDown, Trophy } from "lucide-react";

function toTitleCase(name = "") {
  return name.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function LocationLeaderboard({ locationName }) {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (board) return;
    setLoading(true);
    const res = await externalApi({ action: "getLocationLeaderboards", params: {} });
    setBoard((res?.locations?.[locationName]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex justify-center py-4">
      <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
    </div>
  );

  if (!board || board.length === 0) return (
    <p className="text-white/30 text-sm text-center py-4">No game history yet</p>
  );

  return (
    <div className="flex flex-col gap-1 pt-1">
      <div className="flex items-center px-1 mb-1">
        <div className="w-6 shrink-0" />
        <div className="w-8 shrink-0" />
        <div className="flex-1" />
        <span className="text-[10px] text-white/20 uppercase tracking-widest w-8 text-center">W</span>
        <span className="text-[10px] text-white/20 uppercase tracking-widest w-12 text-right">Games</span>
      </div>
      {board.map(entry => (
        <div key={entry.id} className="flex items-center gap-2 px-1 py-2 rounded-lg"
          style={{ background: "rgba(255,255,255,0.02)" }}>
          <span className="w-6 text-center text-xs font-bold text-white/20 tabular-nums">{entry.rank}</span>
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)" }}>
            {entry.profile_picture
              ? <img src={entry.profile_picture} alt={entry.name} className="w-full h-full object-cover" />
              : toTitleCase(entry.name)?.[0]}
          </div>
          <span className="flex-1 text-sm text-white/75 font-medium truncate">{toTitleCase(entry.name)}</span>
          <span className="w-8 text-center text-sm text-white/40 tabular-nums">{entry.wins || "—"}</span>
          <span className="w-12 text-right text-sm text-white/30 tabular-nums">{entry.games}</span>
        </div>
      ))}
    </div>
  );
}

const emptyForm = { name: "", address: "", game_time: "", description: "", image_url: "" };

const CARD = "w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3";

function LocationForm({ initial, onSave, onCancel, title }) {
  const [form, setForm] = useState(initial || emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef();

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, image_url: file_url }));
    setUploadingImage(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 mb-4">
      <h2 className="text-base font-semibold text-white mb-3">{title}</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          placeholder="Venue Name *"
          value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          required
          className="h-12 px-4 text-base rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/30"
        />
        <Input
          placeholder="Address"
          value={form.address}
          onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
          className="h-12 px-4 text-base rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/30"
        />
        <Input
          placeholder="Game Time (e.g. Every Sunday at 7:00 PM)"
          value={form.game_time}
          onChange={e => setForm(p => ({ ...p, game_time: e.target.value }))}
          className="h-12 px-4 text-base rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/30"
        />
        <Textarea
          placeholder="Additional info..."
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          className="h-24 px-4 py-3 text-base rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/30"
        />

        <div>
          {form.image_url ? (
            <div className="relative inline-block">
              <img src={form.image_url} alt="preview" className="w-36 h-24 object-cover rounded-lg border border-white/10" />
              <button type="button" onClick={() => setForm(p => ({ ...p, image_url: "" }))}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 hover:bg-red-800/80 transition-colors">
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-base transition-colors"
              style={{ border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)" }}
            >
              {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {uploadingImage ? "Uploading..." : "Upload Photo"}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onCancel}
            className="flex-1 h-12 px-4 rounded-xl text-base font-medium transition-colors border border-white/10 bg-white/[0.05] text-white/65 hover:text-white hover:bg-white/[0.08]">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 h-12 px-4 rounded-xl text-base font-medium transition-all border border-white/10 bg-white/[0.08] text-white hover:bg-white/[0.12]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedLeaderboard, setExpandedLeaderboard] = useState(null);

useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [locs, user] = await Promise.all([
      base44.entities.Location.list(),
      base44.auth.me().catch(() => null)
    ]);
    
    setLocations(locs);
    setIsAdmin(user?.role === "admin");
    setLoading(false);
  };

  const handleAdd = async (form) => {
    await base44.entities.Location.create(form);
    setShowAddForm(false);
    await loadData();
  };

  const handleEdit = async (form) => {
    await base44.entities.Location.update(editingId, form);
    setEditingId(null);
    await loadData();
  };

  const handleDelete = async (id) => {
    await base44.entities.Location.delete(id);
    setLocations(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="min-h-screen relative" style={{ background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)" }}>
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08), transparent 70%)" }} />

      <div className="relative w-full px-4 pt-6 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-white/80" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight leading-none">Locations</h1>
              <p className="text-base text-white/50 mt-1 leading-none">Where we play</p>
            </div>
          </div>
          {isAdmin && !showAddForm && !editingId && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors border border-white/10 bg-white/[0.05]"
            >
              <Plus className="w-5 h-5 text-white/80" />
            </button>
          )}
        </div>

        {/* Add Form */}
        {showAddForm && (
          <LocationForm title="New Location" onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
        )}

        {/* List */}
        {loading ? (
          <div className="text-center py-16 text-gray-600 text-base">Loading...</div>
        ) : locations.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="w-10 h-10 mx-auto mb-3 text-gray-800" />
            <p className="text-gray-600 text-base">No locations added yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {[...locations]
              .sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99))
              .map((loc) => (
                editingId === loc.id ? (
                  <LocationForm
                    key={loc.id}
                    title="Edit Location"
                    initial={{ name: loc.name, address: loc.address, game_time: loc.game_time, description: loc.description, image_url: loc.image_url }}
                    onSave={handleEdit}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div key={loc.id} className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.05]">
                    {loc.image_url && (
                      <img src={loc.image_url} alt={loc.name} className="w-full h-36 object-cover" />
                    )}
                    <div className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-base font-semibold text-white leading-tight">{loc.name}</span>
                        {isAdmin && (
                          <div className="flex gap-1 shrink-0 mt-0.5">
                            <button
                              onClick={() => { setEditingId(loc.id); setShowAddForm(false); }}
                              className="w-6 h-6 flex items-center justify-center rounded transition-colors text-white/20 hover:text-white/60"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(loc.id)}
                              className="w-6 h-6 flex items-center justify-center rounded transition-colors text-white/20 hover:text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {loc.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
                            <span className="text-base text-white/65 leading-snug">{loc.address}</span>
                          </div>
                        )}
                        {loc.game_time && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-white/30 shrink-0" />
                            <span className="text-base text-white/65">{loc.game_time}</span>
                          </div>
                        )}
                      </div>
                      {loc.description && (
                        <p className="text-white/50 text-base mt-2 leading-relaxed">{loc.description}</p>
                      )}
                    </div>

                    {/* Top 10 leaderboard toggle */}
                    <button
                      className="w-full flex items-center justify-between px-4 py-2.5 border-t border-white/8 hover:bg-white/[0.02] transition-colors"
                      onClick={() => setExpandedLeaderboard(expandedLeaderboard === loc.id ? null : loc.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 text-white/30" />
                        <span className="text-sm text-white/50 font-medium">Top Players</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-white/25 transition-transform duration-200 ${expandedLeaderboard === loc.id ? "rotate-180" : ""}`} />
                    </button>

                    {expandedLeaderboard === loc.id && (
                      <div className="px-4 pb-3">
                        <LocationLeaderboard locationName={loc.name} />
                      </div>
                    )}
                  </div>
                )
              ))
            }
          </div>
        )}
        </div>
        </div>
        );
        }