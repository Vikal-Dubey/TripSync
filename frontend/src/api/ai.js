import request from "./client.js";

export function summarizeChat(token, tripId) {
  return request(`/api/trips/${tripId}/ai/summarize-chat`, { method: "POST", token });
}

export function askRecommendation(token, tripId, question) {
  return request(`/api/trips/${tripId}/ai/recommendations`, { method: "POST", body: { question }, token });
}

export function optimizeRoute(token, tripId, dayId) {
  return request(`/api/trips/${tripId}/ai/optimize-route/${dayId}`, { method: "POST", token });
}

export function generateItinerary(token, tripId, prompt, mode = "fill") {
  return request(`/api/trips/${tripId}/ai/generate-itinerary`, { method: "POST", body: { prompt, mode }, token });
}