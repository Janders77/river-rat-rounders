import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Clock, Plus, Trash2, Camera, Loader2, X, Pencil } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const emptyForm = { name: "", address: "", game_time: "", description: "", image_url: "" };

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
    <Card className="bg-gray-900/80 border-amber-500/30 mb-8">
      <CardContent className="p-6">
        <h2 className="text-white font-bold text-lg mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Venue Name *"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            required
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
          />
          <Input
            placeholder="Address"
            value={form.address}
            onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
          />
          <Input
            placeholder="Game Time (e.g. Every Sunday at 7:00 PM)"
            value={form.game_time}
            onChange={e => setForm(p => ({ ...p, game_time: e.target.value }))}
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
          />
          <Textarea
            placeholder="Additional info..."
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 h-24"
          />

          {/* Image upload */}
          <div>
            {form.image_url ? (
              <div className="relative inline-block">
                <img src={form.image_url} alt="preview" className="w-40 h-28 object-cover rounded-lg border border-gray-700" />
                <button type="button" onClick={() => setForm(p => ({ ...p, image_url: "" }))} className="absolute top-1 right-1 bg-red-600 rounded-full p-0.5">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-gray-600 text-gray-400 hover:border-amber-500 hover:text-amber-400 transition-colors"
              >
                {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {uploadingImage ? "Uploading..." : "Upload Photo"}
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
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
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [locs, user] = await Promise.all([
      base44.entities.Location.list("created_date"),
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
    <div className="min-h-screen p-6 bg-green-900/30">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Locations</h1>
              <p className="text-gray-400 text-sm">Where we play</p>
            </div>
          </div>
          {isAdmin && !showAddForm && !editingId && (
            <Button
              onClick={() => setShowAddForm(true)}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Location
            </Button>
          )}
        </div>

        {/* Add Location Form */}
        {showAddForm && (
          <LocationForm
            title="New Location"
            onSave={handleAdd}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* Locations Grid */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading...</div>
        ) : locations.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No locations added yet</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="locations" type="LOCATION">
              {(provided, snapshot) => (
                <div
                  className="grid gap-6 md:grid-cols-2 justify-items-center"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    backgroundColor: snapshot.isDraggingOver ? "rgba(217, 119, 6, 0.1)" : "transparent",
                    borderRadius: "8px",
                    padding: "8px",
                    transition: "background-color 0.2s"
                  }}
                >
                  {locations.map((loc, index) => (
                    <Draggable key={loc.id} draggableId={loc.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="w-full"
                          style={{
                            opacity: snapshot.isDragging ? 0.5 : 1,
                            ...provided.draggableProps.style
                          }}
                        >
                {editingId === loc.id ? (
                  <LocationForm
                    title="Edit Location"
                    initial={{ name: loc.name, address: loc.address, game_time: loc.game_time, description: loc.description, image_url: loc.image_url }}
                    onSave={handleEdit}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <Card className="bg-gray-900/70 border-gray-800 overflow-hidden">
                    {loc.image_url && (
                      <img src={loc.image_url} alt={loc.name} className="w-full h-48 object-cover" />
                    )}
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <h3 className="text-xl font-bold text-white mb-3">{loc.name}</h3>
                        {isAdmin && (
                          <div className="flex gap-2 ml-2 shrink-0">
                            <button onClick={() => { setEditingId(loc.id); setShowAddForm(false); }} className="text-gray-500 hover:text-amber-400 transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(loc.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {loc.address && (
                        <div className="flex items-start gap-2 text-gray-400 mb-2">
                          <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                          <span className="text-sm">{loc.address}</span>
                        </div>
                      )}
                      {loc.game_time && (
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                          <Clock className="w-4 h-4 shrink-0 text-amber-500" />
                          <span className="text-sm">{loc.game_time}</span>
                        </div>
                      )}
                      {loc.description && (
                        <p className="text-gray-500 text-sm mt-3 leading-relaxed">{loc.description}</p>
                      )}
                    </CardContent>
                  </Card>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}