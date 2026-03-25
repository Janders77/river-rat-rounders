import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\\\$&");
}

function normalizeQuery(raw: unknown) {
  return String(raw ?? "").trim();
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

    const body = await req.json().catch(() => ({} as any));
    const queryRaw = normalizeQuery(body.query);

    // Require at least 2 characters to avoid expensive scans.
    if (queryRaw.length < 2) {
      return Response.json({ players: [] });
    }

    const results: any[] = [];

    // Numeric: match player_number exactly
    if (/^\d+$/.test(queryRaw)) {
      const n = parseInt(queryRaw, 10);
      if (Number.isFinite(n)) {
        const matches = await base44.asServiceRole.entities.Player.filter(
          { player_number: n },
          null,
          5,
        ).catch(() => []);
        results.push(...matches);
      }
    } else {
      const parts = queryRaw.split(/\s+/).filter(Boolean);
      const queries: Promise<any[]>[] = [];

      if (parts.length >= 2) {
        const first = escapeRegex(parts[0]);
        const rest = escapeRegex(parts.slice(1).join(" "));
        queries.push(
          base44.asServiceRole.entities.Player.filter(
            { first_name: { $regex: first, $options: "i" }, last_name: { $regex: rest, $options: "i" } },
            null,
            5,
          ).catch(() => []),
          base44.asServiceRole.entities.Player.filter(
            { first_name: { $regex: rest, $options: "i" }, last_name: { $regex: first, $options: "i" } },
            null,
            5,
          ).catch(() => []),
        );
      } else {
        const token = escapeRegex(queryRaw);
        queries.push(
          base44.asServiceRole.entities.Player.filter(
            { first_name: { $regex: token, $options: "i" } },
            null,
            5,
          ).catch(() => []),
          base44.asServiceRole.entities.Player.filter(
            { last_name: { $regex: token, $options: "i" } },
            null,
            5,
          ).catch(() => []),
          base44.asServiceRole.entities.Player.filter(
            { email: { $regex: token, $options: "i" } },
            null,
            5,
          ).catch(() => []),
        );
      }

      const arrays = await Promise.all(queries);
      for (const a of arrays) results.push(...a);
    }

    // Dedupe and sanitize
    const seen = new Set<string>();
    const players: any[] = [];

    for (const p of results) {
      const id = String(p?.id ?? "");
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const first_name = (p?.first_name ?? "").trim();
      const last_name = (p?.last_name ?? "").trim();
      const display_name = `${first_name} ${last_name}`.trim() || (p?.display_name ?? "").trim();

      players.push({
        id,
        first_name: first_name || null,
        last_name: last_name || null,
        display_name,
        player_number: typeof p?.player_number === "number" ? p.player_number : null,
        email: (p?.email ?? "").trim().toLowerCase(),
      });
    }

    players.sort((a, b) => (a.display_name || "").localeCompare(b.display_name || "", "en", { sensitivity: "base" }));

    return Response.json({ players });
  } catch (err) {
    console.error("searchPlayers error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
});