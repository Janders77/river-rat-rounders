import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Clock, Plus, Trash2, Camera, Loader2, X, Pencil } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const emptyForm = { name: "", address: "", game_time: "", description: "", image_url: "" };

const CARD = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};

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
    <div className="rounded-xl mb-6 p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
      <h2 className="text-white font-semibold text-base mb-4">{title}</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          placeholder="Venue Name *"
          value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          required
          className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
        />
        <Input
          placeholder="Address"
          value={form.address}
          onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
          className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
        />
        <Input
          placeholder="Game Time (e.g. Every Sunday at 7:00 PM)"
          value={form.game_time}
          onChange={e => setForm(p => ({ ...p, game_time: e.target.value }))}
          className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
        />
        <Textarea
          placeholder="Additional info..."
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          className="bg-black/20 border-white/10 text-white placeholder:text-white/30 h-20"
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
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)" }}
            >
              {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {uploadingImage ? "Uploading..." : "Upload Photo"}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
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

  const handleDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.index === destination.index) return;
    const reorderedLocations = Array.from(locations);
    const [movedLocation] = reorderedLocations.splice(source.index, 1);
    reorderedLocations.splice(destination.index, 0, movedLocation);
    setLocations(reorderedLocations);
    
    // Save new order to database by updating display_order field
    for (let i = 0; i < reorderedLocations.length; i++) {
      await base44.entities.Location.update(reorderedLocations[i].id, { display_order: i });
    }
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [locs, user] = await Promise.all([
      base44.entities.Location.list("display_order"),
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
    <div className="min-h-screen relative" style={{ background: "linear-gradient(170deg, #14141c 0%, #1a1a26 60%, #14141c 100%)" }}>
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08), transparent 70%)" }} />

      <div className="relative max-w-md mx-auto px-4 pt-5 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-white/80" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">Locations</h1>
              <p className="text-[10px] text-gray-600 mt-0.5 leading-none">Where we play</p>
            </div>
          </div>
          {isAdmin && !showAddForm && !editingId && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
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
          <div className="text-center py-16 text-gray-600 text-sm">Loading...</div>
        ) : locations.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="w-10 h-10 mx-auto mb-3 text-gray-800" />
            <p className="text-gray-600 text-sm">No locations added yet</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={isAdmin ? handleDragEnd : undefined}>
            <Droppable droppableId="locations" type="LOCATION" isDropDisabled={!isAdmin}>
              {(provided) => (
                <div
                  className="flex flex-col gap-2"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {locations.map((loc, index) => (
                    <Draggable key={loc.id} draggableId={loc.id} index={index} isDragDisabled={!isAdmin}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...(isAdmin ? provided.dragHandleProps : {})}
                          style={{ opacity: snapshot.isDragging ? 0.6 : 1, ...provided.draggableProps.style }}
                        >
                          {editingId === loc.id ? (
                            <LocationForm
                              title="Edit Location"
                              initial={{ name: loc.name, address: loc.address, game_time: loc.game_time, description: loc.description, image_url: loc.image_url }}
                              onSave={handleEdit}
                              onCancel={() => setEditingId(null)}
                            />
                          ) : (
                            <div className="rounded-xl overflow-hidden" style={CARD}>
                              {loc.image_url && (
                                <img src={loc.image_url} alt={loc.name} className="w-full h-36 object-cover" />
                              )}
                              <div className="px-3.5 py-3">
                                {/* Name row */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <span className="text-white font-semibold text-sm leading-tight">{loc.name}</span>
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

                                {/* Metadata */}
                                <div className="flex flex-col gap-1">
                                  {loc.address && (
                                    <div className="flex items-start gap-1.5">
                                      <MapPin className="w-3 h-3 text-white/30 shrink-0 mt-0.5" />
                                      <span className="text-xs text-white/40 leading-snug">{loc.address}</span>
                                    </div>
                                  )}
                                  {loc.game_time && (
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="w-3 h-3 text-white/30 shrink-0" />
                                      <span className="text-xs text-white/40">{loc.game_time}</span>
                                    </div>
                                  )}
                                </div>

                                {loc.description && (
                                  <p className="text-white/30 text-xs mt-2 leading-relaxed">{loc.description}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}