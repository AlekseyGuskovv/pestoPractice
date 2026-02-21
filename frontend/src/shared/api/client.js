/** Base URL for API requests. Empty string = same origin (Vite proxy or FastAPI SPA). */
export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function apiUrl(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

export async function fetchJSON(path, options = {}) {
  const resp = await fetch(apiUrl(path), options);
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.error) {
    const detail = data.detail;
    const detailText = Array.isArray(detail)
      ? detail.map((d) => d.msg || String(d)).join(", ")
      : detail;
    throw new Error(data.error || detailText || `HTTP ${resp.status}`);
  }
  return data;
}

export async function postForm(path, fields) {
  const fd = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    fd.append(key, value ?? "");
  });
  const resp = await fetch(apiUrl(path), { method: "POST", body: fd });
  let data = {};
  try {
    data = await resp.json();
  } catch {
    /* redirect responses may have empty body */
  }
  return { resp, data };
}
