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

    const { winner_email, winner_name, points_awarded } = await req.json();
    const currentQuarter = getCurrentQuarter();

    // Update or create quarterly stats for the winner
    const existingStats = await base44.entities.QuarterlyStats.filter({
      quarter: currentQuarter,
      player_email: winner_email
    });

    if (existingStats.length > 0) {
      await base44.entities.QuarterlyStats.update(existingStats[0].id, {
        points: (existingStats[0].points || 0) + (points_awarded || 1),
        wins: (existingStats[0].wins || 0) + 1
      });
    } else {
      await base44.entities.QuarterlyStats.create({
        quarter: currentQuarter,
        player_email: winner_email,
        player_name: winner_name,
        points: points_awarded || 1,
        wins: 1
      });
    }

    return Response.json({ success: true, quarter: currentQuarter });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});