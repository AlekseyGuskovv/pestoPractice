import { fetchJSON } from "./client";

export function getDashboard() {
  return fetchJSON("/admin/api/dashboard");
}

export function getAdminMenu() {
  return fetchJSON("/admin/api/menu");
}

export function getAdminTables() {
  return fetchJSON("/admin/api/tables");
}

export function updateReservationStatus(id, status) {
  return fetchJSON(`/admin/api/reservations/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export function updateOrderStatus(id, status) {
  return fetchJSON(`/admin/api/orders/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export function addMenuItem(body) {
  return fetchJSON("/admin/api/menu/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteMenuItem(id) {
  return fetchJSON(`/admin/api/menu/items/${id}`, { method: "DELETE" });
}

export function addTable(body) {
  return fetchJSON("/admin/api/tables", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteTable(id) {
  return fetchJSON(`/admin/api/tables/${id}`, { method: "DELETE" });
}
