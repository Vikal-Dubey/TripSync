import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { login } from "../api/auth.js";
import { useAuthStore } from "../store/authStore.js";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const { token, user } = await login(form);
      setAuth(token, user);
      navigate(redirect);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "2rem auto" }}>
      <h2>Log in</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Log in</button>
      </form>
      <p>No account? <Link to={`/signup${redirect !== "/" ? `?redirect=${redirect}` : ""}`}>Sign up</Link></p>
    </div>
  );
}