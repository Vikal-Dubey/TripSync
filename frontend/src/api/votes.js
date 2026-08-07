import request from "./client.js";

export function listVotes(token, tripId) {
  return request(`/api/trips/${tripId}/votes`, { token });
}

export function createVote(token, tripId, data) {
  return request(`/api/trips/${tripId}/votes`, { method: "POST", body: data, token });
}