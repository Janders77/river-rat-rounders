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
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
            <ShieldAlert className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Director Management</h1>
            <p className="text-gray-400">Manage tournament directors and their roles</p>
          </div>
        </div>

        <Card className="bg-[#1A1B20] border-gray-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add New Director
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddDirector} className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-gray-300 text-sm">Email *</label>
                  <Input
                    type="email"
                    placeholder="director@example.com"
                    value={newDirector.email}
                    onChange={e => setNewDirector({...newDirector, email: e.target.value})}
                    className="bg-gray-900 border-gray-700 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-gray-300 text-sm">Full Name</label>
                  <Input
                    placeholder="John Doe"
                    value={newDirector.full_name}
                    onChange={e => setNewDirector({...newDirector, full_name: e.target.value})}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-gray-300 text-sm">Role *</label>
                  <Select value={newDirector.role} onValueChange={v => setNewDirector({...newDirector, role: v})}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {DIRECTOR_ROLES.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={isSubmitting || !newDirector.email}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Director
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1B20] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">All Directors ({directors.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {directors.map(director => (
                <div key={director.id} className="p-4 bg-gray-900/50 rounded-lg border border-gray-800 flex items-center justify-between">
                  {editingId === director.id ? (
                    <div className="flex-1 space-y-3">
                      <div className="grid md:grid-cols-3 gap-3">
                        <Input
                          type="email"
                          value={editData.email}
                          onChange={e => setEditData({...editData, email: e.target.value})}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                        <Input
                          value={editData.full_name || ""}
                          onChange={e => setEditData({...editData, full_name: e.target.value})}
                          className="bg-gray-800 border-gray-700 text-white"
                          placeholder="Full name"
                        />
                        <Select value={editData.role} onValueChange={v => setEditData({...editData, role: v})}>
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
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
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setEditingId(null)}
                          className="border-gray-700 text-gray-300"
                        >
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={isSubmitting}
                          onClick={handleSaveEdit}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Check className="w-4 h-4 mr-1" /> Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="font-medium text-white">{director.full_name || director.email}</div>
                        <div className="text-sm text-gray-400">{director.email}</div>
                        <div className="mt-2">
                          <Badge className={
                            director.role === "Head Director" ? "bg-purple-600/20 border-purple-500 text-purple-300" :
                            director.role === "Tournament Director" ? "bg-blue-600/20 border-blue-500 text-blue-300" :
                            "bg-gray-600/20 border-gray-500 text-gray-300"
                          }>
                            {director.role}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(director.id);
                            setEditData(director);
                          }}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteDirector(director.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {directors.length === 0 && (
                <p className="text-gray-500 text-center py-8">No directors yet. Add one above!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}