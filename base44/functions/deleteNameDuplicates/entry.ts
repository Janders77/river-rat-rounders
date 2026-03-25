import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false;

    // Fetch all players
    let allPlayers = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Player.list('player_number', 500, skip);
      allPlayers = allPlayers.concat(batch);
      if (batch.length < 500) break;
      skip += 500;
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`Total players: ${allPlayers.length}`);

    // Group by normalized full name
    const nameGroups = {};
    allPlayers.forEach(p => {
      const key = `${(p.first_name || '').toLowerCase().trim()} ${(p.last_name || '').toLowerCase().trim()}`;
      if (!nameGroups[key]) nameGroups[key] = [];
      nameGroups[key].push(p);
    });

    // Collect duplicates to delete (keep lowest player_number or oldest created_date)
    const toDelete = [];
    const duplicateNames = [];
    for (const name in nameGroups) {
      const group = nameGroups[name];
      if (group.length <= 1) continue;
      // Sort: prefer record with password, then lowest player_number, then oldest created_date
      group.sort((a, b) => {
        if (a.password && !b.password) return -1;
        if (!a.password && b.password) return 1;
        if (a.player_number && b.player_number) return a.player_number - b.player_number;
        return new Date(a.created_date) - new Date(b.created_date);
      });
      duplicateNames.push({ name, count: group.length, kept: `#${group[0].player_number}` });
      for (let i = 1; i < group.length; i++) toDelete.push(group[i].id);
    }

    console.log(`Duplicate names found: ${duplicateNames.length}, records to delete: ${toDelete.length}`);

    if (dryRun) {
      return Response.json({
        dry_run: true,
        totalPlayers: allPlayers.length,
        duplicateNamesFound: duplicateNames.length,
        recordsToDelete: toDelete.length,
        examples: duplicateNames.slice(0, 20),
        message: `Would delete ${toDelete.length} duplicate records. Call with {"dry_run": false} to actually delete.`
      });
    }

    let deletedCount = 0;
    let failedCount = 0;
    for (let i = 0; i < toDelete.length; i++) {
      try {
        await base44.asServiceRole.entities.Player.delete(toDelete[i]);
        deletedCount++;
      } catch (e) {
        failedCount++;
        console.log(`Failed: ${toDelete[i]}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 800));
    }

    return Response.json({
      success: true,
      totalPlayers: allPlayers.length,
      duplicateNamesFound: duplicateNames.length,
      deletedCount,
      failedCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});