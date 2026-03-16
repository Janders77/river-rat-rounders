import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const skip = body.skip || 0;
  const batchSize = body.batch_size || 50; // process 50 at a time to avoid timeouts

  // Fetch one batch of players
  const players = await base44.asServiceRole.entities.Player.list('-created_date', batchSize, skip);

  if (!players || players.length === 0) {
    return Response.json({ done: true, skip, updated: 0, skipped: 0, failed: [] });
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  let updated = 0;
  let skipped = 0;
  const failed = [];

  // Process one at a time with delay to respect rate limits
  for (const player of players) {
    const firstName = (player.first_name || '').trim();
    const lastName = (player.last_name || '').trim();
    const email = (player.email || '').trim().toLowerCase();
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const searchName = fullName.toLowerCase();

    if (!firstName && !lastName && !email) { skipped++; continue; }

    const needsUpdate =
      player.first_name !== firstName ||
      player.last_name !== lastName ||
      player.email !== email ||
      player.full_name !== fullName ||
      player.search_name !== searchName;

    if (!needsUpdate) { skipped++; continue; }

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

    await sleep(350); // ~3 writes/sec — stays safely under rate limit
  }

  return Response.json({
    done: players.length < batchSize,
    next_skip: skip + players.length,
    batch_fetched: players.length,
    updated,
    skipped,
    failed_count: failed.length,
    failed,
  });
});