import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BREAK_DURATION_MINUTES = 15;
const AUTO_BREAK_AFTER_MINUTES = 60;
const RESUME_LEVEL_AFTER_BREAK = 5;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sessions = await base44.asServiceRole.entities.GameSession.filter({ is_open: true, is_clock_running: true });
    const now = new Date();
    const updates = [];

    for (const session of sessions) {
      const update = {};

      // --- Auto break: 1 hour after scheduled_start_time ---
      if (
        !session.has_taken_break &&
        !session.is_break_active &&
        session.scheduled_start_time
      ) {
        const scheduledStart = new Date(session.scheduled_start_time);
        const minutesSinceStart = (now - scheduledStart) / 1000 / 60;
        if (minutesSinceStart >= AUTO_BREAK_AFTER_MINUTES) {
          update.is_break_active = true;
          update.break_start_timestamp = now.toISOString();
          update.has_taken_break = true;
          await base44.asServiceRole.entities.GameSession.update(session.id, update);
          updates.push({ id: session.id, action: 'break_started' });
          continue;
        }
      }

      // --- End break after 15 minutes ---
      if (session.is_break_active && session.break_start_timestamp) {
        const breakStart = new Date(session.break_start_timestamp);
        const breakElapsed = (now - breakStart) / 1000 / 60;
        if (breakElapsed >= BREAK_DURATION_MINUTES) {
          update.is_break_active = false;
          update.break_start_timestamp = null;
          update.current_level = RESUME_LEVEL_AFTER_BREAK;
          update.current_level_start_timestamp = now.toISOString();
          await base44.asServiceRole.entities.GameSession.update(session.id, update);
          updates.push({ id: session.id, action: 'break_ended_resumed_level_5' });
        }
        continue;
      }

      // --- Normal level progression ---
      if (!session.is_break_active && session.current_level_start_timestamp) {
        const levelStart = new Date(session.current_level_start_timestamp);
        const levelDuration = session.level_duration_minutes || 15;
        const levelElapsed = (now - levelStart) / 1000 / 60;
        if (levelElapsed >= levelDuration) {
          const totalLevels = session.total_levels || 10;
          const nextLevel = (session.current_level || 1) + 1;
          if (nextLevel > totalLevels) {
            // Game over — stop the clock
            update.is_clock_running = false;
            await base44.asServiceRole.entities.GameSession.update(session.id, update);
            updates.push({ id: session.id, action: 'game_over' });
          } else {
            update.current_level = nextLevel;
            update.current_level_start_timestamp = now.toISOString();
            await base44.asServiceRole.entities.GameSession.update(session.id, update);
            updates.push({ id: session.id, action: `advanced_to_level_${nextLevel}` });
          }
        }
      }
    }

    return Response.json({ processed: sessions.length, updates });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});