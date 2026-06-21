import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { hasPermission } from "@/components/directorPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Plus, Trash2, Edit2, Loader2, Check, X } from "lucide-react";

const DIRECTOR_ROLES = ["Head Director", "Tournament Director", "Assistant Director"];

export default function DirectorManagement() {
  const [directors, setDirectors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canManageDirectors, setCanManageDirectors] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newDirector, setNewDirector] = useState({ email: "", full_name: "", role: "Tournament Director" });
  const [editData, setEditData] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const user = await base44.auth.me();
    setCurrentUser(user);
    setCanManageDirectors(
      user?.role === "admin" &&
      (!user?.director_role || hasPermission(user.director_role, "canManageDirectors"))
    );
    const fetchedDirectors = await base44.entities.Director.list("-created_date");
    setDirectors(fetchedDirectors);
    setIsLoading(false);
  };

  const handleAddDirector = async (e) => {
    e.preventDefault();
    if (!newDirector.email || !newDirector.role) return;
    setIsSubmitting(true);
    const normalizedEmail = newDirector.email.trim().toLowerCase();
    await base44.users.inviteUser(normalizedEmail, "user", {
      full_name: newDirector.full_name?.trim() || normalizedEmail,
    });
    await base44.entities.Director.create({
      ...newDirector,
      email: normalizedEmail,
      full_name: newDirector.full_name?.trim() || "",
    });
    setNewDirector({ email: "", full_name: "", role: "Tournament Director" });
    await loadData();
    setIsSubmitting(false);
  };

  const handleSaveEdit = async () => {
    if (!editData.email || !editData.role) return;
    setIsSubmitting(true);
    const normalizedEmail = editData.email.trim().toLowerCase();
    const previousDirector = directors.find(director => director.id === editingId);
    await base44.users.inviteUser(normalizedEmail, "user", {
      full_name: editData.full_name?.trim() || normalizedEmail,
    });
    await base44.entities.Director.update(editingId, {
      ...editData,
      email: normalizedEmail,
      full_name: editData.full_name?.trim() || "",
    });

    if (previousDirector?.email && previousDirector.email !== normalizedEmail) {
      const previousUsers = await base44.entities.User.filter({ email: previousDirector.email.trim().toLowerCase() });
      if (previousUsers[0]) {
        await base44.entities.User.update(previousUsers[0].id, {
          email: normalizedEmail,
          full_name: editData.full_name?.trim() || previousUsers[0].full_name || normalizedEmail,
        });
      }
    } else {
      const currentUsers = await base44.entities.User.filter({ email: normalizedEmail });
      if (currentUsers[0]) {
        await base44.entities.User.update(currentUsers[0].id, {
          full_name: editData.full_name?.trim() || currentUsers[0].full_name || normalizedEmail,
        });
      }
    }

    setEditingId(null);
    setEditData(null);
    await loadData();
    setIsSubmitting(false);
  };

  const handleDeleteDirector = async (id) => {
    const director = directors.find(item => item.id === id);
    if (director?.email && currentUser?.email && director.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase()) {
      alert("You can't remove your own director access from this screen.");
      return;
    }
    if (!confirm("Delete this director?")) return;
    await base44.entities.Director.delete(id);
    await loadData();
  };

  const bgStyle = {background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"};
  const glowStyle = {background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08), transparent 70%)"};

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={bgStyle}>
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (!canManageDirectors) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center" style={bgStyle}>
        <ShieldAlert className="w-12 h-12 text-red-400" />
        <h1 className="text-xl font-bold text-white">Access Denied</h1>
        <p className="text-white/40 text-base">Only head directors can manage director access.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={bgStyle}>
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none" style={glowStyle} />
      <div className="relative max-w-md mx-auto w-full px-4 pt-5 pb-10 flex flex-col gap-3">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-white/80" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">Director Management</h1>
            <p className="text-base text-white/40 mt-0.5 leading-none">Manage director access and roles</p>
          </div>
        </div>

        {/* Directors List */}
        <div className="space-y-2 overflow-hidden">
          {directors.map(director => (
            <div key={director.id} className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 overflow-hidden">
              {editingId === director.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      type="email"
                      value={editData.email}
                      onChange={e => setEditData({...editData, email: e.target.value})}
                      className="bg-black/30 border-red-500/30 text-white text-base"
                    />
                    <Input
                      value={editData.full_name || ""}
                      onChange={e => setEditData({...editData, full_name: e.target.value})}
                      className="bg-black/30 border-red-500/30 text-white text-base"
                      placeholder="Full name"
                    />
                    <Select value={editData.role} onValueChange={v => setEditData({...editData, role: v})}>
                      <SelectTrigger className="bg-black/30 border-red-500/30 text-white text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        {DIRECTOR_ROLES.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="border-gray-700 text-gray-300 h-7 text-base">
                      <X className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" disabled={isSubmitting} onClick={handleSaveEdit} className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-base">
                      <Check className="w-3 h-3 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="text-white text-base font-medium truncate">{director.full_name || director.email}</div>
                    <div className="text-gray-400 text-base truncate">{director.email}</div>
                    <Badge className={`mt-1 text-base ${
                      director.role === "Head Director" ? "bg-red-600/20 border-red-500/50 text-red-300" :
                      director.role === "Tournament Director" ? "bg-red-800/20 border-red-700/50 text-red-400" :
                      "bg-gray-600/20 border-gray-500/50 text-gray-300"
                    }`}>
                      {director.role}
                    </Badge>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingId(director.id); setEditData(director); }} className="text-gray-400 hover:text-white hover:bg-white/10 h-7 w-7">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteDirector(director.id)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-7 w-7">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {directors.length === 0 && (
            <p className="text-gray-500 text-center py-8">No directors yet.</p>
          )}
        </div>

        {/* Add Director Section */}
        {showAddForm ? (
          <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4 overflow-hidden">
            <form onSubmit={async (e) => { await handleAddDirector(e); setShowAddForm(false); }} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  type="email"
                  placeholder="Email *"
                  value={newDirector.email}
                  onChange={e => setNewDirector({...newDirector, email: e.target.value})}
                  className="bg-black/30 border-red-500/30 text-white placeholder:text-gray-500"
                  required
                />
                <Input
                  placeholder="Full Name"
                  value={newDirector.full_name}
                  onChange={e => setNewDirector({...newDirector, full_name: e.target.value})}
                  className="bg-black/30 border-red-500/30 text-white placeholder:text-gray-500"
                />
                <Select value={newDirector.role} onValueChange={v => setNewDirector({...newDirector, role: v})}>
                  <SelectTrigger className="bg-black/30 border-red-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    {DIRECTOR_ROLES.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || !newDirector.email}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Director
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} className="border-gray-700 text-gray-300">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <Button
            onClick={() => setShowAddForm(true)}
            className="mt-2 w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Director
          </Button>
        )}
      </div>
    </div>
  );
}
