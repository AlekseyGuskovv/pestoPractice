import { postForm } from "./client";

export function checkTables(fields) {
  return postForm("/booking/check", fields);
}

export function confirmBooking(fields) {
  return postForm("/booking/confirm", fields);
}
