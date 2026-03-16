/**
 * Migration function: backfills player_id fields on all existing records.
 * - GameSession: signed_in_player_ids from signed_in_players (emails)
 * - GameSession: hand_of_week_player_ids from hand_of_week_emails
 * - Game: winner_player_id from winner_email, player_ids from players (emails)
 * - QuarterlyStats: player_id from player_email
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const allPlayers = await base44.asServiceRole.entities.Player.list('-created_date', 1000);

    const findById = (id) => allPlayers.find(p => p.id === id) || null;
    const findByEmail = (email) => {
      if (!email) return null;
      return allPlayers.find(p => p.email?.trim().toLowerCase() === email.trim().toLowerCase()) || null;
    };

    const results = { sessions: 0, games: 0, stats: 0, errors: [] };

    // --- Migrate GameSessions ---
    const sessions = await base44.asServiceRole.entities.GameSession.list('-session_date', 500);
    for (const session of sessions) {
      const updates = {};

      // signed_in_player_ids
      if ((!session.signed_in_player_ids || session.signed_in_player_ids.length === 0) &&
          session.signed_in_players?.length > 0) {
        const ids = session.signed_in_players
          .map(email => findByEmail(email)?.id)
          .filter(Boolean);
        if (ids.length > 0) updates.signed_in_player_ids = ids;
      }

      // hand_of_week_player_ids
      if ((!session.hand_of_week_player_ids || session.hand_of_week_player_ids.length === 0) &&
          session.hand_of_week_emails?.length > 0) {
        const ids = session.hand_of_week_emails
          .map(email => findByEmail(email)?.id)
          .filter(Boolean);
        if (ids.length > 0) updates.hand_of_week_player_ids = ids;
      }

      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.GameSession.update(session.id, updates);
        results.sessions++;
      }
    }

    // --- Migrate Games ---
    const games = await base44.asServiceRole.entities.Game.list('-game_date', 1000);
    for (const game of games) {
      const updates = {};

      // winner_player_id
      if (!game.winner_player_id && game.winner_email) {
        const p = findByEmail(game.winner_email);
        if (p) updates.winner_player_id = p.id;
      }

      // player_ids
      if ((!game.player_ids || game.player_ids.length === 0) && game.players?.length > 0) {
        // Skip entries that are already IDs (not emails)
        const ids = game.players.map(ref => {
          if (ref.includes('@')) return findByEmail(ref)?.id;
          return findById(ref) ? ref : findByEmail(ref)?.id;
        }).filter(Boolean);
        if (ids.length > 0) updates.player_ids = ids;
      }

      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.Game.update(game.id, updates);
        results.games++;
      }
    }

    // --- Migrate QuarterlyStats ---
    const stats = await base44.asServiceRole.entities.QuarterlyStats.list('-created_date', 1000);
    for (const stat of stats) {
      if (!stat.player_id && stat.player_email) {
        const p = findByEmail(stat.player_email);
        if (p) {
          const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
          await base44.asServiceRole.entities.QuarterlyStats.update(stat.id, {
            player_id: p.id,
            player_name: name || stat.player_name
          });
          results.stats++;
        }
      }
    }

    return Response.json({ success: true, migrated: results });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});