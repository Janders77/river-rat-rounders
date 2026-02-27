import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

export default function PlayerProfile() {
  const [user, setUser] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("idle");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [imageUploadStatus, setImageUploadStatus] = useState("idle");
  const [imageFile, setImageFile] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName] = useState("");
  const [nameUpdateStatus, setNameUpdateStatus] = useState("idle");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    const currentUser = await base44.auth.me();
    if (!currentUser) {
      window.location.href = "/";
      return;
    }
    setUser(currentUser);
    setProfileImageUrl(currentUser.profile_image_url || "");

    const players = await base44.entities.Player.filter({ email: currentUser.email });
    if (players.length > 0) {
      const p = players[0];
      setPlayerData(p);
      // Use player first/last name as the canonical display name
      const playerName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      const displayName = playerName || currentUser.full_name || "";
      setFullName(displayName);
      // If the auth full_name differs, sync it
      if (displayName && displayName !== currentUser.full_name) {
        await base44.auth.updateMe({ full_name: displayName });
        setUser({ ...currentUser, full_name: displayName });
      } else {
        setUser(currentUser);
      }
    } else {
      setFullName(currentUser.full_name || "");
      setUser(currentUser);
    }
    setLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setPasswordStatus("error");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("error");
      return;
    }
    
    setPasswordStatus("loading");
    await base44.auth.updateMe({ password: newPassword });
    setPasswordStatus("done");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordStatus("idle"), 3000);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadStatus("loading");
    setImageFile(file);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    await base44.auth.updateMe({ profile_image_url: file_url });
    setProfileImageUrl(file_url);
    setImageUploadStatus("done");
    
    setTimeout(() => setImageUploadStatus("idle"), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#16171B] flex items-center justify-center p-6">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#16171B] flex items-center justify-center p-6">
        <div className="text-gray-400">Unauthorized</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#16171B] p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link to={createPageUrl("Leaderboard")}>
            <Button variant="outline" size="icon" className="border-gray-700 text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white">Player Profile</h1>
        </div>

        {/* Profile Picture Section */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-8 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Profile Picture</h2>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full border-2 border-gray-700 overflow-hidden bg-gray-800 flex items-center justify-center shrink-0">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt={user.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-500 text-2xl">{user.full_name?.[0]?.toUpperCase() || "?"}</div>
              )}
            </div>
            <div className="flex-1">
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="profile-image-input"
                  disabled={imageUploadStatus === "loading"}
                />
                <label htmlFor="profile-image-input">
                  <Button
                    as="div"
                    className="bg-green-600 hover:bg-green-700 text-white cursor-pointer flex items-center gap-2"
                    disabled={imageUploadStatus === "loading"}
                  >
                    {imageUploadStatus === "loading" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {imageUploadStatus === "loading" ? "Uploading..." : "Upload Photo"}
                  </Button>
                </label>
              </div>
              {imageUploadStatus === "done" && (
                <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Photo updated
                </p>
              )}
              <p className="text-gray-400 text-sm mt-2">JPG, PNG or GIF. Max 10MB.</p>
            </div>
          </div>
        </div>

        {/* User Information Section */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-8 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm">Full Name</label>
              {editingName ? (
                <div className="flex gap-2 mt-2">
                  <Input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white flex-1"
                    disabled={nameUpdateStatus === "loading"}
                  />
                  <Button
                    onClick={async () => {
                      setNameUpdateStatus("loading");
                      const nameParts = fullName.trim().split(/\s+/);
                      const firstName = nameParts[0] || "";
                      const lastName = nameParts.slice(1).join(" ") || "";
                      
                      await base44.auth.updateMe({ full_name: fullName.trim() });
                      if (playerData) {
                        await base44.entities.Player.update(playerData.id, {
                          first_name: firstName,
                          last_name: lastName
                        });
                        // Update localStorage so sidebar and other components stay in sync
                        localStorage.setItem("playerName", fullName.trim());
                      }
                      
                      const refreshed = await base44.auth.me();
                      setUser(refreshed);
                      setFullName(refreshed.full_name || fullName.trim());
                      setNameUpdateStatus("done");
                      setEditingName(false);
                      setTimeout(() => setNameUpdateStatus("idle"), 2000);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={nameUpdateStatus === "loading"}
                  >
                    {nameUpdateStatus === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </Button>
                  <Button
                    onClick={() => {
                      setFullName(user.full_name);
                      setEditingName(false);
                    }}
                    variant="outline"
                    className="border-gray-700"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-white font-medium">{user.full_name}</div>
                  <Button
                    onClick={() => setEditingName(true)}
                    variant="outline"
                    size="sm"
                    className="border-gray-700 text-gray-400 hover:text-white"
                  >
                    Edit
                  </Button>
                </div>
              )}
              {nameUpdateStatus === "done" && (
                <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Name updated
                </p>
              )}
            </div>
            <div>
              <label className="text-gray-400 text-sm">Email</label>
              <div className="text-white font-medium">{user.email}</div>
            </div>
            {playerData && (
              <>
                <div>
                  <label className="text-gray-400 text-sm">Player #</label>
                  <div className="text-white font-medium">{playerData.player_number || "N/A"}</div>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Card Guards</label>
                  <div className="text-white font-medium">{playerData.card_guards || 0}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Password Change Section */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-8">
          <h2 className="text-lg font-semibold text-white mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-2">New Password</label>
              <Input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                disabled={passwordStatus === "loading"}
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-2">Confirm Password</label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                disabled={passwordStatus === "loading"}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={passwordStatus === "loading"}
            >
              {passwordStatus === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Update Password"
              )}
            </Button>
            {passwordStatus === "done" && (
              <p className="text-green-400 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Password updated successfully
              </p>
            )}
            {passwordStatus === "error" && (
              <p className="text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Passwords do not match or are empty
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}