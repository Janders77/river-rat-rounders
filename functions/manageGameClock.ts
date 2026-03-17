import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sessions = await base44.asServiceRole.entities.GameSession.filter({ is_open: true }, null, 20);
    const now = Date.now();
    const updates = [];

    for (const session of sessions) {
      if (!session.clock_is_running) continue;

      // End break after 15 minutes
      if (session.is_break_active) {
        const breakStart = new Date(session.current_level_start_timestamp).getTime();
        if (now - breakStart >= 15 * 60 * 1000) {
          const levelDefs = session.level_definitions || [];
          const targetIndex = Math.min(4, levelDefs.length - 1); // level 5 = index 4
          await base44.asServiceRole.entities.GameSession.update(session.id, {
            is_break_active: false,
            current_level_index: targetIndex,
            current_level_start_timestamp: new Date().toISOString()
          });
          updates.push({ id: session.id, action: 'break_ended', level_index: targetIndex });
        }
        continue;
      }

      // Start break at 1-hour mark from scheduled_start_time
      if (!session.has_taken_break && session.scheduled_start_time) {
        const startTime = new Date(session.scheduled_start_time).getTime();
        if (now - startTime >= 60 * 60 * 1000) {
          await base44.asServiceRole.entities.GameSession.update(session.id, {
            is_break_active: true,
            has_taken_break: true,
            current_level_start_timestamp: new Date().toISOString()
          });
          updates.push({ id: session.id, action: 'break_started' });
          continue;
        }
      }

      // Advance level when duration expires
      const levelDefs = session.level_definitions || [];
      const currentIndex = session.current_level_index || 0;
      const currentDef = levelDefs[currentIndex];
      const durationMs = (currentDef?.duration_minutes || 15) * 60 * 1000;
      const levelStart = new Date(session.current_level_start_timestamp).getTime();

      if (now - levelStart >= durationMs) {
        const nextIndex = currentIndex + 1;
        if (nextIndex < levelDefs.length) {
          await base44.asServiceRole.entities.GameSession.update(session.id, {
            current_level_index: nextIndex,
            current_level_start_timestamp: new Date().toISOString()
          });
          updates.push({ id: session.id, action: 'level_advanced', level_index: nextIndex });
        } else {
          // All levels complete — stop the clock
          await base44.asServiceRole.entities.GameSession.update(session.id, {
            clock_is_running: false
          });
          updates.push({ id: session.id, action: 'clock_finished' });
        }
      }
    }

    return Response.json({ processed: sessions.length, updates });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});