import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all players in batches
    let allPlayers = [];
    let skip = 0;
    const batchSize = 500;
    while (true) {
      const batch = await base44.asServiceRole.entities.Player.list('player_number', batchSize, skip);
      allPlayers = allPlayers.concat(batch);
      if (batch.length < batchSize) break;
      skip += batchSize;
    }

    console.log(`Cleaning up ${allPlayers.length} players...`);

    let updated = 0;
    for (const player of allPlayers) {
      const first_name = (player.first_name || '').trim();
      const last_name = (player.last_name || '').trim();
      const email = (player.email || '').trim().toLowerCase();
      const full_name = `${first_name} ${last_name}`.trim();
      const search_name = full_name.toLowerCase();

      await base44.asServiceRole.entities.Player.update(player.id, {
        first_name,
        last_name,
        email,
        full_name,
        search_name,
      });
      updated++;
    }

    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});