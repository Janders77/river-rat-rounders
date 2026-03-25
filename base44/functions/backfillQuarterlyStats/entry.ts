import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const POINTS = [1000, 750, 600, 500, 400, 300, 200, 100, 50];

function getQuarter(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // Step 1: Fetch all Game records (paginate to get all)
  let allGames = [];
  let skip = 0;
  const pageSize = 100;
  while (true) {
    const page = await base44.asServiceRole.entities.Game.list('-game_date', pageSize, skip);
    allGames = allGames.concat(page);
    if (page.length < pageSize) break;
    skip += pageSize;
  }

  // Step 2: Fetch all Player records for name resolution
  let allPlayers = [];
  skip = 0;
  while (true) {
    const page = await base44.asServiceRole.entities.Player.list(null, pageSize, skip);
    allPlayers = allPlayers.concat(page);
    if (page.length < pageSize) break;
    skip += pageSize;
  }
  const playersById = {};
  for (const p of allPlayers) playersById[p.id] = p;

  const getPlayerName = (pid) => {
    const p = playersById[pid];
    if (!p) return '';
    return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || '';
  };

  // Step 3: Aggregate points per (quarter, player_id)
  const statsMap = {}; // key: `${quarter}::${player_id}`

  let gamesProcessed = 0;
  for (const game of allGames) {
    if (!game.game_date) continue;
    const quarter = getQuarter(game.game_date);
    const placementIds = game.player_ids || [];

    for (let i = 0; i < placementIds.length; i++) {
      const pid = placementIds[i];
      if (!pid) continue;
      const pts = POINTS[i] || 0;
      const isWin = i === 0;
      const key = `${quarter}::${pid}`;
      if (!statsMap[key]) {
        statsMap[key] = {
          quarter,
          player_id: pid,
          player_email: playersById[pid]?.email || '',
          player_name: getPlayerName(pid),
          points: 0,
          wins: 0,
        };
      }
      statsMap[key].points += pts;
      if (isWin) statsMap[key].wins += 1;
    }

    // Fallback: if no player_ids but winner_player_id exists, at least credit the winner
    if (placementIds.length === 0 && game.winner_player_id) {
      const pid = game.winner_player_id;
      const pts = game.points_awarded || POINTS[0];
      const quarter2 = quarter;
      const key = `${quarter2}::${pid}`;
      if (!statsMap[key]) {
        statsMap[key] = {
          quarter: quarter2,
          player_id: pid,
          player_email: playersById[pid]?.email || '',
          player_name: getPlayerName(pid),
          points: 0,
          wins: 0,
        };
      }
      statsMap[key].points += pts;
      statsMap[key].wins += 1;
    }

    gamesProcessed++;
  }

  // Step 4: Delete all existing QuarterlyStats (clean rebuild = no double-counting)
  const existingStats = await base44.asServiceRole.entities.QuarterlyStats.list(null, 500);
  for (const stat of existingStats) {
    await base44.asServiceRole.entities.QuarterlyStats.delete(stat.id);
  }

  // Step 5: Create fresh QuarterlyStats records
  const newStats = Object.values(statsMap);
  for (const stat of newStats) {
    await base44.asServiceRole.entities.QuarterlyStats.create(stat);
  }

  return Response.json({
    success: true,
    games_processed: gamesProcessed,
    quarterly_stats_created: newStats.length,
    quarters: [...new Set(newStats.map(s => s.quarter))].sort(),
  });
});