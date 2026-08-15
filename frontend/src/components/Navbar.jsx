import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";

export default function Navbar() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-surface/95 backdrop-blur border-b border-border-custom shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-8">
        <Link to="/" state={{ scrollTo: "top" }} className="heading text-2xl text-teal-primary flex items-center gap-2 group">
          <svg className="w-8 h-8 text-teal-primary transition-transform duration-300 group-hover:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
          <span className="font-display font-bold tracking-tight">TripSync</span>
        </Link>
        
        {token && (
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" state={{ scrollTo: "top" }} className="text-sm font-semibold text-teal-primary hover:text-teal-dark transition-colors">
              Dashboard
            </Link>
            <Link
              to="/"
              state={{ scrollTo: "adventures" }}
              className="text-sm font-semibold text-slate-sec/60 hover:text-teal-primary transition-colors"
            >
              My Trips
            </Link>
            <Link
              to="/"
              state={{ scrollTo: "features" }}
              className="text-sm font-semibold text-slate-sec/60 hover:text-teal-primary transition-colors"
            >
              Explore
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {token ? (
          <>
            <div className="flex items-center gap-3 bg-muted-custom/60 py-1.5 px-3 rounded-xl border border-border-custom">
              <div className="w-7 h-7 rounded-lg bg-teal-primary text-white flex items-center justify-center font-bold text-xs">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "U"}
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-slate-sec">
                {user?.name}
              </span>
            </div>
            <button
              className="btn-secondary py-1.5! px-3.5! text-xs"
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
            <Link to="/login" className="btn-secondary py-1.5! px-4! text-xs">Log in</Link>
            <Link to="/signup" className="btn-primary py-1.5! px-4! text-xs">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}