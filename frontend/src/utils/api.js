export async function fetchJSON(url, options = {}) {
  const resp = await fetch(url, options);
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

export async function postForm(url, fields) {
  const fd = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    fd.append(key, value ?? "");
  });
  const resp = await fetch(url, { method: "POST", body: fd });
  let data = {};
  try {
    data = await resp.json();
  } catch {
    /* redirect responses may have empty body */
  }
  return { resp, data };
}
