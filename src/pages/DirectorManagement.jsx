import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newDirector, setNewDirector] = useState({ email: "", full_name: "", role: "Tournament Director" });
  const [editData, setEditData] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const user = await base44.auth.me();
    setIsAdmin(user.role === "admin");
    const fetchedDirectors = await base44.entities.Director.list("-created_date");
    setDirectors(fetchedDirectors);
    setIsLoading(false);
  };

  const handleAddDirector = async (e) => {
    e.preventDefault();
    if (!newDirector.email || !newDirector.role) return;
    setIsSubmitting(true);
    await base44.entities.Director.create(newDirector);
    setNewDirector({ email: "", full_name: "", role: "Tournament Director" });
    await loadData();
    setIsSubmitting(false);
  };

  const handleSaveEdit = async () => {
    if (!editData.email || !editData.role) return;
    setIsSubmitting(true);
    await base44.entities.Director.update(editingId, editData);
    setEditingId(null);
    setEditData(null);
    await loadData();
    setIsSubmitting(false);
  };

  const handleDeleteDirector = async (id) => {
    if (!confirm("Delete this director?")) return;
    await base44.entities.Director.delete(id);
    await loadData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-red-400" />
        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
        <p className="text-gray-400">Only admins can manage directors.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-red-500" />
          <h1 className="text-2xl font-bold text-white">Director Management</h1>
        </div>

        {/* Directors List */}
        <div className="space-y-2 overflow-hidden">
          {directors.map(director => (
            <div key={director.id} className="px-3 py-2 rounded-lg border border-red-500/25 bg-gradient-to-r from-red-950/30 to-red-900/10 overflow-hidden">
              {editingId === director.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      type="email"
                      value={editData.email}
                      onChange={e => setEditData({...editData, email: e.target.value})}
                      className="bg-black/30 border-red-500/30 text-white text-sm"
                    />
                    <Input
                      value={editData.full_name || ""}
                      onChange={e => setEditData({...editData, full_name: e.target.value})}
                      className="bg-black/30 border-red-500/30 text-white text-sm"
                      placeholder="Full name"
                    />
                    <Select value={editData.role} onValueChange={v => setEditData({...editData, role: v})}>
                      <SelectTrigger className="bg-black/30 border-red-500/30 text-white text-sm">
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
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="border-gray-700 text-gray-300 h-7 text-xs">
                      <X className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" disabled={isSubmitting} onClick={handleSaveEdit} className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs">
                      <Check className="w-3 h-3 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="text-white text-sm font-medium truncate">{director.full_name || director.email}</div>
                    <div className="text-gray-400 text-xs truncate">{director.email}</div>
                    <Badge className={`mt-1 text-xs ${
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
            <p className="text-gray-500 text-center py-8">No directors yet. Add one above!</p>
          )}
        </div>
      </div>
    </div>
  );
}