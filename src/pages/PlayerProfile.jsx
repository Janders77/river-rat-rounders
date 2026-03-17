import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Edit2, X, KeyRound, MapPin, Gamepad2 } from "lucide-react";

const PLACEMENT_POINTS = [1000, 750, 600, 500, 400, 300, 200, 100, 50];

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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [winHistory, setWinHistory] = useState([]);
  const [winsLoading, setWinsLoading] = useState(false);
  const [gamesPlayed, setGamesPlayed] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(false);

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

    // Use localStorage playerEmail (player-level login) as the "current" player
    const loggedInPlayerEmail = localStorage.getItem("playerEmail") || currentUser.email;

    // Determine which user's profile to show
    const emailToLoad = viewingEmail || loggedInPlayerEmail;
    const isOwnProf = emailToLoad === loggedInPlayerEmail;
    setIsOwnProfile(isOwnProf);

    const players = await base44.entities.Player.filter({ email: emailToLoad });
    if (players.length > 0) {
      const p = players[0];
      setPlayerData(p);
      // Load win history for this specific player by their player_id
      setWinsLoading(true);
      const wins = await base44.entities.Game.filter({ winner_player_id: p.id }, '-game_date', 100);
      setWinHistory(wins);
      setWinsLoading(false);
      // Always prefer the Player entity name over the auth user name
      // Always build name from first_name + last_name only — never from auth full_name (it can be the email)
      const playerName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      setFullName(playerName);
      
      // Set profile image - only use Player.profile_picture, never fall back to auth user's image
      const imageUrl = p.profile_picture || "";
      setProfileImageUrl(imageUrl);
      
      setUser({ ...currentUser, email: emailToLoad });
    } else {
      setUser(currentUser);
      // Even in fallback, don't show email as name
      setFullName("");
      setProfileImageUrl("");
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
    setTimeout(() => {
      setPasswordStatus("idle");
      setShowPasswordModal(false);
    }, 1500);
  };

  const handleImageUpload = async (e) => {
    if (!isOwnProfile) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadStatus("loading");
    setImageFile(file);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    if (playerData) {
      await base44.entities.Player.update(playerData.id, { profile_picture: file_url });
      setPlayerData(prev => ({ ...prev, profile_picture: file_url }));
    }
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
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">Player Profile</h1>
          </div>
          {isOwnProfile && (
            <button onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Change Password
            </button>
          )}
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
                        setPlayerData(prev => ({ ...prev, first_name: firstName, last_name: lastName }));
                        localStorage.setItem("playerName", trimmed);
                      }
                      await base44.auth.updateMe({ full_name: trimmed });

                      setUser(prev => ({ ...prev, full_name: trimmed }));
                      setFullName(trimmed);
                      setNameUpdateStatus("done");
                      setEditingName(false);
                      setTimeout(() => setNameUpdateStatus("idle"), 2000);
                    }}
                    className="bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white shadow-lg shadow-red-900/40 transition-all duration-200"
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

        {/* Win History Section */}
        {playerData && (
          <div className="bg-transparent border border-red-500/40 rounded-xl p-8 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              🏆 Win History
              {!winsLoading && (
                <span className="text-sm font-normal text-gray-400">({winHistory.length} win{winHistory.length !== 1 ? 's' : ''})</span>
              )}
            </h2>
            {winsLoading ? (
              <div className="text-gray-500 text-sm">Loading...</div>
            ) : winHistory.length === 0 ? (
              <div className="text-gray-500 text-sm">No wins recorded yet.</div>
            ) : (
              <div className="space-y-2">
                {winHistory.map(game => (
                  <div key={game.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div>
                      <div className="text-white text-sm font-medium">{game.game_type || 'Game'}</div>
                      <div className="text-gray-400 text-xs">
                        {game.game_date ? new Date(game.game_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        {game.location ? ` · ${game.location}` : ''}
                      </div>
                    </div>
                    <div className="text-red-400 font-bold text-sm">{game.points_awarded || 1000} pts</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Password Modal */}
        {isOwnProfile && showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background: "rgba(0,0,0,0.7)"}}>
            <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-semibold text-base flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-red-400" /> Change Password
                </h2>
                <button onClick={() => { setShowPasswordModal(false); setPasswordStatus("idle"); setNewPassword(""); setConfirmPassword(""); }}
                  className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="text-gray-400 text-xs block mb-1.5">New Password</label>
                  <Input type="password" placeholder="Enter new password" value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    disabled={passwordStatus === "loading"} />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1.5">Confirm Password</label>
                  <Input type="password" placeholder="Confirm new password" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    disabled={passwordStatus === "loading"} />
                </div>
                {passwordStatus === "done" && (
                  <p className="text-green-400 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Password updated!
                  </p>
                )}
                {passwordStatus === "error" && (
                  <p className="text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Passwords do not match or are empty
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button type="submit"
                    className="flex-1 bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white"
                    disabled={passwordStatus === "loading"}>
                    {passwordStatus === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                  </Button>
                  <Button type="button" variant="outline" className="border-gray-700 text-gray-400 hover:text-white"
                    onClick={() => { setShowPasswordModal(false); setPasswordStatus("idle"); setNewPassword(""); setConfirmPassword(""); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
          </div>
          </div>
          );
          }