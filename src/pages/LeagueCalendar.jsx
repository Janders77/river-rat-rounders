import React, { useState, useEffect, Fragment } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Plus, MapPin, Clock, Trash2, Edit2, X, Check, Upload, Image } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, isFuture, isToday } from "date-fns";

const EVENT_TYPE_COLORS = {
  "Regular Game": "bg-green-500/20 text-green-300 border-green-500/40",
  "Tournament": "bg-amber-500/20 text-amber-300 border-amber-500/40",
  "Special Event": "bg-purple-500/20 text-purple-300 border-purple-500/40",
  "Meeting": "bg-blue-500/20 text-blue-300 border-blue-500/40",
  "Other": "bg-gray-500/20 text-gray-300 border-gray-500/40",
};

const emptyForm = {
  title: "",
  event_date: "",
  event_time: "",
  location: "",
  address: "",
  description: "",
  event_type: "Regular Game",
  image_urls: [],
};

export default function LeagueCalendar() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [user, setUser] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [today, setToday] = useState(new Date());

  useEffect(() => {
    loadData();
    setToday(new Date());
  }, []);

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
      title: event.title || "",
      event_date: event.event_date || "",
      event_time: event.event_time || "",
      location: event.location || "",
      address: event.address || "",
      description: event.description || "",
      event_type: event.event_type || "Regular Game",
      image_urls: event.image_urls || [],
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
    <div className="min-h-screen p-3 sm:p-6" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-700 to-red-900 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <CalendarDays className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-white">League Calendar</h1>
              <p className="text-gray-400 text-xs sm:text-sm">Upcoming events & games</p>
            </div>
          </div>
          {isAdmin && !showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white gap-2 w-full sm:w-auto shadow-lg shadow-red-900/40 transition-all duration-200"
            >
              <Plus className="w-4 h-4" /> Add Event
            </Button>
          )}
        </div>

        {/* Form */}
        {showForm && isAdmin && (
          <Card className="bg-[#1A1B20] border-gray-700 mb-8">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-white font-semibold text-lg mb-2">
                {editingEvent ? "Edit Event" : "New Event"}
              </h2>
              <Input
                placeholder="Event title *"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Date *</label>
                  <Input
                    type="date"
                    value={form.event_date}
                    onChange={e => setForm({ ...form, event_date: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white w-full"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Time</label>
                  <Input
                    placeholder="e.g. 7:00 PM"
                    value={form.event_time}
                    onChange={e => setForm({ ...form, event_time: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white w-full"
                  />
                </div>
              </div>
              <Input
                placeholder="Location (e.g. Tavern 018)"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
              />
              <Input
                placeholder="Address (e.g. 123 Main St, Memphis, TN)"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
              />
              <Select value={form.event_type} onValueChange={v => setForm({ ...form, event_type: v })}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(EVENT_TYPE_COLORS).map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
                rows={3}
              />
              {/* Image Upload */}
              <div>
                <label className="text-gray-400 text-xs mb-2 block">Event Images</label>
                <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border border-dashed border-gray-600 hover:border-red-500 text-gray-400 hover:text-red-400 transition-colors w-fit text-sm ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload className="w-4 h-4" />
                  {uploadingImage ? "Uploading..." : "Upload Images"}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
                {form.image_urls?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {form.image_urls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-700" />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute -top-1 -right-1 bg-red-600 rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={handleCancel} className="text-gray-400 gap-2">
                  <X className="w-4 h-4" /> Cancel
                </Button>
                <Button onClick={handleSubmit} className="bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white gap-2 shadow-lg shadow-red-900/40 transition-all duration-200">
                  <Check className="w-4 h-4" /> {editingEvent ? "Save Changes" : "Create Event"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Events */}
        <div className="mb-8">
          {isLoading ? (
            <div className="text-gray-500 text-center py-8">Loading...</div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No upcoming events. {isAdmin ? "Add one above!" : "Check back soon."}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  isAdmin={isAdmin}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  highlight
                />
              ))}
            </div>
          )}
        </div>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-500 mb-4">Past Events</h2>
            <div className="space-y-3 opacity-60">
              {pastEvents.slice().reverse().map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  isAdmin={isAdmin}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
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

  return (
    <>
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-gray-800 rounded-full p-2 hover:bg-gray-700 transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
      <Card className={`border bg-transparent ${highlight ? "border-red-500/40" : "border-red-500/20"}`}>
        <CardContent className="p-3">
          <div className="flex gap-3 items-start">
            {/* Date block */}
            <div className="text-center flex-shrink-0 w-[36px] pt-0.5">
              <div className="text-[9px] text-gray-400 uppercase leading-none">{format(parseISO(event.event_date), "MMM")}</div>
              <div className="text-xl font-bold text-white leading-tight">{format(parseISO(event.event_date), "d")}</div>
              <div className="text-[9px] text-gray-500 leading-none">{format(parseISO(event.event_date), "yyyy")}</div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-sm text-white">{event.title}</span>
                  <Badge className={`text-[9px] border px-1 py-0 ${EVENT_TYPE_COLORS[event.event_type] || EVENT_TYPE_COLORS["Other"]}`}>
                    {event.event_type}
                  </Badge>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => onEdit(event)} className="text-gray-500 hover:text-red-400 transition-colors p-0.5">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete(event.id)} className="text-gray-500 hover:text-red-400 transition-colors p-0.5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                {event.event_time && (
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <Clock className="w-3 h-3 flex-shrink-0" /><span>{event.event_time}</span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{event.location}</span>
                  </div>
                )}
              </div>
              {event.address && (
                <div className="text-gray-500 text-[10px] mt-0.5 truncate">{event.address}</div>
              )}
              {event.description && (
                <p className="text-gray-400 text-xs mt-1">{event.description}</p>
              )}
              {event.image_urls?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {event.image_urls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt=""
                      className="max-w-[100px] rounded-lg border border-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setLightboxUrl(url)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}