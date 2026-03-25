import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { quarter } = await req.json();

    const stats = await base44.asServiceRole.entities.QuarterlyStats.filter({ quarter });

    if (stats.length === 0) {
      return Response.json({ error: 'No stats found for this quarter' }, { status: 400 });
    }

    const allPlayers = await base44.asServiceRole.entities.Player.list();

    // Resolve a player record from a stat entry (player_id first, then email fallback)
    const resolvePlayer = (stat) => {
      if (stat.player_id) {
        const p = allPlayers.find(pl => pl.id === stat.player_id);
        if (p) return p;
      }
      if (stat.player_email) {
        return allPlayers.find(pl => pl.email?.trim().toLowerCase() === stat.player_email?.trim().toLowerCase()) || null;
      }
      return null;
    };

    const getDisplayName = (player, fallbackEmail) => {
      if (!player) return fallbackEmail || 'Unknown';
      return `${player.first_name || ''} ${player.last_name || ''}`.trim() || fallbackEmail || 'Unknown';
    };

    const mostPointsStat = stats.reduce((prev, cur) => (prev.points || 0) > (cur.points || 0) ? prev : cur);
    const mostWinsStat = stats.reduce((prev, cur) => (prev.wins || 0) > (cur.wins || 0) ? prev : cur);

    const mostPointsPlayer = resolvePlayer(mostPointsStat);
    const mostWinsPlayer = resolvePlayer(mostWinsStat);

    const mostPointsName = getDisplayName(mostPointsPlayer, mostPointsStat.player_email);
    const mostWinsName = getDisplayName(mostWinsPlayer, mostWinsStat.player_email);

    const recordData = {
      most_points_player_id: mostPointsPlayer?.id || null,
      most_points_player_email: mostPointsPlayer?.email || mostPointsStat.player_email,
      most_points_player_name: mostPointsName,
      most_points_total: mostPointsStat.points,
      most_wins_player_id: mostWinsPlayer?.id || null,
      most_wins_player_email: mostWinsPlayer?.email || mostWinsStat.player_email,
      most_wins_player_name: mostWinsName,
      most_wins_total: mostWinsStat.wins,
      completed: true
    };

    const existingRecord = await base44.asServiceRole.entities.QuarterlyRecord.filter({ quarter });

    if (existingRecord.length > 0) {
      await base44.asServiceRole.entities.QuarterlyRecord.update(existingRecord[0].id, recordData);
    } else {
      await base44.asServiceRole.entities.QuarterlyRecord.create({ quarter, ...recordData });
    }

    return Response.json({ success: true, quarter, mostPointsName, mostWinsName });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});