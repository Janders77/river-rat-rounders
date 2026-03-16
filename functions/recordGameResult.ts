import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    const role = (user as any).role;
    if (role !== 'admin' && role !== 'director') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const result_id = body?.result_id ? String(body.result_id) : '';
    const winner_email = body?.winner_email ? String(body.winner_email) : '';
    const winner_name = body?.winner_name ? String(body.winner_name) : '';
    const points_awarded = typeof body?.points_awarded === 'number' ? body.points_awarded : 1;

    if (!result_id) {
      return Response.json({ error: 'result_id is required' }, { status: 400 });
    }
    if (!winner_email) {
      return Response.json({ error: 'winner_email is required' }, { status: 400 });
    }

    const currentQuarter = getCurrentQuarter();

    const existingResult = await base44.entities.Game.filter({ result_id });
    if (existingResult.length > 0) {
      return Response.json({ success: true, quarter: currentQuarter, already_recorded: true });
    }

    const winnerRecords = await base44.entities.Player.filter({ email: winner_email });
    if (!winnerRecords?.length) {
      return Response.json({ error: 'Player does not exist for winner_email' }, { status: 400 });
    }
    const winnerPlayer = winnerRecords[0];
    const resolvedName = `${winnerPlayer.first_name || ''} ${winnerPlayer.last_name || ''}`.trim() || winner_email;

    await base44.entities.Game.create({
      result_id,
      quarter: currentQuarter,
      winner_email,
      winner_name: resolvedName,
      points_awarded,
      recorded_by: (user as any).email ?? (user as any).id ?? 'unknown',
    });

    const stats = await base44.entities.QuarterlyStats.filter({
      quarter: currentQuarter,
      player_email: winner_email,
    });

    if (stats.length > 0) {
      await base44.entities.QuarterlyStats.update(stats[0].id, {
        player_name: resolvedName,
        points: (stats[0].points || 0) + points_awarded,
        wins: (stats[0].wins || 0) + 1,
      });
    } else {
      await base44.entities.QuarterlyStats.create({
        quarter: currentQuarter,
        player_email: winner_email,
        player_name: resolvedName,
        points: points_awarded,
        wins: 1,
      });
    }

    return Response.json({ success: true, quarter: currentQuarter, already_recorded: false });
  } catch (error) {
    console.error(error);
    const message = (error as any)?.message || 'Internal Server Error';
    return Response.json({ error: message }, { status: 500 });
  }
});