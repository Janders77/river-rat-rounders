import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { externalApi } from "@/functions/externalApi";
import { getEffectivePlayerIds } from "@/utils/playerUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, CheckCircle2, AlertCircle, Edit2, X, KeyRound, Trophy } from "lucide-react";

const PLACEMENT_POINTS = [1000, 750, 600, 500, 400, 300, 200, 100, 50];

function formatQuarter(q) {
  if (!q) return "";
  const [year, qPart] = q.split("-");
  const num = qPart?.replace("Q", "");
  const months = { "1": "Jan–Mar", "2": "Apr–Jun", "3": "Jul–Sep", "4": "Oct–Dec" };
  return `${months[num] || qPart} ${year}`;
}

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
  const [expandedLocations, setExpandedLocations] = useState({});
  const [quarterlyStats, setQuarterlyStats] = useState([]);
  const [currentQuarter, setCurrentQuarter] = useState(null);

  const ALL_LOCATIONS = ["Tavern 018 Sun", "East End Bar & Grill", "Fridas", "Tavern 018 Wed", "Meddlesome Brewery", "MFS Brewing"];

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
      
      // Load all games where this player appears in player_ids (not just wins)
      setGamesLoading(true);
      const allGames = await base44.entities.Game.list('-game_date', 500);
      const allPlayers = await base44.entities.Player.list();
      const playerGames = allGames.filter(g => {
        const playerIds = getEffectivePlayerIds(g, allPlayers);
        return playerIds.includes(p.id);
      });
      setGamesPlayed(playerGames);
      setGamesLoading(false);
      // Always prefer the Player entity name over the auth user name
      // Always build name from first_name + last_name only — never from auth full_name (it can be the email)
      const playerName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      setFullName(playerName);
      
      // Set profile image - only use Player.profile_picture, never fall back to auth user's image
      const imageUrl = p.profile_picture || "";
      setProfileImageUrl(imageUrl);
      
      setUser({ ...currentUser, email: emailToLoad });

      // Load quarterly stats for this player
      try {
        const qRes = await externalApi({ action: "getPlayerQuarterlyStats", params: { player_id: p.id } });
        setQuarterlyStats(qRes?.stats || []);
        const cqRes = await externalApi({ action: "getAvailableQuarters" });
        setCurrentQuarter(cqRes?.current || null);
      } catch {}
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

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (playerData) {
        await base44.entities.Player.update(playerData.id, { profile_picture: file_url });
        setPlayerData(prev => ({ ...prev, profile_picture: file_url }));
      }
      setProfileImageUrl(file_url);
      setImageUploadStatus("done");
      setTimeout(() => setImageUploadStatus("idle"), 3000);
    } catch {
      setImageUploadStatus("error");
      setTimeout(() => setImageUploadStatus("idle"), 3000);
    }
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
    <div className="min-h-screen relative overflow-x-hidden" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none" style={{background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08), transparent 70%)"}} />
      <div className="relative max-w-md mx-auto w-full px-4 pt-5 pb-10 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-white/80" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">Player Profile</h1>
              <p className="text-base text-white/40 mt-0.5 leading-none">Your stats and account info</p>
            </div>
          </div>
          {isOwnProfile && (
            <button onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-1.5 text-base text-white/40 hover:text-white/70 transition-colors border border-white/10 hover:border-white/20 rounded-lg px-3 py-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Password
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
            <p className="text-green-400 text-base mt-4 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Photo updated
            </p>
          )}
          {imageUploadStatus === "error" && (
            <p className="text-red-400 text-base mt-4 flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4" /> Upload failed, try again
            </p>
          )}
        </div>

        {/* User Information Section */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-3">
          <h2 className="text-base font-semibold text-gray-400 uppercase tracking-wider mb-4">Account Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-base">Full Name</label>
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
                      if (!isOwnProfile) return;
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
                      const playerName = [playerData?.first_name, playerData?.last_name].filter(Boolean).join(" ").trim();
                      setFullName(playerName);
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
                <p className="text-green-400 text-base mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Name updated
                </p>
              )}
              {nameUpdateStatus === "error" && (
                <p className="text-red-400 text-base mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Please enter both a first and last name
                </p>
              )}
            </div>
            <div>
              <label className="text-gray-400 text-base">Email</label>
              <div className="text-white font-medium">{user.email}</div>
            </div>
            {playerData && (
              <>
                <div>
                  <label className="text-gray-400 text-base">Player #</label>
                  <div className="text-white font-medium">{playerData.player_number || "N/A"}</div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-gray-400 text-base">Card Guards</label>
                  <div className="flex items-center gap-2">
                    <div className="text-white font-medium">{playerData.card_guards || 0}</div>
                    {playerData.card_guards > 0 && (
                      <div className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <span className="text-base font-semibold text-amber-400">♠</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Card Guards (Tournament Wins) + Quarterly Stats */}
        {playerData && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            {/* Trophy wins header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-base font-semibold text-white">Tournament Wins</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-amber-400 font-black text-lg leading-none">{playerData.card_guards || 0}</span>
                <span className="text-amber-400 text-base leading-none">♠</span>
              </div>
            </div>
            <p className="text-[11px] text-white/30 mb-4 leading-relaxed">
              Each ♠ card guard represents a 1st place tournament win. Card guards are awarded automatically when you win a game.
            </p>

            {/* Win history list */}
            {winsLoading ? (
              <div className="text-white/30 text-base">Loading wins...</div>
            ) : winHistory.length === 0 ? (
              <div className="text-white/25 text-base">No wins recorded yet.</div>
            ) : (
              <div className="space-y-1">
                {winHistory.map(game => (
                  <div key={game.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <div>
                      <div className="text-white/80 text-base font-medium">{game.game_type || 'Tournament'}</div>
                      <div className="text-white/30 text-base">
                        {game.game_date ? new Date(game.game_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        {game.location ? ` · ${game.location}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 text-base">♠</span>
                      <span className="text-red-400 font-bold text-base tabular-nums">{game.points_awarded || 1000} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quarterly Points Breakdown */}
        {playerData && quarterlyStats.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-base text-white/30 font-semibold uppercase tracking-wider mb-3">Quarterly Points</p>
            <div className="space-y-2">
              {quarterlyStats.map(stat => {
                const isCurrent = stat.quarter === currentQuarter;
                return (
                  <div key={stat.quarter} className={`flex items-center justify-between py-2 px-3 rounded-lg ${isCurrent ? 'bg-red-500/5 border border-red-500/20' : 'bg-white/[0.03]'}`}>
                    <div>
                      <div className="text-white/70 text-base font-medium">{formatQuarter(stat.quarter)}</div>
                      {isCurrent && <div className="text-[9px] text-red-400 font-semibold uppercase tracking-wide">Current Quarter</div>}
                    </div>
                    <div className="flex items-center gap-3">
                      {stat.wins > 0 && (
                        <span className="text-amber-400 text-base font-bold">{stat.wins}♠</span>
                      )}
                      <span className="text-red-400 font-black text-base tabular-nums">{stat.points} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Games Played Section */}
        {playerData && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-3">
            <h2 className="text-base font-semibold text-gray-400 uppercase tracking-wider mb-4">Games Played</h2>
            {gamesLoading ? (
              <div className="text-gray-500 text-base">Loading...</div>
            ) : (
              <div className="space-y-1">
                {ALL_LOCATIONS.map(location => {
                  const locationGames = gamesPlayed
                    .filter(g => (g.location || 'Unknown') === location)
                    .sort((a, b) => new Date(b.game_date) - new Date(a.game_date));
                  
                  const stats = locationGames.reduce((acc, game) => {
                    const playerIds = getEffectivePlayerIds(game, playerData ? [playerData] : []);
                    const placement = playerIds.indexOf(playerData.id);
                    if (placement >= 0) {
                      acc.games += 1;
                      acc.points += PLACEMENT_POINTS[placement] || 0;
                    }
                    return acc;
                  }, { games: 0, points: 0 });

                  const isExpanded = expandedLocations[location] || false;

                  return (
                    <div key={location} className="border border-gray-800/60 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedLocations(prev => ({ ...prev, [location]: !prev[location] }))}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <span className={`text-base transition-transform ${isExpanded ? 'rotate-90' : ''} text-gray-600`}>▶</span>
                          <div className="flex-1">
                            <div className="text-white font-medium text-base">{location}</div>
                            {stats.games > 0 && <div className="text-gray-600 text-base">{stats.games} game{stats.games !== 1 ? 's' : ''}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {stats.points > 0 && <span className="text-red-400 font-bold text-base tabular-nums">{stats.points} pts</span>}
                          {stats.games === 0 && <span className="text-gray-700 text-base">—</span>}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-800/50 divide-y divide-gray-800/40">
                          {locationGames.length === 0 ? (
                            <div className="text-gray-600 text-base px-4 py-3">No recorded games at this location</div>
                          ) : (
                            locationGames.map(game => {
                              const playerIds = getEffectivePlayerIds(game, playerData ? [playerData] : []);
                              const placement = playerIds.indexOf(playerData.id);
                              const points = PLACEMENT_POINTS[placement] || 0;
                              const placementLabel = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'][placement] || `${placement + 1}th`;

                              return (
                                <div key={game.id} className="flex items-center justify-between px-4 py-2 text-base bg-gray-900/20">
                                  <span className="text-gray-400">
                                    {game.game_date ? new Date(game.game_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                    {game.game_type && ` · ${game.game_type}`}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="bg-gray-800 text-gray-300 rounded px-2 py-0.5 font-medium">{placementLabel}</span>
                                    <span className="text-red-400 font-bold tabular-nums">{points} pts</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {gamesPlayed.length === 0 && (
                  <div className="text-gray-500 text-base py-4 text-center">No recorded games yet.</div>
                )}
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
                  <label className="text-gray-400 text-base block mb-1.5">New Password</label>
                  <Input type="password" placeholder="Enter new password" value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    disabled={passwordStatus === "loading"} />
                </div>
                <div>
                  <label className="text-gray-400 text-base block mb-1.5">Confirm Password</label>
                  <Input type="password" placeholder="Confirm new password" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    disabled={passwordStatus === "loading"} />
                </div>
                {passwordStatus === "done" && (
                  <p className="text-green-400 text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Password updated!
                  </p>
                )}
                {passwordStatus === "error" && (
                  <p className="text-red-400 text-base flex items-center gap-2">
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
