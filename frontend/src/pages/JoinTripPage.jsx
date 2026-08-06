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
      // not logged in — send to login, then come back here after
      navigate(`/login?redirect=/join/${inviteToken}`);
      return;
    }
    joinTrip(token, inviteToken)
      .then((res) => navigate(`/trips/${res.trip.id}`))
      .catch((e) => setError(e.message));
  }, [token, inviteToken, navigate]);

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  return <p>Joining trip...</p>;
}