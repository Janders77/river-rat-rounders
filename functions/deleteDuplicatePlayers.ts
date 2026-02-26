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

    // Find duplicates first
    const duplicateEmails = [];
    for (const email in emailGroups) {
      if (emailGroups[email].length > 1) {
        duplicateEmails.push(email);
      }
    }

    // Delete in small batches
    let deletedCount = 0;
    const batchSize = 10;

    for (let b = 0; b < duplicateEmails.length; b += batchSize) {
      const batch = duplicateEmails.slice(b, b + batchSize);
      
      for (const email of batch) {
        const players = emailGroups[email];
        players.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

        for (let i = 1; i < players.length; i++) {
          try {
            await base44.asServiceRole.entities.Player.delete(players[i].id);
            deletedCount++;
          } catch (e) {
            console.log(`Could not delete ${players[i].id}: ${e.message}`);
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
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