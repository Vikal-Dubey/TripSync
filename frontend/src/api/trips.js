import request from "./client.js";

export function createTrip(token, data) {
  return request("/api/trips", { method: "POST", body: data, token });
}

export function listTrips(token) {
  return request("/api/trips", { token });
}

export function getTrip(token, tripId) {
  return request(`/api/trips/${tripId}`, { token });
}

export function updateTrip(token, tripId, data) {
  return request(`/api/trips/${tripId}`, { method: "PATCH", body: data, token });
}

export function deleteTrip(token, tripId) {
  return request(`/api/trips/${tripId}`, { method: "DELETE", token });
}

export function joinTrip(token, inviteToken) {
  return request(`/api/trips/join/${inviteToken}`, { method: "POST", token });
}