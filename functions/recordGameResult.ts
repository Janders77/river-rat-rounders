import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function getCurrentQuarter() {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const year = now.getFullYear();
  return `${year}-Q${quarter}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user.role;
    if (role !== 'admin' && role !== 'director') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const result_id = body?.result_id ? String(body.result_id) : '';
    // Accept winner_player_id (new) or winner_email (legacy)
    const winner_player_id = body?.winner_player_id ? String(body.winner_player_id) : '';
    const winner_email = body?.winner_email ? String(body.winner_email) : '';
    const points_awarded = typeof body?.points_awarded === 'number' ? body.points_awarded : 1;

    if (!result_id) {
      return Response.json({ error: 'result_id is required' }, { status: 400 });
    }
    if (!winner_player_id && !winner_email) {
      return Response.json({ error: 'winner_player_id or winner_email is required' }, { status: 400 });
    }

    const currentQuarter = getCurrentQuarter();

    const existingResult = await base44.entities.Game.filter({ result_id });
    if (existingResult.length > 0) {
      return Response.json({ success: true, quarter: currentQuarter, already_recorded: true });
    }

    // Resolve the winner player record
    let winnerPlayer = null;
    if (winner_player_id) {
      const records = await base44.entities.Player.filter({ id: winner_player_id });
      winnerPlayer = records?.[0] || null;
    }
    if (!winnerPlayer && winner_email) {
      const records = await base44.entities.Player.filter({ email: winner_email });
      winnerPlayer = records?.[0] || null;
    }

    if (!winnerPlayer) {
      return Response.json({ error: 'Player not found' }, { status: 400 });
    }

    const resolvedName = `${winnerPlayer.first_name || ''} ${winnerPlayer.last_name || ''}`.trim() || winner_email;
    const resolvedId = winnerPlayer.id;
    const resolvedEmail = winnerPlayer.email || winner_email;

    await base44.entities.Game.create({
      result_id,
      quarter: currentQuarter,
      winner_player_id: resolvedId,
      winner_email: resolvedEmail,
      winner_name: resolvedName,
      points_awarded,
      recorded_by: user.email ?? user.id ?? 'unknown',
    });

    // Upsert QuarterlyStats — look up by player_id first, then email
    let stats = await base44.entities.QuarterlyStats.filter({
      quarter: currentQuarter,
      player_id: resolvedId,
    });

    if (!stats?.length) {
      stats = await base44.entities.QuarterlyStats.filter({
        quarter: currentQuarter,
        player_email: resolvedEmail,
      });
    }

    if (stats.length > 0) {
      await base44.entities.QuarterlyStats.update(stats[0].id, {
        player_id: resolvedId,
        player_email: resolvedEmail,
        player_name: resolvedName,
        points: (stats[0].points || 0) + points_awarded,
        wins: (stats[0].wins || 0) + 1,
      });
    } else {
      await base44.entities.QuarterlyStats.create({
        quarter: currentQuarter,
        player_id: resolvedId,
        player_email: resolvedEmail,
        player_name: resolvedName,
        points: points_awarded,
        wins: 1,
      });
    }

    return Response.json({ success: true, quarter: currentQuarter, already_recorded: false });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});