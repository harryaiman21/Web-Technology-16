export const API_BASE = "http://127.0.0.1:8000/api";

function getToken() {
  return localStorage.getItem("authToken");
}

export function setToken(token) {
  localStorage.setItem("authToken", token);
}

export function clearToken() {
  localStorage.removeItem("authToken");
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

export async function apiFetch(path, { method = "GET", body, headers = {}, isMultipart = false } = {}) {
  const url = `${API_BASE}${path}`;
  const token = getToken();

  const finalHeaders = { ...headers };
  if (token) finalHeaders["Authorization"] = `Token ${token}`;
  if (body && !isMultipart) finalHeaders["Content-Type"] = "application/json";

  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body ? (isMultipart ? body : JSON.stringify(body)) : undefined,
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    const message = data?.detail || data?.error || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
