import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Check, X, Loader2, Megaphone, Phone, Clock, Upload } from "lucide-react";

const CARD = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};

export default function Community() {
  const [posts, setPosts] = useState([]);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", contact_info: "", image_url: "" });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    setIsAdmin(currentUser?.role === "admin");

    let fetched;
    if (currentUser?.role === "admin") {
      fetched = await base44.entities.CommunityPost.list("-created_date");
    } else {
      fetched = await base44.entities.CommunityPost.filter({ status: "approved" }, "-created_date");
    }
    setPosts(fetched);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.body) return;
    setSubmitting(true);
    const playerEmail = localStorage.getItem("playerEmail") || user.email;
    const players = await base44.entities.Player.filter({ email: playerEmail }).catch(() => []);
    const player = players[0];
    const authorName = player
      ? `${player.first_name || ""} ${player.last_name || ""}`.trim()
      : (user.full_name && !user.full_name.includes("@") ? user.full_name : "Unknown Player");

    await base44.entities.CommunityPost.create({
      ...form,
      author_email: playerEmail,
      author_name: authorName,
      status: "pending"
    });
    setForm({ title: "", body: "", contact_info: "", image_url: "" });
    setShowForm(false);
    setSubmitting(false);
    await loadData();
  };

  const handleApprove = async (post) => {
    await base44.entities.CommunityPost.update(post.id, { status: "approved" });
    await loadData();
  };

  const handleReject = async (post) => {
    await base44.entities.CommunityPost.update(post.id, { status: "rejected" });
    await loadData();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this post?")) return;
    await base44.entities.CommunityPost.delete(id);
    await loadData();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, image_url: file_url }));
    setImageUploading(false);
  };

  const approvedPosts = posts.filter(p => p.status === "approved");
  const pendingPosts = posts.filter(p => p.status === "pending");
  const rejectedPosts = posts.filter(p => p.status === "rejected");

  return (
    <div className="min-h-screen relative" style={{ background: "linear-gradient(170deg, #14141c 0%, #1a1a26 60%, #14141c 100%)" }}>
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08), transparent 70%)" }} />

      <div className="relative max-w-md mx-auto px-4 pt-5 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-white/80" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">Community Board</h1>
              <p className="text-[10px] text-gray-600 mt-0.5 leading-none">Player ads & announcements</p>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Plus className="w-5 h-5 text-white/80" />
            </button>
          )}
        </div>

        {/* Submit Form */}
        {showForm && (
          <div className="rounded-xl mb-5 p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <h2 className="text-white font-semibold text-base mb-4">New Advertisement</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                placeholder="Title / Business Name *"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
                required
              />
              <Textarea
                placeholder="Describe your service or business *"
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                className="bg-black/20 border-white/10 text-white placeholder:text-white/30 min-h-[80px]"
                required
              />
              <Input
                placeholder="Contact info (phone, email, website)"
                value={form.contact_info}
                onChange={e => setForm(f => ({ ...f, contact_info: e.target.value }))}
                className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
              />
              <div>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="post-image" />
                <label htmlFor="post-image"
                  className="flex items-center gap-2 cursor-pointer text-xs px-3 py-2 rounded-lg w-fit transition-colors"
                  style={{ border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.35)" }}>
                  {imageUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {form.image_url ? "Image uploaded ✓" : "Upload image"}
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Submit for Approval"}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-white/20" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">

            {/* Admin: Pending Posts */}
            {isAdmin && pendingPosts.length > 0 && (
              <div>
                <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-2 px-0.5">
                  Pending · {pendingPosts.length}
                </p>
                <div className="flex flex-col gap-2">
                  {pendingPosts.map(post => (
                    <PostCard key={post.id} post={post} isAdmin={isAdmin} onApprove={handleApprove} onReject={handleReject} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )}

            {/* Approved Posts */}
            <div>
              {isAdmin && (
                <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-2 px-0.5">
                  Approved · {approvedPosts.length}
                </p>
              )}
              {approvedPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center mb-1">
                    <Megaphone className="w-5 h-5 text-white/20" />
                  </div>
                  <p className="text-white/50 text-sm font-medium">No posts yet</p>
                  <p className="text-white/25 text-xs">Be the first to advertise</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {approvedPosts.map(post => (
                    <PostCard key={post.id} post={post} isAdmin={isAdmin} onApprove={handleApprove} onReject={handleReject} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>

            {/* Admin: Rejected Posts */}
            {isAdmin && rejectedPosts.length > 0 && (
              <div>
                <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-2 px-0.5">
                  Rejected · {rejectedPosts.length}
                </p>
                <div className="flex flex-col gap-2">
                  {rejectedPosts.map(post => (
                    <PostCard key={post.id} post={post} isAdmin={isAdmin} onApprove={handleApprove} onReject={handleReject} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, isAdmin, onApprove, onReject, onDelete }) {
  return (
    <div className="w-full rounded-xl overflow-hidden" style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      {post.image_url && (
        <img src={post.image_url} alt="post" className="w-full h-32 object-cover" />
      )}
      <div className="px-3.5 py-3 flex flex-col gap-1.5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-white font-semibold text-sm leading-tight">{post.title}</span>
          {isAdmin && (
            <div className="flex gap-1 shrink-0">
              {post.status !== "approved" && (
                <button onClick={() => onApprove(post)}
                  className="w-6 h-6 flex items-center justify-center rounded transition-colors text-white/20 hover:text-green-400">
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
              {post.status !== "rejected" && (
                <button onClick={() => onReject(post)}
                  className="w-6 h-6 flex items-center justify-center rounded transition-colors text-white/20 hover:text-white/60">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => onDelete(post.id)}
                className="w-6 h-6 flex items-center justify-center rounded transition-colors text-white/20 hover:text-red-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <p className="text-white/50 text-xs leading-relaxed">{post.body}</p>

        {/* Contact */}
        {post.contact_info && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Phone className="w-3 h-3 text-white/25 shrink-0" />
            <span className="text-white/40 text-xs">{post.contact_info}</span>
          </div>
        )}

        {/* Author */}
        <p className="text-white/20 text-[10px] mt-0.5">By {post.author_name || "Unknown Player"}</p>
      </div>
    </div>
  );
}