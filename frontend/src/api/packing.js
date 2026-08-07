import request from "./client.js";

export function listPackingItems(token, tripId) {
  return request(`/api/trips/${tripId}/packing`, { token });
}

export function addPackingItem(token, tripId, name) {
  return request(`/api/trips/${tripId}/packing`, { method: "POST", body: { name }, token });
}

export function togglePackingItem(token, tripId, itemId, checked) {
  return request(`/api/trips/${tripId}/packing/${itemId}`, { method: "PATCH", body: { checked }, token });
}