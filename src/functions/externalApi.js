const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function externalApi(payload) {
  const token = localStorage.getItem("authToken");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/functions/external-api`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`externalApi failed with status ${response.status}`);
  }

  return response.json();
}
