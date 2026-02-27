import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function getQuarterFromString(quarterStr) {
  const [year, q] = quarterStr.split('-Q');
  return { year: parseInt(year), quarter: parseInt(q) };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { quarter } = await req.json();

    // Get all quarterly stats for this quarter
    const stats = await base44.asServiceRole.entities.QuarterlyStats.filter({ quarter });

    if (stats.length === 0) {
      return Response.json({ error: 'No stats found for this quarter' }, { status: 400 });
    }

    // Find the player with most points and most wins
    const mostPointsPlayer = stats.reduce((prev, current) => 
      (prev.points || 0) > (current.points || 0) ? prev : current
    );

    const mostWinsPlayer = stats.reduce((prev, current) => 
      (prev.wins || 0) > (current.wins || 0) ? prev : current
    );

    // Create or update quarterly record
    const existingRecord = await base44.asServiceRole.entities.QuarterlyRecord.filter({ quarter });

    if (existingRecord.length > 0) {
      await base44.asServiceRole.entities.QuarterlyRecord.update(existingRecord[0].id, {
        most_points_player_email: mostPointsPlayer.player_email,
        most_points_player_name: mostPointsPlayer.player_name,
        most_points_total: mostPointsPlayer.points,
        most_wins_player_email: mostWinsPlayer.player_email,
        most_wins_player_name: mostWinsPlayer.player_name,
        most_wins_total: mostWinsPlayer.wins,
        completed: true
      });
    } else {
      await base44.asServiceRole.entities.QuarterlyRecord.create({
        quarter,
        most_points_player_email: mostPointsPlayer.player_email,
        most_points_player_name: mostPointsPlayer.player_name,
        most_points_total: mostPointsPlayer.points,
        most_wins_player_email: mostWinsPlayer.player_email,
        most_wins_player_name: mostWinsPlayer.player_name,
        most_wins_total: mostWinsPlayer.wins,
        completed: true
      });
    }

    return Response.json({ success: true, quarter, winners: { mostPointsPlayer, mostWinsPlayer } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});