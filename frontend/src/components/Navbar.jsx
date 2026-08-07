import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";

export default function Navbar() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 bg-white border-b-2 border-trail shadow-sm">
      <Link to="/" className="heading text-xl text-trail flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-amber inline-block" />
        TripSync
      </Link>
      {token ? (
        <>
          <span className="ml-auto text-sm text-ink/60">Hi, {user?.name}</span>
          <button
            className="btn-secondary text-sm"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Log out
          </button>
        </>
      ) : (
        <>
          <Link to="/login" className="ml-auto btn-secondary text-sm">Log in</Link>
          <Link to="/signup" className="btn-primary text-sm">Sign up</Link>
        </>
      )}
    </nav>
  );
}