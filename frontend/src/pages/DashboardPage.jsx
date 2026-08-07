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
    <div className="max-w-2xl mx-auto mt-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="heading text-3xl">Your trips</h2>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "New trip"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card flex flex-col gap-3 mb-6">
          <input className="input" placeholder="Trip name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-ink/60">
              Start date
              <input className="input mt-1 w-full" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </label>
            <label className="text-sm text-ink/60">
              End date
              <input className="input mt-1 w-full" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
            </label>
          </div>
          <input className="input" placeholder="Budget (optional)" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn-primary">Create</button>
        </form>
      )}

      {trips.length === 0 ? (
        <div className="card text-center text-ink/50 py-10">
          No trips yet — create one to get started.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link
                to={`/trips/${trip.id}`}
                className="card flex items-center justify-between hover:border-trail transition-colors"
              >
                <div>
                  <p className="font-semibold text-ink">{trip.name}</p>
                  <p className="text-sm text-ink/60">{trip.destination}</p>
                </div>
                <span className="font-mono text-xs text-ink/40">
                  {new Date(trip.startDate).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}