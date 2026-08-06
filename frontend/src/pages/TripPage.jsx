import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getTrip } from "../api/trips.js";
import { useAuthStore } from "../store/authStore.js";

export default function TripPage() {
  const { tripId } = useParams();
  const token = useAuthStore((s) => s.token);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getTrip(token, tripId).then(setTrip).catch((e) => setError(e.message));
  }, [token, tripId]);

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!trip) return <p>Loading...</p>;

  const me = trip.members.find((m) => m.userId === currentUserId);
  const inviteLink = `${window.location.origin}/join/${trip.inviteToken}`;

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto" }}>
      <h2>{trip.name}</h2>
      <p>{trip.destination}</p>
      <p>{new Date(trip.startDate).toLocaleDateString()} → {new Date(trip.endDate).toLocaleDateString()}</p>

      {me?.role === "ORGANIZER" && (
        <div style={{ background: "#f5f5f5", padding: "0.75rem", borderRadius: 8, margin: "1rem 0" }}>
          <p style={{ margin: 0 }}>Invite link (organizer only):</p>
          <code>{inviteLink}</code>
        </div>
      )}

      <h3>Members</h3>
      <ul>
        {trip.members.map((m) => (
          <li key={m.id}>{m.user.name} — {m.role}</li>
        ))}
      </ul>
    </div>
  );
}