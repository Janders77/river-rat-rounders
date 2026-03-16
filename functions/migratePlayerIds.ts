/**
 * Migration: backfills player_id on GameSession, Game, and QuarterlyStats.
 * Accepts optional `entity` param to migrate one entity at a time.
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const entity = body.entity || 'all'; // 'sessions' | 'games' | 'stats' | 'all'

    const allPlayers = await base44.asServiceRole.entities.Player.list('-created_date', 500);

    const findByEmail = (email) => {
      if (!email) return null;
      return allPlayers.find(p => p.email?.trim().toLowerCase() === email.trim().toLowerCase()) || null;
    };

    let migrated = 0;

    if (entity === 'sessions' || entity === 'all') {
      const sessions = await base44.asServiceRole.entities.GameSession.list('-session_date', 200);
      for (const session of sessions) {
        const updates = {};
        // Always re-derive from email array to handle partial migrations
        if (session.signed_in_players?.length) {
          const ids = session.signed_in_players.map(e => findByEmail(e)?.id).filter(Boolean);
          if (ids.length) updates.signed_in_player_ids = ids;
        }
        if (session.hand_of_week_emails?.length) {
          const ids = session.hand_of_week_emails.map(e => findByEmail(e)?.id).filter(Boolean);
          if (ids.length) updates.hand_of_week_player_ids = ids;
        }
        if (Object.keys(updates).length) {
          await base44.asServiceRole.entities.GameSession.update(session.id, updates);
          migrated++;
        }
      }
    }

    if (entity === 'games' || entity === 'all') {
      const games = await base44.asServiceRole.entities.Game.list('-game_date', 500);
      // Build list of records that actually need updates first
      const gameUpdates = [];
      for (const game of games) {
        const updates = {};
        if (!game.winner_player_id && game.winner_email) {
          const p = findByEmail(game.winner_email);
          if (p) updates.winner_player_id = p.id;
        }
        if (!game.player_ids?.length && game.players?.length) {
          const ids = game.players.map(ref => {
            if (typeof ref === 'string' && ref.includes('@')) return findByEmail(ref)?.id;
            return ref;
          }).filter(Boolean);
          if (ids.length) updates.player_ids = ids;
        }
        if (Object.keys(updates).length) gameUpdates.push({ id: game.id, updates });
      }
      // Apply updates in parallel batches of 10
      for (let i = 0; i < gameUpdates.length; i += 10) {
        const batch = gameUpdates.slice(i, i + 10);
        await Promise.all(batch.map(({ id, updates }) =>
          base44.asServiceRole.entities.Game.update(id, updates)
        ));
        migrated += batch.length;
      }
    }

    if (entity === 'stats' || entity === 'all') {
      const stats = await base44.asServiceRole.entities.QuarterlyStats.list('-created_date', 200);
      for (const stat of stats) {
        if (!stat.player_id && stat.player_email) {
          const p = findByEmail(stat.player_email);
          if (p) {
            const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
            await base44.asServiceRole.entities.QuarterlyStats.update(stat.id, {
              player_id: p.id,
              player_name: name || stat.player_name
            });
            migrated++;
          }
        }
      }
    }

    return Response.json({ success: true, entity, migrated });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});