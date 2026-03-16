import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

export const normalizeEmail = (email) => (email || "").trim().toLowerCase();

export const buildFullName = (player) =>
  `${player?.first_name || ""} ${player?.last_name || ""}`.trim();

export const buildSearchName = (player) =>
  buildFullName(player).toLowerCase();

export function getPlayerDisplayName(player) {
  if (!player) return "";
  return player.full_name || `${player.first_name || ""} ${player.last_name || ""}`.trim() || player.email || "";
}

export function usePlayerNameCache(players = []) {
  const [playerNameByEmail, setPlayerNameByEmail] = useState({});
  const [loadingEmails, setLoadingEmails] = useState({});
  const pendingRef = useRef(new Set());

  // Seed cache from full players list
  useEffect(() => {
    if (!Array.isArray(players) || players.length === 0) return;

    setPlayerNameByEmail((prev) => {
      const next = { ...prev };

      for (const p of players) {
        const email = normalizeEmail(p.email);
        if (!email) continue;

        const fullName = `${p.first_name || ""} ${p.last_name || ""}`.trim();
        next[email] = fullName || p.email || email;
      }

      return next;
    });
  }, [players]);

  const ensurePlayerName = useCallback(async (rawEmail) => {
    const email = normalizeEmail(rawEmail);
    if (!email) return "";

    if (playerNameByEmail[email]) return playerNameByEmail[email];
    if (pendingRef.current.has(email)) return "";

    pendingRef.current.add(email);
    setLoadingEmails((prev) => ({ ...prev, [email]: true }));

    try {
      const results = await base44.entities.Player.filter({ email });
      const player = Array.isArray(results) ? results[0] : null;

      const fullName = player
        ? `${player.first_name || ""} ${player.last_name || ""}`.trim()
        : "";

      setPlayerNameByEmail((prev) => ({
        ...prev,
        [email]: fullName || "Unknown Player",
      }));

      return fullName || "Unknown Player";
    } catch (err) {
      setPlayerNameByEmail((prev) => ({
        ...prev,
        [email]: "Unknown Player",
      }));
      return "Unknown Player";
    } finally {
      pendingRef.current.delete(email);
      setLoadingEmails((prev) => {
        const next = { ...prev };
        delete next[email];
        return next;
      });
    }
  }, [playerNameByEmail]);

  const getPlayerName = useCallback(
    (rawEmail) => {
      const email = normalizeEmail(rawEmail);
      if (!email) return "";

      if (playerNameByEmail[email]) return playerNameByEmail[email];
      if (loadingEmails[email]) return "Loading...";

      return "Unknown Player";
    },
    [playerNameByEmail, loadingEmails]
  );

  return {
    normalizeEmail,
    playerNameByEmail,
    ensurePlayerName,
    getPlayerName,
  };
}