import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { signup } from "../api/auth.js";
import { useAuthStore } from "../store/authStore.js";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await signup(form);
      setAuth(token, user);
      navigate(redirect);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-73px)] grid grid-cols-1 md:grid-cols-12 bg-bg-warm">
      {/* Left side: Brand/Illustration Column */}
      <div className="hidden md:flex md:col-span-6 lg:col-span-7 bg-bg-mint flex-col justify-between p-12 relative overflow-hidden border-r border-border-custom">
        <div className="absolute top-0 right-0 w-96 h-96 bg-ocean/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-primary/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="flex items-center gap-2 text-teal-primary">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
          <span className="font-display font-bold tracking-tight text-lg">TripSync</span>
        </div>

        <div className="max-w-md my-auto z-10">
          <h1 className="heading-hero text-5xl md:text-6xl text-ink leading-tight mb-6">
            Start planning your next <span className="text-teal-primary">adventure.</span>
          </h1>
          <p className="text-slate-sec text-lg leading-relaxed">
            Invite your friends, set up polls, check lists, split currencies, and build a unified itinerary with your travel crew.
          </p>

          <div className="mt-10 relative">
            {/* Travel Path Icon Graphics */}
            <svg className="w-full max-w-sm text-teal-primary/30" viewBox="0 0 200 60" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 20 C 60 50, 100 0, 190 40" strokeDasharray="3 3" />
              <circle cx="10" cy="20" r="4" fill="#0d9488" />
              <circle cx="190" cy="40" r="4" fill="#f97316" />
            </svg>
            <div className="flex justify-between max-w-sm mt-2 text-xs font-semibold text-slate-sec">
              <span>Assemble Group</span>
              <span>Sync Memories</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-sec/60">
          © {new Date().getFullYear()} TripSync Inc. All rights reserved.
        </div>
      </div>

      {/* Right side: Signup Form */}
      <div className="col-span-1 md:col-span-6 lg:col-span-5 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md bg-surface border border-border-custom rounded-2xl p-8 shadow-sm">
          <div className="mb-8">
            <h2 className="heading text-3xl mb-2">Create Account</h2>
            <p className="text-sm text-slate-sec">Plan together, travel together</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink">Your Name</label>
              <input
                className="input"
                placeholder="Vikal Dubey"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink">Email Address</label>
              <input
                className="input"
                placeholder="you@example.com"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink">Password</label>
              <input
                className="input"
                placeholder="Minimum 6 characters"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary mt-2 w-full py-3!" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="text-sm text-slate-sec text-center mt-6">
            Already have an account?{" "}
            <Link to={`/login${redirect !== "/" ? `?redirect=${redirect}` : ""}`} className="text-teal-primary font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}