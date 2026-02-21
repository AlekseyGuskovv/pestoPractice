import { fetchJSON } from "./client";

export function createOrder(payload) {
  return fetchJSON("/orders/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
