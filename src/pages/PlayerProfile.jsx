import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Edit2 } from "lucide-react";

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
  const [isOwnProfile, setIsOwnProfile] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    const params = new URLSearchParams(window.location.search);
    const viewingEmail = params.get("email");
    
    const currentUser = await base44.auth.me();
    if (!currentUser) {
      window.location.href = "/";
      return;
    }

    // Determine which user's profile to show
    const emailToLoad = viewingEmail || currentUser.email;
    const isOwnProf = emailToLoad === currentUser.email;
    setIsOwnProfile(isOwnProf);

    const players = await base44.entities.Player.filter({ email: emailToLoad });
    if (players.length > 0) {
      const p = players[0];
      setPlayerData(p);
      // Always prefer the Player entity name over the auth user name
      // Always build name from first_name + last_name only — never from auth full_name (it can be the email)
      const playerName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      setFullName(playerName);
      
      // Set profile image - prefer Player.profile_picture, fall back to auth profile_image_url
      const imageUrl = p.profile_picture || currentUser.profile_image_url || "";
      setProfileImageUrl(imageUrl);
      
      setUser({ ...currentUser, email: emailToLoad });
    } else {
      setUser(currentUser);
      // Even in fallback, don't show email as name
      setFullName("");
      setProfileImageUrl(currentUser.profile_image_url || "");
    }
    setLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!isOwnProfile) return;
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
    if (!isOwnProfile) return;
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
      <div className="min-h-screen flex items-center justify-center p-6" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
        <div className="text-gray-400">Unauthorized</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
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
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-40 h-40 rounded-full border-4 border-gray-700 overflow-hidden bg-gray-800 flex items-center justify-center">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt={user.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-500 text-6xl">{(fullName || user.full_name)?.[0]?.toUpperCase() || "?"}</div>
              )}
            </div>
            {isOwnProfile && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="profile-image-input"
                  disabled={imageUploadStatus === "loading"}
                />
                <label htmlFor="profile-image-input" className="absolute bottom-0 right-0 cursor-pointer">
                  <div className="w-7 h-7 bg-gradient-to-br from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 rounded-full flex items-center justify-center border-2 border-gray-900 shadow-lg">
                    {imageUploadStatus === "loading" ? (
                      <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    ) : (
                      <Edit2 className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                </label>
              </>
            )}
          </div>
          {imageUploadStatus === "done" && (
            <p className="text-green-400 text-sm mt-4 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Photo updated
            </p>
          )}
        </div>

        {/* User Information Section */}
        <div className="bg-transparent border border-red-500/40 rounded-xl p-8 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm">Full Name</label>
              {editingName && isOwnProfile ? (
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
                      const trimmed = fullName.trim();
                      const nameParts = trimmed.split(/\s+/);
                      if (nameParts.length < 2 || !nameParts[0] || !nameParts[1]) {
                        setNameUpdateStatus("error");
                        return;
                      }
                      setNameUpdateStatus("loading");
                      const firstName = nameParts[0];
                      const lastName = nameParts.slice(1).join(" ");

                      if (playerData) {
                        await base44.entities.Player.update(playerData.id, {
                          first_name: firstName,
                          last_name: lastName
                        });
                        localStorage.setItem("playerName", trimmed);
                      }
                      await base44.auth.updateMe({ full_name: trimmed });

                      setUser(prev => ({ ...prev, full_name: trimmed }));
                      setFullName(trimmed);
                      setNameUpdateStatus("done");
                      setEditingName(false);
                      setTimeout(() => setNameUpdateStatus("idle"), 2000);
                    }}
                    className="bg-gradient-to-r from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 text-white"
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
                  <div className="text-white font-medium">{fullName || "—"}</div>
                  {isOwnProfile && (
                    <Button
                      onClick={() => setEditingName(true)}
                      variant="outline"
                      size="sm"
                      className="border-gray-700 text-gray-400 hover:text-white"
                    >
                      Edit
                    </Button>
                  )}
                </div>
              )}
              {nameUpdateStatus === "done" && (
                <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Name updated
                </p>
              )}
              {nameUpdateStatus === "error" && (
                <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Please enter both a first and last name
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
         {isOwnProfile && (
         <div className="bg-transparent border border-red-500/40 rounded-xl p-8">
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
              className="w-full bg-gradient-to-r from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 text-white"
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
          )}
          </div>
          </div>
          );
          }