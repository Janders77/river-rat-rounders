import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { externalApi } from "@/functions/externalApi";
import { Input } from "@/components/ui/input";
import { UserPlus, Upload, Users, Search, Loader2 } from "lucide-react";
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

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        if (user?.role !== "admin") { window.location.href = createPageUrl("Home"); return; }
        setIsAdmin(true);
      } catch { window.location.href = createPageUrl("Home"); }
    };
    checkAdmin();
  }, []);

  const loadPlayers = async () => {
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
    const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
    await Promise.all([
      base44.entities.Player.create({
        player_number: form.player_number ? parseInt(form.player_number) : undefined,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        card_guards: form.card_guards ? parseInt(form.card_guards) : 0,
        date_joined: form.date_joined || undefined,
      }),
      externalApi({ action: "createPlayer", params: { name: fullName } }).catch(e => console.warn("External API createPlayer failed:", e)),
    ]);
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
      const numIdx = header.indexOf("number");
      const firstIdx = header.findIndex(h => h === "first_name" || h === "first");
      const lastIdx = header.findIndex(h => h === "last_name" || h === "last");
      const emailIdx = header.indexOf("email");
      const guardsIdx = header.findIndex(h => h === "card_guards" || h === "guards");
      const dateIdx = header.indexOf("day");
      if (firstIdx === -1) { setCsvError("CSV must have a 'first_name' column."); return; }
      const records = [];
      let skippedRows = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^"+|"+$/g, ""));
        if (!cols[firstIdx]) { skippedRows++; continue; }
        let dateJoined = undefined;
        if (dateIdx !== -1 && cols[dateIdx]) {
          const d = new Date(cols[dateIdx].trim());
          if (!isNaN(d)) dateJoined = d.toISOString().split("T")[0];
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
      if (records.length === 0) { setCsvError("No valid rows found in CSV."); return; }
      const batchSize = 500;
      for (let i = 0; i < records.length; i += batchSize) {
        await base44.entities.Player.bulkCreate(records.slice(i, i + batchSize));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      loadPlayers();
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filtered = players.filter(p =>
    `${p.player_number} ${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: "linear-gradient(170deg, #14141c 0%, #1a1a26 60%, #14141c 100%)" }}>
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08), transparent 70%)" }} />

      <div className="max-w-md mx-auto w-full px-4 pt-5 pb-10 flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-white/80" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">Player Database</h1>
              <p className="text-[10px] text-gray-600 mt-0.5 leading-none">{totalCount ?? players.length} players</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current.click()}
              className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              title="Import CSV"
            >
              <Upload className="w-5 h-5 text-white/80" />
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
            <button
              onClick={() => setShowForm(!showForm)}
              className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              title="Add Player"
            >
              <UserPlus className="w-5 h-5 text-white/80" />
            </button>
          </div>
        </div>

        {csvError && (
          <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "rgba(255,100,100,0.9)" }}>
            {csvError}
          </div>
        )}

        {/* Add Player Form */}
        {showForm && (
          <div className="rounded-xl mb-5 p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <h2 className="text-white font-semibold text-base mb-4">New Player</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="# number" type="number" value={form.player_number}
                  onChange={e => setForm(f => ({ ...f, player_number: e.target.value }))}
                  className="bg-black/20 border-white/10 text-white placeholder:text-white/30 col-span-2 sm:col-span-1" />
                <Input placeholder="First name *" value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  className="bg-black/20 border-white/10 text-white placeholder:text-white/30" required />
                <Input placeholder="Last name" value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  className="bg-black/20 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <Input type="email" placeholder="Email *" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="bg-black/20 border-white/10 text-white placeholder:text-white/30" required />
              <div className="flex gap-2">
                <Input placeholder="Card guards" type="number" value={form.card_guards}
                  onChange={e => setForm(f => ({ ...f, card_guards: e.target.value }))}
                  className="bg-black/20 border-white/10 text-white placeholder:text-white/30" />
                <Input placeholder="Date joined" type="date" value={form.date_joined}
                  onChange={e => setForm(f => ({ ...f, date_joined: e.target.value }))}
                  className="bg-black/20 border-white/10 text-white [color-scheme:dark]" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                  Cancel
                </button>
                <button type="submit" disabled={adding}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  {adding ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Add Player"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
          <input
            placeholder="Search players…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white/80 placeholder:text-white/20 outline-none transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>

        {/* Player List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-white/20" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center mb-1">
              <Users className="w-5 h-5 text-white/20" />
            </div>
            <p className="text-white/50 text-sm font-medium">No players found</p>
            <p className="text-white/25 text-xs">{search ? "Try a different search" : "Add a player to get started"}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 w-full">
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