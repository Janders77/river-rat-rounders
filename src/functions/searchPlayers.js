const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function searchPlayers(payload) {
  const token = localStorage.getItem("authToken");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/functions/search-players`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`searchPlayers failed with status ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? { data: { players: data } } : data;
}
