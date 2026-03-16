import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const query = (body.query || '').trim();

    if (query.length < 1) {
      return Response.json({ players: [] });
    }

    const isNumeric = /^\d+$/.test(query);

    let results = [];

    if (isNumeric) {
      // Exact match on player_number (integer field)
      results = await base44.asServiceRole.entities.Player.filter(
        { player_number: parseInt(query, 10) }, null, 5
      ).catch(() => []);
    } else {
      const parts = query.split(/\s+/);
      const hasSpace = parts.length >= 2;

      let queries;
      if (hasSpace) {
        const first = parts[0];
        const rest = parts.slice(1).join(' ');
        queries = [
          base44.asServiceRole.entities.Player.filter(
            { first_name: { $regex: first, $options: 'i' }, last_name: { $regex: rest, $options: 'i' } }, null, 20
          ).catch(() => []),
          base44.asServiceRole.entities.Player.filter(
            { first_name: { $regex: rest, $options: 'i' }, last_name: { $regex: first, $options: 'i' } }, null, 20
          ).catch(() => []),
        ];
      } else {
        queries = [
          base44.asServiceRole.entities.Player.filter(
            { first_name: { $regex: query, $options: 'i' } }, null, 20
          ).catch(() => []),
          base44.asServiceRole.entities.Player.filter(
            { last_name: { $regex: query, $options: 'i' } }, null, 20
          ).catch(() => []),
        ];
      }

      const all = await Promise.all(queries);
      results = all.flat();
    }

    // Deduplicate, build display_name at runtime, sort alphabetically
    const seen = new Set();
    const players = [];
    for (const p of results) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        players.push({
          id: p.id,
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          display_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown Player',
          player_number: p.player_number ?? null,
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