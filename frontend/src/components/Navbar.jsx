import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";

export default function Navbar() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <nav style={{ display: "flex", gap: "1rem", padding: "1rem", borderBottom: "1px solid #ddd" }}>
      <Link to="/">TripSync</Link>
      {token ? (
        <>
          <span style={{ marginLeft: "auto" }}>Hi, {user?.name}</span>
          <button
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
          <Link to="/login" style={{ marginLeft: "auto" }}>Log in</Link>
          <Link to="/signup">Sign up</Link>
        </>
      )}
    </nav>
  );
}