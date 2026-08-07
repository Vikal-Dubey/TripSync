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
    <div className="max-w-sm mx-auto mt-16 px-4">
      <div className="card">
        <h2 className="heading text-2xl mb-6">Log in</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            className="input"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn-primary mt-1">Log in</button>
        </form>
        <p className="text-sm text-ink/60 mt-4">
          No account?{" "}
          <Link to={`/signup${redirect !== "/" ? `?redirect=${redirect}` : ""}`} className="text-trail font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}