import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BASE_URL = "https://bryon-unfound-brecken.ngrok-free.dev";

const headers = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true",
};

async function callApi(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, params } = await req.json();

    let result;

    switch (action) {
      // Players
      case "getPlayers":
        result = await callApi("GET", "/players");
        break;
      case "createPlayer":
        // params: { name }
        result = await callApi("POST", "/players", { name: params.name });
        break;
      case "getPlayerHistory":
        // params: { player_id }
        result = await callApi("GET", `/players/${params.player_id}/history`);
        break;
      case "getPlayerCardGuards":
        // params: { player_id }
        result = await callApi("GET", `/players/${params.player_id}/card-guards`);
        break;
      case "getPlayerProfile":
        // params: { player_id }
        result = await callApi("GET", `/players/${params.player_id}/profile`);
        break;
      case "getPlayerStats":
        // params: { player_id, recent_games? }
        const statsQs = params.recent_games ? `?recent_games=${params.recent_games}` : "";
        result = await callApi("GET", `/players/${params.player_id}/stats${statsQs}`);
        break;

      // Games
      case "createGame":
        // params: { location }
        result = await callApi("POST", "/games", { location: params.location });
        break;
      case "finalizeGame":
        // params: { game_id }
        result = await callApi("POST", `/games/${params.game_id}/finalize`);
        break;
      case "deleteGame":
        // params: { game_id }
        result = await callApi("DELETE", `/games/${params.game_id}`);
        break;

      // Results
      case "createResult":
        // params: { game_id, player_id, points }
        result = await callApi("POST", "/results", {
          game_id: params.game_id,
          player_id: params.player_id,
          points: params.points,
        });
        break;
      case "updateResult":
        // params: { result_id, points }
        result = await callApi("PUT", `/results/${params.result_id}`, { points: params.points });
        break;

      // Leaderboard
      case "getLeaderboard":
        result = await callApi("GET", "/leaderboard");
        break;

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});