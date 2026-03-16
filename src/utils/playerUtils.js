// Primary player resolution helpers — all relationships use player.id, never email

// Build O(1) lookup map from player id → player
export const buildPlayersById = (players) => {
  const map = {};
  for (const p of players) { if (p.id) map[p.id] = p; }
  return map;
};

export const getPlayerById = (players, id) =>
  id ? players.find(p => p.id === id) || null : null;

// Build a multi-field searchable text string for a player.
// Covers full_name, first+last, search_name — works even if some fields are blank/stale.
export const buildPlayerSearchText = (player) => {
  if (!player) return '';
  const first = (player.first_name || '').trim().toLowerCase();
  const last = (player.last_name || '').trim().toLowerCase();
  const full = (player.full_name || '').trim().toLowerCase();
  const search = (player.search_name || '').trim().toLowerCase();
  // Deduplicate into one long string so a single includes() covers everything
  const parts = new Set([full, `${first} ${last}`.trim(), first, last, search].filter(Boolean));
  return Array.from(parts).join(' ');
};

// Returns true if the player matches the given query string.
export const playerMatchesQuery = (player, query) => {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return buildPlayerSearchText(player).includes(q);
};

export const getPlayerByEmail = (players, email) =>
  email ? players.find(p => p.email?.trim().toLowerCase() === email.trim().toLowerCase()) || null : null;

// Fast name lookup using pre-built map
export const getPlayerNameById = (playerId, playersById) =>
  playersById?.[playerId]
    ? `${playersById[playerId].first_name || ""} ${playersById[playerId].last_name || ""}`.trim() || "Unknown Player"
    : "Unknown Player";

export const getPlayerDisplayName = (player) => {
  if (!player) return "Unknown Player";
  return `${player.first_name || ""} ${player.last_name || ""}`.trim() || "Unknown Player";
};

// Resolve a player name from ID first, then fall back to email lookup
export const resolvePlayerName = (players, id, fallbackEmail) => {
  if (id) {
    const p = getPlayerById(players, id);
    if (p) return getPlayerDisplayName(p);
  }
  if (fallbackEmail) {
    const p = getPlayerByEmail(players, fallbackEmail);
    if (p) return getPlayerDisplayName(p);
  }
  return "Unknown Player";
};

// Returns array of player IDs representing signed-in players.
// Prefers new signed_in_player_ids; falls back to resolving old email array.
export const getEffectiveSignedInIds = (session, players) => {
  if (session.signed_in_player_ids?.length > 0) return session.signed_in_player_ids;
  return (session.signed_in_players || [])
    .map(email => getPlayerByEmail(players, email)?.id)
    .filter(Boolean);
};

// Returns array of player IDs for hand of the week.
// Prefers new hand_of_week_player_ids; falls back to resolving old email array.
export const getEffectiveHandOfWeekIds = (session, players) => {
  if (session.hand_of_week_player_ids?.length > 0) return session.hand_of_week_player_ids;
  return (session.hand_of_week_emails || [])
    .map(email => getPlayerByEmail(players, email)?.id)
    .filter(Boolean);
};

// Returns effective player IDs for a game record.
// Prefers player_ids; falls back to resolving players (email array).
export const getEffectivePlayerIds = (game, players) => {
  if (game.player_ids?.length > 0) return game.player_ids;
  return (game.players || [])
    .map(email => getPlayerByEmail(players, email)?.id)
    .filter(Boolean);
};