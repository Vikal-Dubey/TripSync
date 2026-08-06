import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listTrips, createTrip } from "../api/trips.js";
import { useAuthStore } from "../store/authStore.js";

export default function DashboardPage() {
  const token = useAuthStore((s) => s.token);
  const [trips, setTrips] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", destination: "", startDate: "", endDate: "", budget: "" });
  const [error, setError] = useState(null);

  useEffect(() => {
    listTrips(token).then(setTrips).catch((e) => setError(e.message));
  }, [token]);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      const trip = await createTrip(token, {
        ...form,
        budget: form.budget ? Number(form.budget) : undefined,
      });
      setTrips((prev) => [trip, ...prev]);
      setShowForm(false);
      setForm({ name: "", destination: "", startDate: "", endDate: "", budget: "" });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Your trips</h2>
        <button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "New trip"}</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", margin: "1rem 0" }}>
          <input placeholder="Trip name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required />
          <label>Start date <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></label>
          <label>End date <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></label>
          <input placeholder="Budget (optional)" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button type="submit">Create</button>
        </form>
      )}

      {trips.length === 0 ? (
        <p>No trips yet — create one to get started.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {trips.map((trip) => (
            <li key={trip.id} style={{ padding: "0.75rem", border: "1px solid #ddd", borderRadius: 8, marginBottom: "0.5rem" }}>
              <Link to={`/trips/${trip.id}`}>
                <strong>{trip.name}</strong> — {trip.destination}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}