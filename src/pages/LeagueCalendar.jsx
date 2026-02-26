import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    loadData();
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
    return isFuture(d) || isToday(d);
  });
  const pastEvents = events.filter(e => {
    const d = parseISO(e.event_date);
    return !isFuture(d) && !isToday(d);
  });

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-xl flex items-center justify-center shadow-lg">
              <CalendarDays className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">League Calendar</h1>
              <p className="text-gray-400 text-sm">Upcoming events & games</p>
            </div>
          </div>
          {isAdmin && !showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2"
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Date *</label>
                  <Input
                    type="date"
                    value={form.event_date}
                    onChange={e => setForm({ ...form, event_date: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Time</label>
                  <Input
                    placeholder="e.g. 7:00 PM"
                    value={form.event_time}
                    onChange={e => setForm({ ...form, event_time: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
              </div>
              <Input
                placeholder="Location"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
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
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={handleCancel} className="text-gray-400 gap-2">
                  <X className="w-4 h-4" /> Cancel
                </Button>
                <Button onClick={handleSubmit} className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2">
                  <Check className="w-4 h-4" /> {editingEvent ? "Save Changes" : "Create Event"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Events */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Upcoming</h2>
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
  return (
    <Card className={`border ${highlight ? "bg-[#1A1B20] border-gray-700" : "bg-[#16171B] border-gray-800"}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-4 items-start">
            <div className="text-center min-w-[48px]">
              <div className="text-xs text-gray-400 uppercase">
                {format(parseISO(event.event_date), "MMM")}
              </div>
              <div className="text-2xl font-bold text-white leading-tight">
                {format(parseISO(event.event_date), "d")}
              </div>
              <div className="text-xs text-gray-500">
                {format(parseISO(event.event_date), "yyyy")}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-white">{event.title}</span>
                <Badge className={`text-xs border ${EVENT_TYPE_COLORS[event.event_type] || EVENT_TYPE_COLORS["Other"]}`}>
                  {event.event_type}
                </Badge>
              </div>
              {event.event_time && (
                <div className="flex items-center gap-1 text-gray-400 text-sm mb-1">
                  <Clock className="w-3 h-3" /> {event.event_time}
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-1 text-gray-400 text-sm mb-1">
                  <MapPin className="w-3 h-3" /> {event.location}
                </div>
              )}
              {event.description && (
                <p className="text-gray-400 text-sm mt-2">{event.description}</p>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2 shrink-0">
              <button onClick={() => onEdit(event)} className="text-gray-500 hover:text-cyan-400 transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(event.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}