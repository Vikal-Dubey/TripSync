import request from "./client.js";

export function listDays(token, tripId) {
  return request(`/api/trips/${tripId}/days`, { token });
}

export function addDay(token, tripId, data) {
  return request(`/api/trips/${tripId}/days`, { method: "POST", body: data, token });
}

export function addActivity(token, tripId, dayId, data) {
  return request(`/api/trips/${tripId}/days/${dayId}/activities`, { method: "POST", body: data, token });
}

export function deleteActivity(token, tripId, dayId, activityId) {
  return request(`/api/trips/${tripId}/days/${dayId}/activities/${activityId}`, { method: "DELETE", token });
}