import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false;
    const limit = body.limit || 100; // delete at most this many per run

    // Fetch all players in batches
    let allPlayers = [];
    let skip = 0;
    const fetchBatch = 500;
    while (true) {
      const batch = await base44.asServiceRole.entities.Player.list('created_date', fetchBatch, skip);
      allPlayers = allPlayers.concat(batch);
      if (batch.length < fetchBatch) break;
      skip += fetchBatch;
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`Total players fetched: ${allPlayers.length}`);

    const toDelete = new Set();

    // Group by player_number
    const numberGroups = {};
    allPlayers.forEach(p => {
      if (p.player_number == null) return;
      if (!numberGroups[p.player_number]) numberGroups[p.player_number] = [];
      numberGroups[p.player_number].push(p);
    });

    for (const key in numberGroups) {
      const group = numberGroups[key];
      if (group.length <= 1) continue;
      group.sort((a, b) => {
        if (a.password && !b.password) return -1;
        if (!a.password && b.password) return 1;
        return new Date(a.created_date) - new Date(b.created_date);
      });
      for (let i = 1; i < group.length; i++) toDelete.add(group[i].id);
    }

    // Group by email
    const emailGroups = {};
    allPlayers.forEach(p => {
      const email = (p.email || '').toLowerCase().trim();
      if (!email) return;
      if (!emailGroups[email]) emailGroups[email] = [];
      emailGroups[email].push(p);
    });

    for (const email in emailGroups) {
      const group = emailGroups[email];
      if (group.length <= 1) continue;
      group.sort((a, b) => {
        if (a.password && !b.password) return -1;
        if (!a.password && b.password) return 1;
        return new Date(a.created_date) - new Date(b.created_date);
      });
      for (let i = 1; i < group.length; i++) toDelete.add(group[i].id);
    }

    const allIds = [...toDelete];
    const idsToDelete = allIds.slice(0, limit);
    console.log(`Total duplicates: ${allIds.length}, deleting this run: ${idsToDelete.length}, dry_run: ${dryRun}`);

    if (dryRun) {
      return Response.json({
        dry_run: true,
        totalFetched: allPlayers.length,
        duplicatesFound: allIds.length,
        message: `Would delete ${allIds.length} duplicate records. Call with {"dry_run": false, "limit": 100} to delete in batches.`
      });
    }

    let deletedCount = 0;
    let failedCount = 0;
    for (let i = 0; i < idsToDelete.length; i++) {
      try {
        await base44.asServiceRole.entities.Player.delete(idsToDelete[i]);
        deletedCount++;
      } catch (e) {
        failedCount++;
        console.log(`Failed: ${idsToDelete[i]}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 800));
    }

    return Response.json({
      success: true,
      totalFetched: allPlayers.length,
      totalDuplicates: allIds.length,
      deletedThisRun: deletedCount,
      failedThisRun: failedCount,
      remaining: allIds.length - deletedCount,
      message: allIds.length - deletedCount > 0
        ? `Run again to delete more. ${allIds.length - deletedCount} duplicates remaining.`
        : 'All duplicates deleted!'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});