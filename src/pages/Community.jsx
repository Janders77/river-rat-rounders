import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, X, Loader2, Megaphone, Phone, Clock, Upload } from "lucide-react";

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
    <div className="min-h-screen p-4 md:p-6" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Megaphone className="w-7 h-7 text-red-400" />
            <h1 className="text-2xl font-bold text-white">Community Board</h1>
          </div>
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white shadow-lg shadow-red-900/40 transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-1" /> Post Ad
            </Button>
          )}
        </div>

        {/* Submit Form */}
        {showForm && (
          <div className="rounded-xl border border-red-700/30 bg-gradient-to-br from-red-950/30 to-red-900/10 p-4 mb-6">
            <h2 className="text-white font-semibold mb-3">New Advertisement</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                placeholder="Title / Business Name *"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="bg-black/30 border-red-700/30 text-white placeholder:text-gray-500"
                required
              />
              <Textarea
                placeholder="Describe your service or business *"
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                className="bg-black/30 border-red-700/30 text-white placeholder:text-gray-500 min-h-[100px]"
                required
              />
              <Input
                placeholder="Contact info (phone, email, website)"
                value={form.contact_info}
                onChange={e => setForm(f => ({ ...f, contact_info: e.target.value }))}
                className="bg-black/30 border-red-700/30 text-white placeholder:text-gray-500"
              />
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Image (optional)</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="post-image" />
                <label htmlFor="post-image" className="flex items-center gap-2 cursor-pointer text-sm text-red-400 hover:text-red-300">
                  {imageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {form.image_url ? "Image uploaded ✓" : "Upload image"}
                </label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting} className="flex-1 bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white shadow-lg shadow-red-900/40 transition-all duration-200">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Submit for Approval
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-gray-700 text-gray-300">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-red-400" /></div>
        ) : (
          <>
            {/* Admin: Pending Posts */}
            {isAdmin && pendingPosts.length > 0 && (
              <div className="mb-6">
                <h2 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Pending Approval ({pendingPosts.length})
                </h2>
                <div className="space-y-3">
                  {pendingPosts.map(post => (
                    <PostCard key={post.id} post={post} isAdmin={isAdmin} onApprove={handleApprove} onReject={handleReject} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )}

            {/* Approved Posts */}
            <div className="mb-6">
              {isAdmin && <h2 className="text-red-400 font-semibold mb-3">Approved Posts ({approvedPosts.length})</h2>}
              {approvedPosts.length === 0 ? (
                <p className="text-gray-500 text-center py-12">No posts yet. Be the first to advertise!</p>
              ) : (
                <div className="space-y-3">
                  {approvedPosts.map(post => (
                    <PostCard key={post.id} post={post} isAdmin={isAdmin} onApprove={handleApprove} onReject={handleReject} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>

            {/* Admin: Rejected Posts */}
            {isAdmin && rejectedPosts.length > 0 && (
              <div>
                <h2 className="text-red-400 font-semibold mb-3">Rejected ({rejectedPosts.length})</h2>
                <div className="space-y-3">
                  {rejectedPosts.map(post => (
                    <PostCard key={post.id} post={post} isAdmin={isAdmin} onApprove={handleApprove} onReject={handleReject} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, isAdmin, onApprove, onReject, onDelete }) {
  const statusColors = {
    approved: "bg-red-700/20 border-red-500/50 text-red-300",
    pending: "bg-red-600/20 border-red-500/50 text-red-300",
    rejected: "bg-red-600/20 border-red-500/50 text-red-300"
  };

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-red-950/20 to-red-900/5 p-4 overflow-hidden">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-white font-semibold text-sm truncate">{post.title}</h3>
            {isAdmin && <Badge className={`text-xs ${statusColors[post.status]}`}>{post.status}</Badge>}
          </div>
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{post.body}</p>
          {post.contact_info && (
            <div className="flex items-center gap-1 mt-2 text-red-400 text-xs">
              <Phone className="w-3 h-3" /> {post.contact_info}
            </div>
          )}
          {post.image_url && (
            <img src={post.image_url} alt="post" className="mt-3 rounded-lg max-h-48 object-cover w-full" />
          )}
          <p className="text-gray-600 text-xs mt-2">By {post.author_name || "Unknown Player"}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-1 shrink-0">
            {post.status !== "approved" && (
              <Button size="icon" variant="ghost" onClick={() => onApprove(post)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-7 w-7">
                <Check className="w-3.5 h-3.5" />
              </Button>
            )}
            {post.status !== "rejected" && (
              <Button size="icon" variant="ghost" onClick={() => onReject(post)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-7 w-7">
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={() => onDelete(post.id)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-7 w-7">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}