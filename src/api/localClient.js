const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const POLL_INTERVAL_MS = 1500;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function getToken() {
  return localStorage.getItem("authToken");
}

function setToken(token) {
  localStorage.setItem("authToken", token);
}

function clearToken() {
  localStorage.removeItem("authToken");
}

function isDirectorSessionValid() {
  const accessTime = localStorage.getItem("directorAccessTime");
  if (!accessTime) return false;
  return Date.now() - parseInt(accessTime) < SIX_HOURS_MS;
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    clearToken();
    localStorage.removeItem("playerEmail");
    localStorage.removeItem("playerName");
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(detail || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return null;
}

function jsonRequest(path, method, body) {
  return request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildEntity(entityName) {
  return {
    list(sort = null, limit = null, skip = 0) {
      const search = new URLSearchParams();
      if (sort) search.set("sort", sort);
      if (limit != null) search.set("limit", String(limit));
      if (skip) search.set("skip", String(skip));
      const query = search.toString();
      return request(`/entities/${entityName}${query ? `?${query}` : ""}`);
    },
    filter(filter = {}, sort = null, limit = null, skip = 0) {
      return jsonRequest(`/entities/${entityName}/query`, "POST", {
        filter,
        sort,
        limit,
        skip,
      });
    },
    create(payload) {
      return jsonRequest(`/entities/${entityName}`, "POST", payload);
    },
    bulkCreate(records) {
      return jsonRequest(`/entities/${entityName}/bulk`, "POST", { records });
    },
    update(id, patch) {
      return jsonRequest(`/entities/${entityName}/${id}`, "PATCH", patch);
    },
    delete(id) {
      return request(`/entities/${entityName}/${id}`, { method: "DELETE" });
    },
    subscribe(listener) {
      let active = true;
      let initialized = false;
      let previous = new Map();

      const emitDiff = async () => {
        try {
          const items = await request(`/entities/${entityName}`);
          if (!active || !Array.isArray(items)) return;

          const next = new Map(items.map((item) => [item.id, item]));

          if (!initialized) {
            previous = next;
            initialized = true;
            return;
          }

          for (const [id, item] of next.entries()) {
            const prior = previous.get(id);
            if (!prior) {
              listener({ type: "create", id, data: item });
              continue;
            }
            if (JSON.stringify(prior) !== JSON.stringify(item)) {
              listener({ type: "update", id, data: item });
            }
          }

          for (const id of previous.keys()) {
            if (!next.has(id)) {
              listener({ type: "delete", id });
            }
          }

          previous = next;
        } catch (_error) {
          // Keep polling even if a request fails transiently.
        }
      };

      emitDiff();
      const intervalId = window.setInterval(emitDiff, POLL_INTERVAL_MS);

      return () => {
        active = false;
        window.clearInterval(intervalId);
      };
    },
  };
}

export const createEntityClient = buildEntity;

export const localClient = {
  mode: "local",
  entities: new Proxy(
    {},
    {
      get(_target, entityName) {
        return buildEntity(String(entityName));
      },
    }
  ),
  auth: {
    async login(email, password) {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || "Invalid email or password");
      }
      const data = await res.json();
      setToken(data.token);
      localStorage.setItem("playerEmail", data.player.email);
      localStorage.setItem("playerName", `${data.player.first_name || ""} ${data.player.last_name || ""}`.trim());
      return data.player;
    },

    async me() {
      const token = getToken();
      if (!token) {
        return {
          id: "guest-local-user",
          email: "guest@riverrat.local",
          full_name: "Guest",
          role: "player",
        };
      }
      try {
        const player = await request("/auth/me");
        const directors = await jsonRequest("/entities/Director/query", "POST", {
          filter: { email: player.email },
        });
        const isDirector = Array.isArray(directors) && directors.length > 0;
        return {
          id: player.id,
          email: player.email,
          full_name: `${player.first_name || ""} ${player.last_name || ""}`.trim() || player.email,
          role: isDirector ? "admin" : "player",
          director_role: directors[0]?.role || null,
        };
      } catch {
        return {
          id: "guest-local-user",
          email: "guest@riverrat.local",
          full_name: "Guest",
          role: "player",
        };
      }
    },

    async updateMe(patch) {
      const me = await this.me();
      if (!me?.id || me.id === "guest-local-user") return { ...me, ...patch };
      const updated = await jsonRequest(`/entities/Player/${me.id}`, "PATCH", patch);
      return {
        id: updated.id,
        email: updated.email,
        full_name: `${updated.first_name || ""} ${updated.last_name || ""}`.trim() || updated.email,
        role: me.role || "player",
      };
    },

    logout(redirectUrl) {
      clearToken();
      localStorage.removeItem("playerEmail");
      localStorage.removeItem("playerName");
      localStorage.removeItem("directorAccess");
      localStorage.removeItem("directorAccessTime");
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    },

    redirectToLogin(redirectUrl) {
      window.location.href = redirectUrl || "/";
    },
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        const formData = new FormData();
        formData.append("file", file);
        return request("/uploads", { method: "POST", body: formData });
      },
    },
  },
  users: {
    async inviteUser(email, role = "user", options = {}) {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await jsonRequest("/entities/User/query", "POST", {
        filter: { email: normalizedEmail },
      });

      let user = existing[0];
      if (!user) {
        user = await jsonRequest("/entities/User", "POST", {
          email: normalizedEmail,
          full_name: options.full_name || normalizedEmail,
          role,
          games_played: 0,
          wins: 0,
          total_points: 0,
          current_streak: 0,
          best_streak: 0,
        });
      }

      if (options.createPlayer) {
        const existingPlayers = await jsonRequest("/entities/Player/query", "POST", {
          filter: { email: normalizedEmail },
        });

        if (!existingPlayers[0]) {
          const players = await request("/entities/Player");
          const maxNumber = players.reduce(
            (max, player) => Math.max(max, Number(player.player_number) || 0),
            0
          );
          await jsonRequest("/entities/Player", "POST", {
            email: normalizedEmail,
            first_name: options.first_name || "",
            last_name: options.last_name || "",
            password: options.password || "Poker123",
            player_number: maxNumber + 1,
            card_guards: 0,
            date_joined: new Date().toISOString().slice(0, 10),
            profile_picture: "",
          });
        }
      }

      return user;
    },
  },
};
