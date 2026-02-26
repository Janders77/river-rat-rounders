import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const today = new Date().toISOString().split('T')[0];
        const dayOfWeek = new Date(today + 'T12:00:00Z').getDay(); // 0=Sun, 3=Wed

        let location;
        if (dayOfWeek === 0) {
            location = "Tavern 018 Sunday";
        } else if (dayOfWeek === 3) {
            location = "Tavern 018 Wednesday";
        } else {
            location = "East End Grill";
        }

        // Check if a session already exists for today at this location
        const existing = await base44.asServiceRole.entities.GameSession.filter({
            session_date: today,
            location: location
        });

        if (existing.length > 0) {
            return Response.json({ message: `Session already exists for ${today} at ${location}` });
        }

        // Create the session
        await base44.asServiceRole.entities.GameSession.create({
            session_date: today,
            location: location,
            game_type: "Main Game",
            is_open: true,
            signed_in_players: []
        });

        return Response.json({ message: `Session created for ${today} at ${location}` });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});