import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Upload, Users, Search } from "lucide-react";
import { createPageUrl } from "@/utils";
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
  const [totalCount, setTotalCount] = useState(null);
  const fileInputRef = useRef();

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        if (user?.role !== "admin") {
          window.location.href = createPageUrl("Home");
          return;
        }
        setIsAdmin(true);
      } catch (error) {
        window.location.href = createPageUrl("Home");
      }
    };
    checkAdmin();
  }, []);

  const loadPlayers = async () => {
    // Fetch all players in batches to avoid limit cap
    let allPlayers = [];
    let skip = 0;
    const batchSize = 1000;
    while (true) {
      const batch = await base44.entities.Player.list("player_number", batchSize, skip);
      allPlayers = allPlayers.concat(batch);
      if (batch.length < batchSize) break;
      skip += batchSize;
    }
    const newest = allPlayers.length > 0 ? allPlayers[allPlayers.length - 1].player_number : allPlayers.length;
    setTotalCount(newest);
    setPlayers(allPlayers);
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

      // Expected columns: number, first_name, last_name, email, card_guards, day
      const numIdx = header.indexOf("number");
      const firstIdx = header.findIndex(h => h === "first_name" || h === "first");
      const lastIdx = header.findIndex(h => h === "last_name" || h === "last");
      const emailIdx = header.indexOf("email");
      const guardsIdx = header.findIndex(h => h === "card_guards" || h === "guards");
      const dateIdx = header.indexOf("day");

      if (firstIdx === -1) {
        setCsvError("CSV must have a 'first_name' column. Expected: number, first_name, last_name, email, card_guards, day");
        return;
      }

      const records = [];
      let skippedRows = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^"+|"+$/g, ""));
        if (!cols[firstIdx]) {
          skippedRows++;
          continue;
        }
        // Parse date - handle multiple formats like "11/22/2015 9:51" and "2/17/2017"
        let dateJoined = undefined;
        if (dateIdx !== -1 && cols[dateIdx]) {
          const dateStr = cols[dateIdx].trim();
          // Try parsing with Date constructor (handles "11/22/2015 9:51" and "2/17/2017")
          const d = new Date(dateStr);
          if (!isNaN(d)) {
            dateJoined = d.toISOString().split("T")[0];
          }
        }
        records.push({
           player_number: numIdx !== -1 && cols[numIdx] ? parseInt(cols[numIdx]) : undefined,
           first_name: cols[firstIdx],
           last_name: lastIdx !== -1 ? cols[lastIdx] : "",
           email: emailIdx !== -1 && cols[emailIdx] ? cols[emailIdx].toLowerCase() : "",
           card_guards: guardsIdx !== -1 && cols[guardsIdx] ? parseInt(cols[guardsIdx]) : 0,
           date_joined: dateJoined,
         });
      }

      console.log("Total rows:", lines.length - 1);
      console.log("Valid rows:", records.length);
      console.log("Skipped rows:", skippedRows);

      if (records.length === 0) { setCsvError("No valid rows found in CSV."); return; }

      // Batch insert in chunks of 500 to avoid timeout
      const batchSize = 500;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await base44.entities.Player.bulkCreate(batch);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
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
    <div className="min-h-screen p-1 sm:p-6 bg-green-900/30 w-full overflow-x-hidden box-border">
      <div className="w-full max-w-2xl mx-auto overflow-x-hidden box-border">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/34ac77100_red2012-2.jpg"
              alt="River Rat Rounders"
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white leading-tight">Player Database</h1>
              <p className="text-gray-400 text-xs">{totalCount ?? players.length} players</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 px-2"
              onClick={() => fileInputRef.current.click()}
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Import CSV</span>
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-2"
              onClick={() => setShowForm(!showForm)}
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Add Player</span>
            </Button>
          </div>
        </div>

        {csvError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{csvError}</div>
        )}

        {/* Add Player Form */}
        {showForm && (
          <Card className="bg-gray-900/60 border-gray-700 mb-4">
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
          <div className="space-y-1.5 w-full">
            {isAdmin && <p className="text-xs text-gray-500 mb-2">💡 Click a row to edit</p>}
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