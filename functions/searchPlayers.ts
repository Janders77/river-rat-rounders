import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const query = (body.query || '').trim();

    if (query.length < 2) {
      return Response.json({ players: [] });
    }

    // Search by first_name, last_name, and search_name (normalized lowercase) using regex
    const [byFirst, byLast, bySearchName] = await Promise.all([
      base44.asServiceRole.entities.Player.filter(
        { first_name: { $regex: query, $options: 'i' } }, null, 15
      ).catch(() => []),
      base44.asServiceRole.entities.Player.filter(
        { last_name: { $regex: query, $options: 'i' } }, null, 15
      ).catch(() => []),
      base44.asServiceRole.entities.Player.filter(
        { search_name: { $regex: query.toLowerCase() } }, null, 15
      ).catch(() => []),
    ]);

    // Deduplicate and return top 20
    const seen = new Set();
    const players = [];
    for (const p of [...byFirst, ...byLast, ...bySearchName]) {
      if (!seen.has(p.id) && players.length < 20) {
        seen.add(p.id);
        players.push({
          id: p.id,
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          display_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown Player',
          email: p.email || '',
        });
      }
    }

    // Sort alphabetically by display name
    players.sort((a, b) => a.display_name.localeCompare(b.display_name));

    return Response.json({ players });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});