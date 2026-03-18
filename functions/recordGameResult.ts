import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

function getCurrentQuarter(date = new Date()) {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${quarter}`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (user.role || "").toLowerCase();
    if (role !== "admin" && role !== "director") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const result_id = String(body.result_id ?? "").trim();
    const winner_player_id_raw = String(body.winner_player_id ?? "").trim();
    const winner_email_raw = String(body.winner_email ?? "").trim().toLowerCase();

    let points_awarded = Number((body as any).points_awarded);
    if (!Number.isFinite(points_awarded)) points_awarded = 1;
    points_awarded = Math.max(0, Math.min(points_awarded, 100));

    if (!result_id) {
      return Response.json({ error: "result_id is required" }, { status: 400 });
    }
    if (!winner_player_id_raw && !winner_email_raw) {
      return Response.json(
        { error: "winner_player_id or winner_email is required" },
        { status: 400 },
      );
    }

    const currentQuarter = getCurrentQuarter();
    const existingResult = await base44.entities.Game.filter({ result_id }).catch(
      () => [],
    );
    if (existingResult.length > 0) {
      const game = existingResult[0];
      return Response.json({
        success: true,
        quarter: game?.quarter ?? currentQuarter,
        already_recorded: true,
      });
    }

    // Resolve the winner player record
    let winnerPlayer: any = null;
    if (winner_player_id_raw) {
      const records = await base44.entities.Player.filter({
        id: winner_player_id_raw,
      }).catch(() => []);
      winnerPlayer = records?.[0] ?? null;
    }
    if (!winnerPlayer && winner_email_raw) {
      const records = await base44.entities.Player.filter({
        email: winner_email_raw,
      }).catch(() => []);
      winnerPlayer = records?.[0] ?? null;
    }
    if (!winnerPlayer) {
      return Response.json({ error: "Player not found" }, { status: 400 });
    }

    const resolvedId = String(winnerPlayer.id);
    const resolvedEmail = String(winnerPlayer.email ?? winner_email_raw ?? "")
      .trim()
      .toLowerCase();
    const resolvedName =
      `${winnerPlayer.first_name ?? ""} ${winnerPlayer.last_name ?? ""}`
        .trim() || winnerPlayer.display_name || "";

    await base44.entities.Game.create({
      result_id,
      quarter: currentQuarter,
      winner_player_id: resolvedId,
      winner_email: resolvedEmail || null,
      winner_name: resolvedName,
      points_awarded,
      recorded_by: user.email ?? user.id ?? "unknown",
    });

    // Upsert QuarterlyStats — look up by player_id first, then player_email
    let stats = await base44.entities.QuarterlyStats.filter({
      quarter: currentQuarter,
      player_id: resolvedId,
    }).catch(() => []);

    if (!stats?.length && resolvedEmail) {
      stats = await base44.entities.QuarterlyStats.filter({
        quarter: currentQuarter,
        player_email: resolvedEmail,
      }).catch(() => []);
    }

    if (!stats?.length) {
      await base44.entities.QuarterlyStats.create({
        quarter: currentQuarter,
        player_id: resolvedId,
        player_email: resolvedEmail || null,
        player_name: resolvedName,
        wins: 1,
        points: points_awarded,
      });
    } else {
      const record = stats[0];
      await base44.entities.QuarterlyStats.update(record.id, {
        wins: (record.wins ?? 0) + 1,
        points: (record.points ?? 0) + points_awarded,
        player_id: resolvedId,
        player_email: resolvedEmail || record.player_email || null,
        player_name: resolvedName || record.player_name || "",
      });
    }

    return Response.json({ success: true, quarter: currentQuarter, already_recorded: false });
  } catch (error) {
    return Response.json({ error: (error as any)?.message ?? String(error) }, { status: 500 });
  }
});