import { fetchJSON } from "./client";

export function getHistory() {
  return fetchJSON("/api/history");
}
