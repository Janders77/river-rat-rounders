import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Clock, Plus, Trash2, Camera, Loader2, X } from "lucide-react";

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef();

  const emptyForm = { name: "", address: "", game_time: "", description: "", image_url: "" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

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
    await base44.entities.Location.create(form);
    setForm(emptyForm);
    setShowForm(false);
    await loadData();
    setSaving(false);
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
          {isAdmin && (
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {showForm ? "Cancel" : "Add Location"}
            </Button>
          )}
        </div>

        {/* Add Location Form */}
        {showForm && (
          <Card className="bg-gray-900/80 border-amber-500/30 mb-8">
            <CardContent className="p-6">
              <h2 className="text-white font-bold text-lg mb-4">New Location</h2>
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

                <Button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold w-full">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {saving ? "Saving..." : "Save Location"}
                </Button>
              </form>
            </CardContent>
          </Card>
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
          <div className="grid gap-6 md:grid-cols-2">
            {locations.map(loc => (
              <Card key={loc.id} className="bg-gray-900/70 border-gray-800 overflow-hidden">
                {loc.image_url && (
                  <img src={loc.image_url} alt={loc.name} className="w-full h-48 object-cover" />
                )}
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-bold text-white mb-3">{loc.name}</h3>
                    {isAdmin && (
                      <button onClick={() => handleDelete(loc.id)} className="text-gray-600 hover:text-red-400 transition-colors ml-2 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}