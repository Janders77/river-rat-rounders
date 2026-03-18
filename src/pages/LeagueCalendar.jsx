import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Plus, MapPin, Clock, Trash2, Edit2, X, Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, isFuture, isToday } from "date-fns";

const EVENT_TYPE_COLORS = {
  "Regular Game":  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Tournament":    "bg-amber-500/10  text-amber-400  border-amber-500/20",
  "Special Event": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Meeting":       "bg-blue-500/10   text-blue-400   border-blue-500/20",
  "Other":         "bg-white/5       text-gray-400   border-white/10",
};

const BG   = { background: "linear-gradient(160deg, #13131b 0%, #1a1a24 55%, #13131b 100%)" };
const GLOW = { background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.07), transparent 60%)" };
const CARD = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" };
const CARD_HIGHLIGHT = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" };

const emptyForm = {
  title: "", event_date: "", event_time: "", location: "",
  address: "", description: "", event_type: "Regular Game", image_urls: [],
};

export default function LeagueCalendar() {
  const [events, setEvents]           = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm]               = useState(emptyForm);
  const [user, setUser]               = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [today]                       = useState(new Date());

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [fetchedEvents, currentUser] = await Promise.all([
      base44.entities.LeagueEvent.list("event_date"),
      base44.auth.me().catch(() => null),
    ]);
    setEvents(fetchedEvents);
    setUser(currentUser);
    setIsLoading(false);
  };

  const isAdmin = user?.role === "admin";

  const handleSubmit = async () => {
    if (!form.title || !form.event_date) return;
    if (editingEvent) {
      await base44.entities.LeagueEvent.update(editingEvent.id, form);
    } else {
      await base44.entities.LeagueEvent.create(form);
    }
    setShowForm(false);
    setEditingEvent(null);
    setForm(emptyForm);
    loadData();
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingImage(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setForm(prev => ({ ...prev, image_urls: [...(prev.image_urls || []), ...urls] }));
    setUploadingImage(false);
  };

  const removeImage = (idx) => {
    setForm(prev => ({ ...prev, image_urls: prev.image_urls.filter((_, i) => i !== idx) }));
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setForm({
      title: event.title || "", event_date: event.event_date || "",
      event_time: event.event_time || "", location: event.location || "",
      address: event.address || "", description: event.description || "",
      event_type: event.event_type || "Regular Game", image_urls: event.image_urls || [],
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    await base44.entities.LeagueEvent.delete(id);
    loadData();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEvent(null);
    setForm(emptyForm);
  };

  const upcomingEvents = events.filter(e => {
    const d = parseISO(e.event_date);
    return isFuture(d) || isToday(d, today);
  });
  const pastEvents = events.filter(e => {
    const d = parseISO(e.event_date);
    return !isFuture(d) && !isToday(d, today);
  });

  return (
    <div className="min-h-screen relative" style={BG}>
      <div className="absolute inset-0 pointer-events-none" style={GLOW} />

      <div className="relative max-w-md mx-auto px-4 pt-5 pb-10">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 text-white/80" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">League Calendar</h1>
              <p className="text-[10px] text-gray-600 mt-0.5 leading-none">Upcoming events & games</p>
            </div>
          </div>
          {isAdmin && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white px-3 py-1.5 rounded-lg transition-all"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Event
            </button>
          )}
        </div>

        {/* ── ADD / EDIT FORM ── */}
        {showForm && isAdmin && (
          <div className="rounded-xl p-4 mb-5 space-y-3" style={CARD_HIGHLIGHT}>
            <h2 className="text-white font-semibold text-sm mb-1">
              {editingEvent ? "Edit Event" : "New Event"}
            </h2>
            <Input
              placeholder="Event title *"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="bg-white/5 border-white/10 text-white text-sm h-9"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-500 text-[10px] mb-1 block uppercase tracking-widest">Date *</label>
                <input
                  type="date"
                  value={form.event_date}
                  onChange={e => setForm({ ...form, event_date: e.target.value })}
                  className="w-full h-9 rounded-md px-3 text-sm text-white [color-scheme:dark]"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
              <div>
                <label className="text-gray-500 text-[10px] mb-1 block uppercase tracking-widest">Time</label>
                <Input
                  placeholder="e.g. 7:00 PM"
                  value={form.event_time}
                  onChange={e => setForm({ ...form, event_time: e.target.value })}
                  className="bg-white/5 border-white/10 text-white text-sm h-9"
                />
              </div>
            </div>
            <Input
              placeholder="Location"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              className="bg-white/5 border-white/10 text-white text-sm h-9"
            />
            <Input
              placeholder="Address"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              className="bg-white/5 border-white/10 text-white text-sm h-9"
            />
            <Select value={form.event_type} onValueChange={v => setForm({ ...form, event_type: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a24] border-white/10">
                {Object.keys(EVENT_TYPE_COLORS).map(t => (
                  <SelectItem key={t} value={t} className="text-white text-sm">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="bg-white/5 border-white/10 text-white text-sm"
              rows={2}
            />
            {/* Image upload */}
            <div>
              <label
                className={`inline-flex items-center gap-1.5 cursor-pointer text-xs px-3 py-1.5 rounded-lg transition-colors ${uploadingImage ? "opacity-50 pointer-events-none" : ""}`}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af" }}
              >
                <Upload className="w-3.5 h-3.5" />
                {uploadingImage ? "Uploading…" : "Upload Images"}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
              </label>
              {form.image_urls?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.image_urls.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg" style={{ border: "1px solid rgba(255,255,255,0.08)" }} />
                      <button onClick={() => removeImage(idx)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSubmit}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)" }}
              >
                <Check className="w-3.5 h-3.5" />
                {editingEvent ? "Save Changes" : "Create Event"}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── UPCOMING EVENTS ── */}
        {isLoading ? (
          <div className="space-y-2">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
            ))}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="text-center py-16">
            <CalendarDays className="w-8 h-8 mx-auto mb-2 text-gray-800" />
            <p className="text-gray-600 text-sm">
              {isAdmin ? "No upcoming events. Add one above!" : "No upcoming events. Check back soon."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map(event => (
              <EventCard key={event.id} event={event} isAdmin={isAdmin} onEdit={handleEdit} onDelete={handleDelete} highlight />
            ))}
          </div>
        )}

        {/* ── PAST EVENTS ── */}
        {!isLoading && pastEvents.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              <span className="text-[10px] text-gray-700 uppercase tracking-widest">Past Events</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div className="space-y-1.5 opacity-50">
              {pastEvents.slice().reverse().map(event => (
                <EventCard key={event.id} event={event} isAdmin={isAdmin} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event, isAdmin, onEdit, onDelete, highlight }) {
  const [lightboxUrl, setLightboxUrl] = React.useState(null);
  const typeColor = EVENT_TYPE_COLORS[event.event_type] || EVENT_TYPE_COLORS["Other"];
  const dateObj = parseISO(event.event_date);

  return (
    <>
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white" onClick={() => setLightboxUrl(null)}>
            <X className="w-6 h-6" />
          </button>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <div
        className="rounded-xl overflow-hidden transition-all duration-150"
        style={highlight ? CARD_HIGHLIGHT : CARD}
      >
        <div className="flex gap-3 p-3">

          {/* ── DATE BLOCK ── */}
          <div
            className="flex flex-col items-center justify-center rounded-lg shrink-0 w-11"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", minHeight: "48px" }}
          >
            <span className="text-[9px] font-bold uppercase tracking-widest leading-none" style={{ color: "#ef4444" }}>
              {format(dateObj, "MMM")}
            </span>
            <span className="text-xl font-black text-white leading-tight tabular-nums">
              {format(dateObj, "d")}
            </span>
            <span className="text-[9px] text-gray-600 leading-none">
              {format(dateObj, "yyyy")}
            </span>
          </div>

          {/* ── CONTENT ── */}
          <div className="flex-1 min-w-0">
            {/* Title row + actions */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-white font-semibold text-sm leading-tight block truncate">{event.title}</span>
                <span className={`inline-flex items-center mt-0.5 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${typeColor}`}>
                  {event.event_type}
                </span>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                  <button
                    onClick={() => onEdit(event)}
                    className="w-6 h-6 flex items-center justify-center rounded text-gray-700 hover:text-gray-300 transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDelete(event.id)}
                    className="w-6 h-6 flex items-center justify-center rounded text-gray-700 hover:text-red-400 transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
              {event.event_time && (
                <span className="flex items-center gap-1 text-[11px] text-gray-500">
                  <Clock className="w-3 h-3 shrink-0" />{event.event_time}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1 text-[11px] text-gray-500 truncate">
                  <MapPin className="w-3 h-3 shrink-0" />{event.location}
                </span>
              )}
            </div>

            {event.address && (
              <p className="text-[10px] text-gray-700 mt-0.5 truncate">{event.address}</p>
            )}
            {event.description && (
              <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{event.description}</p>
            )}
          </div>
        </div>

        {/* ── EVENT IMAGES ── */}
        {event.image_urls?.length > 0 && (
          <div className="px-3 pb-3">
            {event.image_urls.length === 1 ? (
              <div
                className="w-full h-32 rounded-lg overflow-hidden mt-0"
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                onClick={() => setLightboxUrl(event.image_urls[0])}
              >
                <img src={event.image_urls[0]} alt="" className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" />
              </div>
            ) : (
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {event.image_urls.map((url, idx) => (
                  <div
                    key={idx}
                    className="w-20 h-20 rounded-md overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                    onClick={() => setLightboxUrl(url)}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}