import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // default to dry_run = true for safety

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

    // Group by player_number - keep record with password or oldest
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

    // Group by email - keep record with password or oldest
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

    const idsToDelete = [...toDelete];
    console.log(`Duplicates found: ${idsToDelete.length}, dry_run: ${dryRun}`);

    if (dryRun) {
      return Response.json({
        dry_run: true,
        totalFetched: allPlayers.length,
        duplicatesFound: idsToDelete.length,
        message: `Would delete ${idsToDelete.length} duplicate records. Call with {"dry_run": false} to actually delete.`
      });
    }

    // Delete slowly - 1 per second to avoid rate limits
    let deletedCount = 0;
    let failedCount = 0;
    for (let i = 0; i < idsToDelete.length; i++) {
      try {
        await base44.asServiceRole.entities.Player.delete(idsToDelete[i]);
        deletedCount++;
        console.log(`Deleted ${deletedCount}/${idsToDelete.length}`);
      } catch (e) {
        failedCount++;
        console.log(`Failed to delete ${idsToDelete[i]}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 1000)); // 1 second between each delete
    }

    return Response.json({
      success: true,
      totalFetched: allPlayers.length,
      duplicatesFound: idsToDelete.length,
      deletedCount,
      failedCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});