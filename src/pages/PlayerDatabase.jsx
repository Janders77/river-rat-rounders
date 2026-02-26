import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Upload, Users, Search } from "lucide-react";
import PlayerFilters from "../components/PlayerFilters";
import PlayerRow from "../components/PlayerRow";

export default function PlayerDatabase() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ player_number: "", first_name: "", last_name: "", email: "", card_guards: "", date_joined: "" });
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [csvError, setCsvError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [filters, setFilters] = useState({
    guardFilter: { enabled: false, operator: ">", value: 0 },
    dateFilter: { enabled: false, type: "range", startDate: "", endDate: "", specificDate: "" }
  });
  const fileInputRef = useRef();

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      const user = await base44.auth.me();
      setIsAdmin(user?.role === "admin");
    };
    checkAdmin();
  }, []);

  const loadPlayers = async () => {
    const data = await base44.entities.Player.list("player_number", 10000);
    setPlayers(data);
    setLoading(false);
  };

  useEffect(() => { loadPlayers(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    await base44.entities.Player.create({
      player_number: form.player_number ? parseInt(form.player_number) : undefined,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim().toLowerCase(),
      card_guards: form.card_guards ? parseInt(form.card_guards) : 0,
      date_joined: form.date_joined || undefined,
    });
    setForm({ player_number: "", first_name: "", last_name: "", email: "", card_guards: "", date_joined: "" });
    setShowForm(false);
    setAdding(false);
    loadPlayers();
  };

  const handleDelete = async (id) => {
    await base44.entities.Player.delete(id);
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdate = (id, updatedData) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updatedData } : p));
  };

  const handleCSV = (e) => {
    setCsvError("");
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const lines = ev.target.result.split("\n").map(l => l.trim()).filter(Boolean);
      const header = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/\s+/g, "_"));

      // Expected columns: number, name, last, email, guards, day
      const numIdx = header.indexOf("number");
      const firstIdx = header.indexOf("name");
      const lastIdx = header.indexOf("last");
      const emailIdx = header.indexOf("email");
      const guardsIdx = header.indexOf("guards");
      const dateIdx = header.indexOf("day");

      if (firstIdx === -1) {
        setCsvError("CSV must have a 'name' column. Expected: number, name, last, email, guards, day");
        return;
      }

      const records = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^"+|"+$/g, ""));
        if (!cols[firstIdx]) continue;
        // Parse date - handle formats like "11/22/2015 9:51"
        let dateJoined = undefined;
        if (dateIdx !== -1 && cols[dateIdx]) {
          const d = new Date(cols[dateIdx]);
          if (!isNaN(d)) dateJoined = d.toISOString().split("T")[0];
        }
        records.push({
          player_number: numIdx !== -1 && cols[numIdx] ? parseInt(cols[numIdx]) : undefined,
          first_name: cols[firstIdx],
          last_name: lastIdx !== -1 ? cols[lastIdx] : "",
          email: emailIdx !== -1 ? cols[emailIdx].toLowerCase() : "",
          card_guards: guardsIdx !== -1 && cols[guardsIdx] ? parseInt(cols[guardsIdx]) : 0,
          date_joined: dateJoined,
        });
      }

      if (records.length === 0) { setCsvError("No valid rows found in CSV."); return; }
      await base44.entities.Player.bulkCreate(records);
      loadPlayers();
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filtered = players.filter(p => {
    // Search filter
    const searchMatch = `${p.player_number} ${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(search.toLowerCase());
    if (!searchMatch) return false;

    // Guard filter
    if (filters.guardFilter.enabled) {
      const guards = p.card_guards || 0;
      if (filters.guardFilter.operator === ">" && guards <= filters.guardFilter.value) return false;
      if (filters.guardFilter.operator === "<" && guards >= filters.guardFilter.value) return false;
      if (filters.guardFilter.operator === "=" && guards !== filters.guardFilter.value) return false;
    }

    // Date filter
    if (filters.dateFilter.enabled && p.date_joined) {
      const playerDate = new Date(p.date_joined);
      if (filters.dateFilter.type === "range") {
        if (filters.dateFilter.startDate && playerDate < new Date(filters.dateFilter.startDate)) return false;
        if (filters.dateFilter.endDate && playerDate > new Date(filters.dateFilter.endDate)) return false;
      } else if (filters.dateFilter.type === "before") {
        if (filters.dateFilter.specificDate && playerDate > new Date(filters.dateFilter.specificDate)) return false;
      } else if (filters.dateFilter.type === "after") {
        if (filters.dateFilter.specificDate && playerDate < new Date(filters.dateFilter.specificDate)) return false;
      }
    }

    return true;
  });

  return (
    <div className="min-h-screen p-3 sm:p-6 bg-green-900/30 overflow-x-hidden">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
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
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 flex-1 sm:flex-none"
              onClick={() => fileInputRef.current.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold flex-1 sm:flex-none"
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

        {/* Advanced Filters */}
        <PlayerFilters filters={filters} setFilters={setFilters} />

        {/* Add Player Form */}
        {showForm && (
          <Card className="bg-[#1A1B20] border-gray-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-base">New Player</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="# (number)"
                    type="number"
                    value={form.player_number}
                    onChange={e => setForm(f => ({ ...f, player_number: e.target.value }))}
                    className="bg-gray-900 border-gray-700 text-white col-span-2 sm:col-span-1"
                  />
                  <Input
                    placeholder="First name"
                    value={form.first_name}
                    onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    className="bg-gray-900 border-gray-700 text-white"
                    required
                  />
                  <Input
                    placeholder="Last name"
                    value={form.last_name}
                    onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    className="bg-gray-900 border-gray-700 text-white"
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
                  <Input
                    placeholder="Card guards"
                    type="number"
                    value={form.card_guards}
                    onChange={e => setForm(f => ({ ...f, card_guards: e.target.value }))}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                  <Input
                    placeholder="Date joined"
                    type="date"
                    value={form.date_joined}
                    onChange={e => setForm(f => ({ ...f, date_joined: e.target.value }))}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
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
            {isAdmin && <p className="text-xs text-gray-500 mb-3">💡 Click a row to edit player details</p>}
            {filtered.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                isAdmin={isAdmin}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}