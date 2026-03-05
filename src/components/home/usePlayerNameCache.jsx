import { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const normalize = (email) => (email || "").trim().toLowerCase();

// Shared in-memory cache across all hook instances within the same page load
const globalCache = {};
const pendingFetches = new Set();

export function usePlayerNameCache() {
  const [, setVersion] = useState(0);
  const bump = () => setVersion(v => v + 1);

  const seedFromPlayers = useCallback((players) => {
    let changed = false;
    players.forEach(p => {
      const key = normalize(p.email);
      if (key && !globalCache[key]) {
        globalCache[key] = `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email;
        changed = true;
      }
    });
    if (changed) bump();
  }, []);

  const fetchMissingEmails = useCallback(async (emails) => {
    const missing = emails
      .map(normalize)
      .filter(e => e && !(e in globalCache) && !pendingFetches.has(e));

    if (missing.length === 0) return;

    missing.forEach(e => {
      globalCache[e] = "Loading...";
      pendingFetches.add(e);
    });
    bump();

    await Promise.all(missing.map(async (email) => {
      const results = await base44.entities.Player.filter({ email }, "-created_date", 1).catch(() => []);
      if (results.length > 0) {
        const p = results[0];
        globalCache[normalize(p.email)] = `${p.first_name || ""} ${p.last_name || ""}`.trim() || email;
      } else {
        globalCache[email] = email;
      }
      pendingFetches.delete(email);
    }));

    bump();
  }, []);

  const getPlayerName = useCallback((email) => {
    return globalCache[normalize(email)] || email;
  }, []);

  return { seedFromPlayers, fetchMissingEmails, getPlayerName, normalize };
}