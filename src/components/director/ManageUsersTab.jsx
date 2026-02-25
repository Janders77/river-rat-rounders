import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Edit2, Trash2, Save, X, Loader2 } from "lucide-react";

export default function ManageUsersTab({ users, setUsers }) {
  const [userSearch, setUserSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEditStart = (user) => {
    setEditingId(user.id);
    setEditData({
      full_name: user.full_name || "",
      role: user.role || "user"
    });
  };

  const handleSave = async (userId) => {
    setIsUpdating(true);
    await User.update(userId, editData);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...editData } : u));
    setEditingId(null);
    setIsUpdating(false);
  };

  const handleDeactivate = async (userId) => {
    if (!confirm("Deactivate this user? They will lose access to the app.")) return;
    setIsUpdating(true);
    await User.update(userId, { role: "inactive" });
    setUsers(prev => prev.filter(u => u.id !== userId));
    setIsUpdating(false);
  };

  const filteredUsers = users.filter(u =>
    !userSearch ||
    (u.full_name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card className="bg-[#1A1B20] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Manage User Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search by name or email..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white pl-9"
            />
          </div>

          <div className="space-y-3">
            {filteredUsers.map(user => (
              <div key={user.id} className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                {editingId === user.id ? (
                  <div className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400">Full Name</label>
                        <Input
                          value={editData.full_name}
                          onChange={e => setEditData({...editData, full_name: e.target.value})}
                          className="bg-gray-800 border-gray-700 text-white h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400">Role</label>
                        <Select value={editData.role} onValueChange={v => setEditData({...editData, role: v})}>
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            <SelectItem value="user">Player</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSave(user.id)}
                        disabled={isUpdating}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                      >
                        {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3 mr-1" />Save</>}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                        className="border-gray-700 text-gray-400 text-xs h-7"
                      >
                        <X className="w-3 h-3 mr-1" />Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-white">{user.full_name || user.email}</div>
                      <div className="text-sm text-gray-400">{user.email}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={user.role === "admin" ? "border-purple-500 text-purple-400" : "border-gray-600 text-gray-400"}>
                        {user.role === "admin" ? "Admin" : "Player"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditStart(user)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 h-7 w-7 p-0"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeactivate(user.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-7 w-7 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {users.length === 0 && <p className="text-gray-500 text-center py-4">No users yet.</p>}
            {users.length > 0 && userSearch && filteredUsers.length === 0 && (
              <p className="text-gray-500 text-center py-4">No users match your search.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}