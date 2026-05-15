import { apiFetch, clearToken, setToken } from "./api.js";

export async function login(username, password) {
  const data = await apiFetch("/auth/login/", {
    method: "POST",
    body: { username, password },
  });
  setToken(data.token);
  localStorage.setItem("me", JSON.stringify(data));
  return data;
}

export async function logout() {
  try {
    await apiFetch("/auth/logout/", { method: "POST" });
  } finally {
    clearToken();
    localStorage.removeItem("me");
  }
}

export async function getMe() {
  try {
    const data = await apiFetch("/auth/me/");
    localStorage.setItem("me", JSON.stringify(data));
    return data;
  } catch {
    return null;
  }
}

export function getCachedMe() {
  const raw = localStorage.getItem("me");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function requireAuthOrRedirect() {
  const hasToken = !!localStorage.getItem("authToken");
  if (!hasToken) {
    window.location.href = "login.html";
  }
}
