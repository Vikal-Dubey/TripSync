import request from "./client.js";

export function listBookings(token, tripId) {
  return request(`/api/trips/${tripId}/bookings`, { token });
}

export function addBooking(token, tripId, data) {
  return request(`/api/trips/${tripId}/bookings`, { method: "POST", body: data, token });
}