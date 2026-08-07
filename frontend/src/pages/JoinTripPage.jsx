import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { joinTrip } from "../api/trips.js";
import { useAuthStore } from "../store/authStore.js";

export default function JoinTripPage() {
  const { inviteToken } = useParams();
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate(`/login?redirect=/join/${inviteToken}`);
      return;
    }
    joinTrip(token, inviteToken)
      .then((res) => navigate(`/trips/${res.trip.id}`))
      .catch((e) => setError(e.message));
  }, [token, inviteToken, navigate]);

  return (
    <div className="max-w-sm mx-auto mt-16 px-4 text-center">
      {error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <p className="text-ink/60 font-mono text-sm">Joining trip…</p>
      )}
    </div>
  );
}