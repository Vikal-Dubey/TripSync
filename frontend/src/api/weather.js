import request from "./client.js";

export function getWeather(token, tripId) {
  return request(`/api/trips/${tripId}/weather`, { token });
}