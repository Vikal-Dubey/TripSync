import request from "./client.js";

export function listMessages(token, tripId) {
  return request(`/api/trips/${tripId}/messages`, { token });
}