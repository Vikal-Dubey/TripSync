import request from "./client.js";

export function listExpenses(token, tripId) {
  return request(`/api/trips/${tripId}/expenses`, { token });
}

export function getBalances(token, tripId) {
  return request(`/api/trips/${tripId}/expenses/balances`, { token });
}

export function addExpense(token, tripId, data) {
  return request(`/api/trips/${tripId}/expenses`, { method: "POST", body: data, token });
}

export function deleteExpense(token, tripId, expenseId) {
  return request(`/api/trips/${tripId}/expenses/${expenseId}`, { method: "DELETE", token });
}