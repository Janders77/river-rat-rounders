const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function authHeaders() {
  const token = localStorage.getItem("authToken");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function getDuesStatus() {
  const response = await fetch(`${API_BASE_URL}/dues/status`, { headers: authHeaders() });
  if (!response.ok) throw new Error(`getDuesStatus failed with status ${response.status}`);
  return response.json();
}

export async function createPaypalOrder() {
  const response = await fetch(`${API_BASE_URL}/paypal/create-order`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || `createPaypalOrder failed with status ${response.status}`);
  }
  return response.json();
}

export async function capturePaypalOrder(orderId) {
  const response = await fetch(`${API_BASE_URL}/paypal/capture-order`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ order_id: orderId }),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || `capturePaypalOrder failed with status ${response.status}`);
  }
  return response.json();
}
