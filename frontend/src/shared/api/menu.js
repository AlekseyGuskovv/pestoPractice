import { fetchJSON } from "./client";

export function getMenu() {
  return fetchJSON("/api/menu");
}

export function getMyReservations() {
  return fetchJSON("/api/my_reservations");
}
