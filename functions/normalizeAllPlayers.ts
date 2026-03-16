import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // Fetch all players in batches
  let allPlayers = [];
  let skip = 0;
  const batchSize = 200;
  while (true) {
    const batch = await base44.asServiceRole.entities.Player.list('-created_date', batchSize, skip);
    if (!batch || batch.length === 0) break;
    allPlayers = allPlayers.concat(batch);
    if (batch.length < batchSize) break;
    skip += batchSize;
  }

  let updated = 0;
  let skipped = 0;
  let failed = [];

  for (const player of allPlayers) {
    const firstName = (player.first_name || '').trim();
    const lastName = (player.last_name || '').trim();
    const email = (player.email || '').trim().toLowerCase();
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const searchName = fullName.toLowerCase();

    const needsUpdate =
      player.first_name !== firstName ||
      player.last_name !== lastName ||
      player.email !== email ||
      player.full_name !== fullName ||
      player.search_name !== searchName;

    if (!needsUpdate) { skipped++; continue; }

    // Only update if we have something to work with
    if (!firstName && !lastName && !email) { skipped++; continue; }

    try {
      await base44.asServiceRole.entities.Player.update(player.id, {
        first_name: firstName,
        last_name: lastName,
        email,
        full_name: fullName,
        search_name: searchName,
      });
      updated++;
    } catch (err) {
      failed.push({ id: player.id, email: player.email, error: err.message });
    }
  }

  return Response.json({
    total: allPlayers.length,
    updated,
    skipped,
    failed_count: failed.length,
    failed,
  });
});