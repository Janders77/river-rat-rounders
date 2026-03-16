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

    const parts = query.split(/\s+/);
    const hasSpace = parts.length >= 2;

    let queries;
    if (hasSpace) {
      const first = parts[0];
      const rest = parts.slice(1).join(' ');
      // Support "First Last" and "Last First" orderings
      queries = [
        base44.asServiceRole.entities.Player.filter(
          { first_name: { $regex: first, $options: 'i' }, last_name: { $regex: rest, $options: 'i' } }, null, 20
        ).catch(() => []),
        base44.asServiceRole.entities.Player.filter(
          { first_name: { $regex: rest, $options: 'i' }, last_name: { $regex: first, $options: 'i' } }, null, 20
        ).catch(() => []),
      ];
    } else {
      // Single-term: match against first_name OR last_name
      queries = [
        base44.asServiceRole.entities.Player.filter(
          { first_name: { $regex: query, $options: 'i' } }, null, 20
        ).catch(() => []),
        base44.asServiceRole.entities.Player.filter(
          { last_name: { $regex: query, $options: 'i' } }, null, 20
        ).catch(() => []),
      ];
    }

    const results = await Promise.all(queries);

    // Deduplicate, build display_name at runtime, sort alphabetically
    const seen = new Set();
    const players = [];
    for (const p of results.flat()) {
      if (!seen.has(p.id)) {
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

    players.sort((a, b) => a.display_name.localeCompare(b.display_name));

    return Response.json({ players: players.slice(0, 20) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});