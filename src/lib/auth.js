const apiBase =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:8787"
    : "");

const authRequest = async (path, body, token) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Authentication request failed");
  return result;
};

export const signupUser = (username, password, role) =>
  authRequest("/api/auth/signup", { username, password, role });

export const loginUser = (username, password) =>
  authRequest("/api/auth/login", { username, password });

export const logoutUser = (token) => authRequest("/api/auth/logout", {}, token);