import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all players in batches
    let allPlayers = [];
    let skip = 0;
    const batchSize = 500;
    while (true) {
      const batch = await base44.asServiceRole.entities.Player.list('created_date', batchSize, skip);
      allPlayers = allPlayers.concat(batch);
      if (batch.length < batchSize) break;
      skip += batchSize;
    }

    console.log(`Total players fetched: ${allPlayers.length}`);

    // Group players by player_number (primary key for duplicates)
    const numberGroups = {};
    allPlayers.forEach(player => {
      const key = player.player_number;
      if (key == null) return;
      if (!numberGroups[key]) numberGroups[key] = [];
      numberGroups[key].push(player);
    });

    // Also group by email for email-based duplicates
    const emailGroups = {};
    allPlayers.forEach(player => {
      const email = (player.email || '').toLowerCase().trim();
      if (!email) return;
      if (!emailGroups[email]) emailGroups[email] = [];
      emailGroups[email].push(player);
    });

    const toDelete = new Set();

    // Find duplicate player_numbers - keep the one with a password or the oldest
    for (const key in numberGroups) {
      const group = numberGroups[key];
      if (group.length <= 1) continue;
      // Keep: prefer record with password, then oldest created_date
      group.sort((a, b) => {
        if (a.password && !b.password) return -1;
        if (!a.password && b.password) return 1;
        return new Date(a.created_date) - new Date(b.created_date);
      });
      for (let i = 1; i < group.length; i++) {
        toDelete.add(group[i].id);
      }
    }

    // Find duplicate emails - keep the one with a password or the oldest
    for (const email in emailGroups) {
      const group = emailGroups[email];
      if (group.length <= 1) continue;
      group.sort((a, b) => {
        if (a.password && !b.password) return -1;
        if (!a.password && b.password) return 1;
        return new Date(a.created_date) - new Date(b.created_date);
      });
      for (let i = 1; i < group.length; i++) {
        toDelete.add(group[i].id);
      }
    }

    console.log(`Records to delete: ${toDelete.size}`);

    // Delete in small batches
    const idsToDelete = [...toDelete];
    let deletedCount = 0;
    for (let i = 0; i < idsToDelete.length; i++) {
      try {
        await base44.asServiceRole.entities.Player.delete(idsToDelete[i]);
        deletedCount++;
      } catch (e) {
        console.log(`Could not delete ${idsToDelete[i]}: ${e.message}`);
      }
      // Small pause every 50 deletes
      if (i % 50 === 49) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    return Response.json({
      success: true,
      totalFetched: allPlayers.length,
      deletedCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});