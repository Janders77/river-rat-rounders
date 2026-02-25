import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Upload, Trash2, Users, Search } from "lucide-react";

export default function PlayerDatabase() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ first_name: "", last_initial: "", email: "" });
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [csvError, setCsvError] = useState("");
  const fileInputRef = useRef();

  const loadPlayers = async () => {
    const data = await base44.entities.Player.list("-created_date", 200);
    setPlayers(data);
    setLoading(false);
  };

  useEffect(() => { loadPlayers(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    await base44.entities.Player.create({
      first_name: form.first_name.trim(),
      last_initial: form.last_initial.trim().slice(0, 1).toUpperCase(),
      email: form.email.trim().toLowerCase(),
    });
    setForm({ first_name: "", last_initial: "", email: "" });
    setShowForm(false);
    setAdding(false);
    loadPlayers();
  };

  const handleDelete = async (id) => {
    await base44.entities.Player.delete(id);
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const handleCSV = (e) => {
    setCsvError("");
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const lines = ev.target.result.split("\n").map(l => l.trim()).filter(Boolean);
      const header = lines[0].toLowerCase().split(",").map(h => h.trim());
      const firstIdx = header.indexOf("first_name");
      const lastIdx = header.indexOf("last_initial");
      const emailIdx = header.indexOf("email");
      if (firstIdx === -1 || emailIdx === -1) {
        setCsvError("CSV must have columns: first_name, last_initial, email");
        return;
      }
      const records = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim());
        if (!cols[firstIdx] || !cols[emailIdx]) continue;
        records.push({
          first_name: cols[firstIdx],
          last_initial: lastIdx !== -1 ? (cols[lastIdx] || "").slice(0, 1).toUpperCase() : "",
          email: cols[emailIdx].toLowerCase(),
        });
      }
      if (records.length === 0) { setCsvError("No valid rows found in CSV."); return; }
      await base44.entities.Player.bulkCreate(records);
      loadPlayers();
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filtered = players.filter(p =>
    `${p.first_name} ${p.last_initial} ${p.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Player Database</h1>
              <p className="text-gray-400 text-sm">{players.length} players registered</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={() => fileInputRef.current.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              onClick={() => setShowForm(!showForm)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Player
            </Button>
          </div>
        </div>

        {csvError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{csvError}</div>
        )}

        {/* CSV format hint */}
        <div className="mb-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700 text-gray-400 text-xs">
          CSV format: <span className="text-gray-300 font-mono">first_name, last_initial, email</span>
        </div>

        {/* Add Player Form */}
        {showForm && (
          <Card className="bg-[#1A1B20] border-gray-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-base">New Player</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="First name"
                    value={form.first_name}
                    onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    className="bg-gray-900 border-gray-700 text-white"
                    required
                  />
                  <Input
                    placeholder="Last initial"
                    value={form.last_initial}
                    onChange={e => setForm(f => ({ ...f, last_initial: e.target.value.slice(0, 1) }))}
                    className="bg-gray-900 border-gray-700 text-white w-28"
                    maxLength={1}
                    required
                  />
                </div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="bg-gray-900 border-gray-700 text-white"
                  required
                />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1 border-gray-700 text-gray-400">Cancel</Button>
                  <Button type="submit" disabled={adding} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                    {adding ? "Adding..." : "Add Player"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search players..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-900 border-gray-700 text-white pl-9"
          />
        </div>

        {/* Player List */}
        {loading ? (
          <div className="text-gray-400 text-center py-12">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-500 text-center py-12">No players found.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((player, idx) => (
              <div key={player.id} className="flex items-center justify-between p-4 rounded-lg bg-[#1A1B20] border border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-sm">
                    {player.first_name?.[0]?.toUpperCase()}{player.last_initial?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-medium">{player.first_name} {player.last_initial}.</div>
                    <div className="text-gray-400 text-sm">{player.email}</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(player.id)}
                  className="text-gray-600 hover:text-red-400 hover:bg-red-400/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}