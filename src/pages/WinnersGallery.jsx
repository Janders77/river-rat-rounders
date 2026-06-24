import React, { useState, useEffect } from "react";
import { WinnerPhoto } from "@/entities/WinnerPhoto";
import { base44 } from "@/api/base44Client";
import { imageToBase64 } from "@/lib/imageUpload";
import { Trophy, X, Plus, Upload, Loader2, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LOCATIONS = [
  "Tavern 018 Sun", "Tavern 018 Wed", "East End Bar & Grill",
  "Fridas", "Meddlesome Brewery", "MFS Brewing",
];

export default function WinnersGallery() {
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    winner_name: "",
    location: "",
    game_date: new Date().toISOString().split("T")[0],
    photo_url: "",
  });
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [data, user] = await Promise.all([
      WinnerPhoto.list("-created_date", 100),
      base44.auth.me().catch(() => null),
    ]);
    setPhotos(data);
    setIsAdmin(user?.role === "admin");
    setIsLoading(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const base64 = await imageToBase64(file, 1200, 0.88);
    setForm(f => ({ ...f, photo_url: base64 }));
    setPreviewUrl(base64);
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.photo_url || !form.winner_name) return;
    setUploading(true);
    await WinnerPhoto.create(form);
    setForm({ winner_name: "", location: "", game_date: new Date().toISOString().split("T")[0], photo_url: "" });
    setPreviewUrl("");
    setShowForm(false);
    await loadData();
    setUploading(false);
  };

  const handleDelete = async (e, photoId) => {
    e.stopPropagation();
    if (!confirm("Delete this photo?")) return;
    await WinnerPhoto.delete(photoId);
    setPhotos(prev => prev.filter(p => p.id !== photoId));
    if (selected?.id === photoId) setSelected(null);
  };

  return (
    <div className="min-h-screen p-4 relative" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
      <div className="absolute inset-0 pointer-events-none" style={{background: "radial-gradient(circle at top, rgba(220,38,38,0.08), transparent 40%)"}} />
      <div className="max-w-5xl mx-auto relative">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-white/80" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white leading-tight">Winners Gallery</h1>
            </div>
          </div>
          {isAdmin && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors border border-white/10 bg-white/[0.05] hover:bg-white/[0.09]"
            >
              <Plus className="w-5 h-5 text-white/80" />
            </button>
          )}
        </div>

        {/* Upload Form */}
        {showForm && isAdmin && (
          <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4 mb-5">
            <h2 className="text-base font-semibold text-white mb-4">Upload Winner Photo</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* Photo picker */}
              <div>
                <input type="file" accept="image/*" id="winner-photo" className="hidden" onChange={handleFileChange} />
                {previewUrl ? (
                  <div className="relative w-full max-w-xs">
                    <img src={previewUrl} alt="preview" className="w-full rounded-lg object-cover max-h-48" />
                    <button type="button" onClick={() => { setPreviewUrl(""); setForm(f => ({ ...f, photo_url: "" })); }}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 hover:bg-red-800/80 transition-colors">
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="winner-photo"
                    className="flex items-center gap-2 cursor-pointer px-4 py-3 rounded-lg w-full border border-dashed border-white/20 text-white/40 hover:border-white/40 hover:text-white/60 transition-colors">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? "Processing..." : "Choose photo"}
                  </label>
                )}
              </div>

              <Input
                placeholder="Winner's name *"
                value={form.winner_name}
                onChange={e => setForm(f => ({ ...f, winner_name: e.target.value }))}
                className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
                required
              />

              <Select value={form.location} onValueChange={v => setForm(f => ({ ...f, location: v }))}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                  {LOCATIONS.map(l => (
                    <SelectItem key={l} value={l} className="text-white">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex flex-col gap-1">
                <label className="text-white/40 text-base">Game Date</label>
                <input
                  type="date"
                  value={form.game_date}
                  onChange={e => setForm(f => ({ ...f, game_date: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-base text-white outline-none [color-scheme:dark]"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowForm(false); setPreviewUrl(""); setForm(f => ({ ...f, photo_url: "" })); }}
                  className="flex-1 py-2.5 rounded-lg text-base font-medium border border-white/10 bg-white/[0.04] text-white/50 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={uploading || !form.photo_url || !form.winner_name}
                  className="flex-1 py-2.5 rounded-lg text-base font-semibold text-white border border-white/10 bg-white/[0.08] hover:bg-white/[0.12] transition-colors disabled:opacity-40">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Upload"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Gallery Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array(8).fill(0).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl bg-white/5" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-white/20" />
            <p className="text-base text-white/60">No winners posted yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map(photo => (
              <div
                key={photo.id}
                className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 cursor-pointer group aspect-square"
                onClick={() => setSelected(photo)}
              >
                <img
                  src={photo.photo_url}
                  alt={photo.winner_name || "Winner"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex flex-col justify-end p-3">
                  <div className="text-white text-base font-semibold truncate">
                    {photo.winner_name || "Winner"}
                  </div>
                  {(photo.location || photo.game_date) && (
                    <div className="text-white/60 text-xs mt-0.5 truncate">
                      {photo.location}
                      {photo.location && photo.game_date ? " · " : ""}
                      {photo.game_date && new Date(photo.game_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <button
                    onClick={e => handleDelete(e, photo.id)}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelected(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelected(null)}
              className="absolute -top-10 right-0 text-gray-400 hover:text-white transition-colors">
              <X className="w-8 h-8" />
            </button>
            <img src={selected.photo_url} alt={selected.winner_name || "Winner"}
              className="w-full rounded-xl object-contain max-h-[70vh]" />
            <div className="mt-4 text-center">
              {selected.winner_name && (
                <div className="text-xl font-bold text-white flex items-center justify-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  {selected.winner_name}
                </div>
              )}
              {(selected.location || selected.game_date) && (
                <div className="text-white/50 text-base mt-1">
                  {selected.location}{selected.location && selected.game_date ? " · " : ""}
                  {selected.game_date && new Date(selected.game_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </div>
              )}
              {selected.title && <div className="text-red-300 italic mt-1">{selected.title}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
