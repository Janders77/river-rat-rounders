// Primary player resolution helpers — all relationships use player.id, never email

export const getPlayerById = (players, id) =>
  id ? players.find(p => p.id === id) || null : null;

export const getPlayerByEmail = (players, email) =>
  email ? players.find(p => p.email?.trim().toLowerCase() === email.trim().toLowerCase()) || null : null;

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