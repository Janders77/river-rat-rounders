import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all players
    const allPlayers = await base44.asServiceRole.entities.Player.list('created_date', 10000);

    // Group players by email
    const emailGroups = {};
    allPlayers.forEach(player => {
      if (!emailGroups[player.email]) {
        emailGroups[player.email] = [];
      }
      emailGroups[player.email].push(player);
    });

    // Find and delete duplicates
    let deletedCount = 0;
    const duplicates = [];

    for (const email in emailGroups) {
      const players = emailGroups[email];
      if (players.length > 1) {
        // Sort by created_date, keep the first one, delete the rest
        players.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        duplicates.push({
          email,
          kept: players[0].id,
          deleted: players.slice(1).map(p => p.id)
        });

        for (let i = 1; i < players.length; i++) {
          await base44.asServiceRole.entities.Player.delete(players[i].id);
          deletedCount++;
        }
      }
    }

    return Response.json({
      success: true,
      deletedCount,
      duplicateGroups: duplicates.length,
      details: duplicates
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});