import { postForm } from "./client";

export function login(fields) {
  return postForm("/login", fields);
}

export function register(fields) {
  return postForm("/register", fields);
}

export function logoutUrl() {
  return "/logout";
}
