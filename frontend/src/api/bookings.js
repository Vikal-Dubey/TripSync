import request from "./client.js";

export function listBookings(token, tripId) {
  return request(`/api/trips/${tripId}/bookings`, { token });
}

export function addBooking(token, tripId, data) {
  return request(`/api/trips/${tripId}/bookings`, { method: "POST", body: data, token });
}

export function updateBooking(token, tripId, bookingId, data) {
  return request(`/api/trips/${tripId}/bookings/${bookingId}`, { method: "PATCH", body: data, token });
}

export function deleteBooking(token, tripId, bookingId) {
  return request(`/api/trips/${tripId}/bookings/${bookingId}`, { method: "DELETE", token });
}