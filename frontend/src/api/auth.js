import request from "./client.js";

export function signup({ name, email, password }) {
  return request("/api/auth/signup", { method: "POST", body: { name, email, password } });
}

export function login({ email, password }) {
  return request("/api/auth/login", { method: "POST", body: { email, password } });
}