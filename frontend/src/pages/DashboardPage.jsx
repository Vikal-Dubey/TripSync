import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { listTrips, createTrip, deleteTrip } from "../api/trips.js";
import { useAuthStore } from "../store/authStore.js";

export default function DashboardPage() {
  const token = useAuthStore((s) => s.token);
  const userName = useAuthStore((s) => s.user?.name);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const location = useLocation();
  const navigate = useNavigate();

  const [trips, setTrips] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [form, setForm] = useState({ name: "", destination: "", startDate: "", endDate: "", budget: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listTrips(token).then(setTrips).catch((e) => setError(e.message));
  }, [token]);

  useEffect(() => {
    if (location.state?.scrollTo) {
      const section = location.state.scrollTo;
      setTimeout(() => {
        if (section === "top") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          const element = document.getElementById(`${section}-section`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }
      }, 100);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  async function handleDeleteTrip(e, tripId) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this trip workspace? This will permanently delete all itinerary planning, ledger expenses, and shared checklists for all members.")) return;
    try {
      await deleteTrip(token, tripId);
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreate(e) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const trip = await createTrip(token, {
        ...form,
        budget: form.budget ? Number(form.budget) : undefined,
      });
      setTrips((prev) => [trip, ...prev]);
      setShowForm(false);
      setWizardStep(1);
      setForm({ name: "", destination: "", startDate: "", endDate: "", budget: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getTripStatus(startDate, endDate) {
    const now = new Date().setHours(0,0,0,0);
    const start = new Date(startDate).setHours(0,0,0,0);
    const end = new Date(endDate).setHours(0,0,0,0);
    if (now < start) return { text: "Upcoming", class: "badge-upcoming" };
    if (now > end) return { text: "Completed", class: "badge-completed" };
    return { text: "Active", class: "badge-active" };
  }

  function calculateReadiness(trip) {
    let score = 30; // base score
    if (trip.budget) score += 20;
    if (trip.destination) score += 20;
    if ((trip.members || []).length > 1) score += 30;
    return Math.min(score, 100);
  }

  function handleScrollToFeatures() {
    document.getElementById("features-section")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="w-full bg-bg-warm">
      {/* 1. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-12 md:py-20 flex flex-col lg:flex-row items-center justify-between gap-12 border-b border-border-custom/50">
        <div className="flex-1 text-center lg:text-left z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-primary/10 text-teal-primary mb-6 animate-pulse">
            ✨ Introducing TripSync
          </span>
          <h1 className="heading-hero text-4xl sm:text-5xl lg:text-6xl leading-[1.1] mb-6">
            Plan together.<br />
            <span className="text-teal-primary">Travel together.</span>
          </h1>
          <p className="text-slate-sec text-base sm:text-lg max-w-lg mb-8 leading-relaxed mx-auto lg:mx-0">
            Everything your group needs to plan, organize, and enjoy the perfect trip — together.
            Co-create itineraries, share bookings, split expenses, and vote in real-time.
          </p>
          <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
            <button
              className="btn-primary py-3.5! px-7! text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5"
              onClick={() => {
                setShowForm(true);
                setWizardStep(1);
              }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create a Trip
            </button>
            <button
              className="btn-secondary py-3.5! px-7! text-sm hover:-translate-y-0.5"
              onClick={handleScrollToFeatures}
            >
              Explore TripSync
            </button>
          </div>
        </div>

        {/* Right side animated travel map */}
        <div className="hidden lg:flex flex-1 items-center justify-center relative h-96 min-w-[420px]">
          <div className="absolute inset-0 bg-teal-primary/5 rounded-3xl border border-teal-primary/10 overflow-hidden shadow-[inset_0_2px_8px_rgba(13,148,136,0.03)]">
            {/* Floating clouds */}
            <div className="absolute top-8 left-8 w-12 h-6 bg-white/70 rounded-full blur-[1px] anim-cloud-1" />
            <div className="absolute top-16 right-12 w-16 h-8 bg-white/60 rounded-full blur-[1px] anim-cloud-2" />
            
            {/* Animated Route */}
            <svg className="w-full h-full text-teal-primary/20" viewBox="0 0 300 200" fill="none" stroke="currentColor">
              <path
                d="M 40,150 C 80,40 130,170 200,60 C 240,10 265,90 265,90"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-teal-primary/40 animate-fly-route"
                id="travelPath"
              />
              <g className="text-coral animate-pulse-pin">
                <circle cx="40" cy="150" r="4.5" fill="currentColor" />
                <circle cx="115" cy="115" r="4.5" fill="currentColor" />
                <circle cx="200" cy="60" r="4.5" fill="currentColor" />
              </g>
            </svg>

            {/* Flying Airplane along the route */}
            <div className="absolute top-0 left-0 w-8 h-8 text-teal-primary anim-plane pointer-events-none">
              <svg className="w-full h-full transform -rotate-45" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5L21 16z"/>
              </svg>
            </div>

            {/* Floating destination badge popup */}
            <div className="absolute bottom-6 right-6 bg-surface/95 backdrop-blur px-3 py-2.5 rounded-xl border border-border-custom shadow-md animate-bounce duration-1000 flex items-center gap-2">
              <span className="text-sm">🏝️</span>
              <div>
                <h5 className="text-[10px] font-bold text-ink">Current Plan</h5>
                <p className="text-[9px] text-slate-sec font-semibold">Varanasi & Beyond</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. YOUR ADVENTURES SECTION */}
      <section id="adventures-section" className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="heading text-2xl font-bold">Your Adventures</h2>
            <p className="text-sm text-slate-sec mt-1">Trips you're planning with your crew.</p>
          </div>
          <span className="text-xs font-semibold text-slate-sec bg-muted-custom py-1 px-3 rounded-xl border border-border-custom">
            {trips.length} {trips.length === 1 ? "Trip" : "Trips"} Active
          </span>
        </div>

        {trips.length === 0 ? (
          <div className="card text-center py-16 flex flex-col items-center justify-center bg-surface border-dashed">
            <div className="w-16 h-16 bg-teal-primary/10 rounded-full flex items-center justify-center mb-4 text-teal-primary">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <h3 className="heading text-xl mb-1">Your adventures wait here</h3>
            <p className="text-slate-sec text-sm mb-6 max-w-sm">No trips added yet. Create a trip workspace and share the invite links to begin co-planning.</p>
            <button className="btn-primary text-sm px-6" onClick={() => setShowForm(true)}>
              + Create Your First Trip
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => {
              const status = getTripStatus(trip.startDate, trip.endDate);
              const readiness = calculateReadiness(trip);

              return (
                <div key={trip.id} className="group relative">
                  <Link
                    to={`/trips/${trip.id}`}
                    className="card flex flex-col justify-between h-72 border border-border-custom hover:border-teal-primary/45 relative overflow-hidden bg-surface transition-all duration-200"
                  >
                    <div>
                      {/* Cover visualization block */}
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-primary via-ocean to-orange-ai" />

                      {/* Top bar */}
                      <div className="flex items-center justify-between mb-4 mt-2">
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${status.class}`}>
                          {status.text}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-slate-sec">
                            {new Date(trip.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                          {(trip.members || []).find((m) => m.userId === currentUserId)?.role === "ORGANIZER" && (
                            <button
                              title="Delete Trip"
                              className="text-slate-sec/45 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50 cursor-pointer z-20"
                              onClick={(e) => handleDeleteTrip(e, trip.id)}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="heading text-xl mb-1 group-hover:text-teal-primary transition-colors truncate">
                        {trip.name}
                      </h3>
                      <p className="text-sm text-slate-sec flex items-center gap-1 mb-4 font-medium">
                        <span className="text-coral">📍</span>
                        {trip.destination}
                      </p>
                    </div>

                    <div>
                      {/* Readiness gauge */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs font-semibold text-slate-sec mb-1">
                          <span>Trip Readiness</span>
                          <span className="text-teal-primary font-bold">{readiness}%</span>
                        </div>
                        <div className="progress-bg">
                          <div className="progress-fill" style={{ width: `${readiness}%` }} />
                        </div>
                      </div>

                      {/* Members avatar stack row */}
                      <div className="flex items-center justify-between border-t border-border-custom/50 pt-3.5 mt-2">
                        <div className="flex -space-x-2 overflow-hidden">
                          {(trip.members || []).slice(0, 4).map((m) => (
                            <div
                              key={m.id}
                              className="inline-block w-7 h-7 rounded-full bg-teal-primary text-white text-[10px] font-bold border border-surface flex items-center justify-center shadow-sm"
                              title={m.user?.name}
                            >
                              {m.user?.name ? m.user.name.slice(0, 1).toUpperCase() : "U"}
                            </div>
                          ))}
                          {(trip.members || []).length > 4 && (
                            <div className="inline-block w-7 h-7 rounded-full bg-slate-sec text-white text-[10px] font-bold border border-surface flex items-center justify-center">
                              +{(trip.members || []).length - 4}
                            </div>
                          )}
                        </div>

                        <span className="text-xs font-bold text-teal-primary group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                          Open Trip <span>→</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. OUR FEATURES SECTION */}
      <section id="features-section" className="max-w-7xl mx-auto px-6 py-16 md:py-24 border-t border-border-custom/50">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="heading text-3xl md:text-4xl font-bold mb-4">Everything you need for the perfect trip.</h2>
          <p className="text-slate-sec text-sm sm:text-base leading-relaxed">
            Plan, collaborate, and stay organized without switching between multiple apps. Co-planning made seamless.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* FEATURE 1 — Collaborative Itinerary */}
          <div className="card-static flex flex-col justify-between h-96 hover:shadow-lg transition-all duration-200 group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-primary/10 text-teal-primary flex items-center justify-center font-bold text-lg mb-5">
                📅
              </div>
              <h3 className="heading text-lg font-bold mb-2">Plan Your Itinerary Together</h3>
              <p className="text-slate-sec text-xs leading-relaxed">
                Build your day-by-day itinerary with your entire group in real time. Perfect alignment guaranteed.
              </p>
            </div>

            {/* Animation preview panel */}
            <div className="bg-muted-custom/40 border border-border-custom/50 rounded-xl p-3 h-40 flex flex-col justify-center gap-2 overflow-hidden relative">
              <div className="text-[10px] font-bold text-teal-primary uppercase tracking-wide">Day 1 Timeline</div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-border-custom/40 anim-item-1">
                  <span className="text-[10px] font-semibold text-ink">🍳 09:00 Breakfast</span>
                  <div className="w-4 h-4 rounded-full bg-coral text-white text-[8px] font-bold flex items-center justify-center">R</div>
                </div>
                <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-border-custom/40 anim-item-2">
                  <span className="text-[10px] font-semibold text-ink">🏛️ 11:00 Sightseeing</span>
                  <div className="w-4 h-4 rounded-full bg-teal-primary text-white text-[8px] font-bold flex items-center justify-center">V</div>
                </div>
                <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-border-custom/40 anim-item-3">
                  <span className="text-[10px] font-semibold text-ink">🌅 17:00 Ganga Aarti</span>
                  <div className="w-4 h-4 rounded-full bg-ocean text-white text-[8px] font-bold flex items-center justify-center">A</div>
                </div>
              </div>
            </div>
          </div>

          {/* FEATURE 2 — AI Trip Planner */}
          <div className="card-static flex flex-col justify-between h-96 hover:shadow-lg transition-all duration-200 group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-orange-ai/10 text-orange-ai flex items-center justify-center font-bold text-lg mb-5">
                ✨
              </div>
              <h3 className="heading text-lg font-bold mb-2">Plan Smarter with AI</h3>
              <p className="text-slate-sec text-xs leading-relaxed">
                Generate, optimize, and improve your itinerary instantly with TripSync AI helper integrations.
              </p>
            </div>

            {/* Animation preview panel */}
            <div className="bg-gradient-to-br from-orange-ai/5 to-coral/5 border border-border-custom/50 rounded-xl p-3 h-40 flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-orange-ai flex items-center gap-1">✨ TripSync AI</span>
                <span className="text-[8px] font-semibold text-slate-sec/60 bg-surface px-1.5 py-0.5 rounded border border-border-custom">Active</span>
              </div>
              <div className="flex flex-col gap-1.5 my-2">
                <div className="text-[10px] text-ink flex items-center gap-1.5 font-medium">
                  <span className="text-green-success">✓</span> Finding attractions
                </div>
                <div className="text-[10px] text-ink flex items-center gap-1.5 font-medium">
                  <span className="text-green-success">✓</span> Checking travel times
                </div>
                <div className="text-[10px] text-ink flex items-center gap-1.5 font-medium">
                  <span className="text-green-success">✓</span> Optimizing your route
                </div>
              </div>
              <div className="bg-surface py-1.5 px-2.5 rounded-lg border border-orange-ai/20 shadow-sm text-center text-[10px] font-bold text-orange-ai animate-pulse">
                Day 2 optimized successfully! ✨
              </div>
            </div>
          </div>

          {/* FEATURE 3 — Group Expenses */}
          <div className="card-static flex flex-col justify-between h-96 hover:shadow-lg transition-all duration-200 group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-green-success/10 text-green-success flex items-center justify-center font-bold text-lg mb-5">
                💳
              </div>
              <h3 className="heading text-lg font-bold mb-2">Split Expenses Easily</h3>
              <p className="text-slate-sec text-xs leading-relaxed">
                Track shared group expenses, view ledgers, and instantly balance who owes whom without stress.
              </p>
            </div>

            {/* Animation preview panel */}
            <div className="bg-muted-custom/40 border border-border-custom/50 rounded-xl p-3 h-40 flex flex-col justify-between overflow-hidden">
              <div className="text-[10px] font-bold text-slate-sec uppercase">Ledger Summary</div>
              <div className="flex flex-col gap-1.5 anim-balance-scale">
                <div className="flex items-center justify-between bg-surface p-1.5 rounded border border-border-custom/40">
                  <span className="text-[10px] font-bold text-ink">Vikal</span>
                  <span className="text-[10px] font-bold text-green-success">+₹860</span>
                </div>
                <div className="flex items-center justify-between bg-surface p-1.5 rounded border border-border-custom/40">
                  <span className="text-[10px] font-bold text-ink">Rahul</span>
                  <span className="text-[10px] font-bold text-coral">-₹380</span>
                </div>
                <div className="flex items-center justify-between bg-surface p-1.5 rounded border border-border-custom/40">
                  <span className="text-[10px] font-bold text-ink">Ankit</span>
                  <span className="text-[10px] font-bold text-coral">-₹480</span>
                </div>
              </div>
              <div className="text-[9px] font-bold text-center text-green-success">✓ Settlement optimized & cleared</div>
            </div>
          </div>

          {/* FEATURE 4 — Group Chat & Decisions */}
          <div className="card-static flex flex-col justify-between h-96 hover:shadow-lg transition-all duration-200 group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-ocean/10 text-ocean flex items-center justify-center font-bold text-lg mb-5">
                💬
              </div>
              <h3 className="heading text-lg font-bold mb-2">Plan Together in Real Time</h3>
              <p className="text-slate-sec text-xs leading-relaxed">
                Chat with your group, trigger WebRTC visual syncs, and log decisions instantly inside workspace.
              </p>
            </div>

            {/* Animation preview panel */}
            <div className="bg-muted-custom/40 border border-border-custom/50 rounded-xl p-3 h-40 flex flex-col justify-between overflow-hidden">
              <div className="flex flex-col gap-2">
                <div className="bg-surface p-1.5 rounded-lg border border-border-custom/40 text-[9px] text-ink max-w-[80%] anim-chat-1 self-start">
                  <span className="block font-bold text-[8px] text-slate-sec">Rahul</span>
                  "Should we book the hotel?"
                </div>
                <div className="bg-teal-primary text-white p-1.5 rounded-lg text-[9px] max-w-[80%] anim-chat-2 self-end">
                  <span className="block font-bold text-[8px] text-white/70">Vikal</span>
                  "Yes, let's go with Taj Ganges."
                </div>
              </div>
              <div className="bg-orange-ai/10 border border-orange-ai/20 py-1 px-2 rounded text-[8px] text-orange-ai font-bold flex items-center gap-1.5 anim-chat-3">
                <span>⚡ AI:</span> Decision Saved! Hotel → Taj Ganges
              </div>
            </div>
          </div>

          {/* FEATURE 5 — Bookings & Currency */}
          <div className="card-static flex flex-col justify-between h-96 hover:shadow-lg transition-all duration-200 group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky/15 text-sky flex items-center justify-center font-bold text-lg mb-5">
                ✈️
              </div>
              <h3 className="heading text-lg font-bold mb-2">Keep Your Bookings Organized</h3>
              <p className="text-slate-sec text-xs leading-relaxed">
                Manage vouchers, hotel confirmation codes, flights, and calculate exchange rates with the converter.
              </p>
            </div>

            {/* Animation preview panel */}
            <div className="bg-muted-custom/40 border border-border-custom/50 rounded-xl p-3 h-40 flex flex-col justify-between overflow-hidden">
              <div className="bg-surface p-2 rounded-lg border border-border-custom flex items-center justify-between">
                <div>
                  <span className="block text-[8px] uppercase font-bold text-slate-sec">Hotel Stay</span>
                  <span className="text-[10px] font-bold text-ink">Taj Ganges Varanasi</span>
                </div>
                <span className="text-[9px] font-mono font-bold bg-muted-custom px-1.5 py-0.5 rounded text-ink">TG-83210</span>
              </div>
              
              <div className="bg-surface p-2 rounded-lg border border-border-custom flex items-center justify-between gap-2 mt-2">
                <span className="text-[9px] font-bold text-ink">Exchange rate:</span>
                <span className="text-[9px] font-mono font-semibold text-slate-sec">1 USD = 83.5 INR</span>
              </div>
            </div>
          </div>

          {/* FEATURE 6 — Polls & Packing */}
          <div className="card-static flex flex-col justify-between h-96 hover:shadow-lg transition-all duration-200 group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-coral/10 text-coral flex items-center justify-center font-bold text-lg mb-5">
                📊
              </div>
              <h3 className="heading text-lg font-bold mb-2">Let Everyone Have a Say</h3>
              <p className="text-slate-sec text-xs leading-relaxed">
                Conduct visual polls to settle planning debates and trace group packing check sheets sequentially.
              </p>
            </div>

            {/* Animation preview panel */}
            <div className="bg-muted-custom/40 border border-border-custom/50 rounded-xl p-3 h-40 flex flex-col justify-between overflow-hidden">
              <div className="flex flex-col gap-1.5">
                <div className="text-[9px] font-bold text-ink">Where should we eat?</div>
                <div className="relative bg-surface p-1 rounded border border-border-custom/40 overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 bg-teal-primary/10 anim-bar-fill" />
                  <div className="flex justify-between text-[8px] font-bold text-ink z-10 relative px-1">
                    <span>Baati Chokha</span>
                    <span>45%</span>
                  </div>
                </div>
                <div className="relative bg-surface p-1 rounded border border-border-custom/40 overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 bg-teal-primary/10 anim-bar-fill-sub" />
                  <div className="flex justify-between text-[8px] font-bold text-ink z-10 relative px-1">
                    <span>Kashi Chat</span>
                    <span>30%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 border-t border-border-custom/60 pt-1.5 mt-1.5 text-[8px] text-slate-sec font-bold">
                <span className="flex items-center gap-1 text-green-success">✓ Power Bank</span>
                <span className="flex items-center gap-1 text-green-success">✓ Passport</span>
                <span className="flex items-center gap-1">○ Camera</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS SECTION */}
      <section className="bg-surface border-t border-b border-border-custom/50 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="heading text-3xl md:text-4xl font-bold mb-4">How TripSync Works</h2>
            <p className="text-slate-sec text-sm sm:text-base leading-relaxed">
              From idea to adventure in a few simple steps. Designed to make group planning frictionless.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="flex flex-col gap-4 text-center md:text-left">
              <div className="text-4xl font-display font-extrabold text-teal-primary/20">01</div>
              <h4 className="heading text-lg font-bold text-ink">Create Your Trip</h4>
              <p className="text-slate-sec text-xs leading-relaxed">
                Choose your destination, travel dates, budget metrics, and launch your dedicated trip space.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col gap-4 text-center md:text-left">
              <div className="text-4xl font-display font-extrabold text-ocean/20">02</div>
              <h4 className="heading text-lg font-bold text-ink">Invite Your Crew</h4>
              <p className="text-slate-sec text-xs leading-relaxed">
                Share the invite link with your friends to bring everyone instantly into the real-time planner.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col gap-4 text-center md:text-left">
              <div className="text-4xl font-display font-extrabold text-orange-ai/20">03</div>
              <h4 className="heading text-lg font-bold text-ink">Plan Together</h4>
              <p className="text-slate-sec text-xs leading-relaxed">
                Co-build day itineraries, log bookings, split travel costs, checklist packing lists, and vote.
              </p>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col gap-4 text-center md:text-left">
              <div className="text-4xl font-display font-extrabold text-coral/20">04</div>
              <h4 className="heading text-lg font-bold text-ink">Travel</h4>
              <p className="text-slate-sec text-xs leading-relaxed">
                Your group is aligned, bookings organized, and itinerary accessible from any device. Happy journey!
              </p>
            </div>
          </div>

          <div className="text-center mt-16 bg-muted-custom/40 border border-border-custom/50 rounded-2xl py-6 max-w-xl mx-auto font-display font-bold text-teal-primary text-base">
            Your trip is planned. Now go enjoy it. ✈️
          </div>
        </div>
      </section>

      {/* 5. FINAL CTA SECTION */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="heading text-3xl md:text-4xl font-bold mb-4">Ready for your next adventure?</h2>
        <p className="text-slate-sec text-sm sm:text-base max-w-md mx-auto mb-8">
          Create a workspace in seconds, invite your friends, and start co-planning your dream getaway.
        </p>
        <button
          className="btn-primary py-4! px-8! text-sm mx-auto shadow-md hover:shadow-lg hover:-translate-y-0.5"
          onClick={() => {
            setShowForm(true);
            setWizardStep(1);
          }}
        >
          Create Your First Trip ✈️
        </button>
      </section>

      {/* 6. FOOTER */}
      <footer className="bg-surface border-t border-border-custom py-12 text-slate-sec">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-start justify-between gap-8">
          <div>
            <Link to="/" state={{ scrollTo: "top" }} className="heading text-lg text-teal-primary flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity">
              <svg className="w-6 h-6 text-teal-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
              <span className="font-bold">TripSync</span>
            </Link>
            <p className="text-xs max-w-xs leading-relaxed">
              Coastal & Outdoor Explorer collaborative trip planner. Built with love for global nomads and group adventures.
            </p>
          </div>

          <div className="flex flex-wrap gap-12">
            <div className="flex flex-col gap-2">
              <h5 className="text-xs font-bold text-ink uppercase tracking-wider mb-1">Quick Links</h5>
              <Link to="/" state={{ scrollTo: "top" }} className="text-xs hover:text-teal-primary transition-colors">Dashboard</Link>
              <Link to="/" state={{ scrollTo: "adventures" }} className="text-xs hover:text-teal-primary transition-colors">My Trips</Link>
              <Link to="/" state={{ scrollTo: "features" }} className="text-xs hover:text-teal-primary transition-colors">Features</Link>
            </div>

            <div className="flex flex-col gap-2">
              <h5 className="text-xs font-bold text-ink uppercase tracking-wider mb-1">Legal</h5>
              <span className="text-xs hover:text-teal-primary transition-colors cursor-pointer">Privacy Policy</span>
              <span className="text-xs hover:text-teal-primary transition-colors cursor-pointer">Terms of Service</span>
            </div>

            <div className="flex flex-col gap-2">
              <h5 className="text-xs font-bold text-ink uppercase tracking-wider mb-1">Connect</h5>
              <a
                href="https://www.linkedin.com/in/vikal-dubey-682818325/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs hover:text-teal-primary transition-colors"
              >
                LinkedIn
              </a>
              <a
                href="https://github.com/Vikal-Dubey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs hover:text-teal-primary transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-border-custom/50 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <span>&copy; 2026 TripSync. All rights reserved.</span>
          <span>Contact support: support@tripsync.com</span>
        </div>
      </footer>

      {/* TRIP CREATION WIZARD DIALOG MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface rounded-3xl border border-border-custom shadow-2xl w-full max-w-lg p-6 flex flex-col gap-6 animate-in zoom-in-95 duration-200">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-primary">Step {wizardStep} of 3</span>
                <span className="text-xs font-semibold text-slate-sec">New Journey</span>
              </div>
              <h3 className="heading text-xl">Let's map your next escape</h3>
              <div className="flex gap-1.5 mt-3">
                <div className={`h-1 flex-1 rounded-full ${wizardStep >= 1 ? "bg-teal-primary" : "bg-muted-custom"}`} />
                <div className={`h-1 flex-1 rounded-full ${wizardStep >= 2 ? "bg-teal-primary" : "bg-muted-custom"}`} />
                <div className={`h-1 flex-1 rounded-full ${wizardStep >= 3 ? "bg-teal-primary" : "bg-muted-custom"}`} />
              </div>
            </div>

            <div className="min-h-[140px] flex flex-col justify-center">
              {wizardStep === 1 && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-ink">Trip Title</label>
                    <input
                      className="input"
                      placeholder="e.g. Varanasi Ganga Tour, Weekend Trek"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-ink">Where to?</label>
                    <input
                      className="input"
                      placeholder="e.g. Varanasi, India"
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="flex flex-col gap-4 animate-in slide-in-from-right duration-250">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-ink">Start Date</label>
                    <input
                      className="input"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-ink">End Date</label>
                    <input
                      className="input"
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-ink">Estimated Total Budget (Optional)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 font-semibold text-slate-sec">₹</span>
                      <input
                        className="input pl-8 w-full"
                        placeholder="50,000"
                        type="number"
                        value={form.budget}
                        onChange={(e) => setForm({ ...form, budget: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium mb-4">
                {error}
              </div>
            )}

            <div className="flex justify-between items-center gap-3">
              {wizardStep > 1 ? (
                <button className="btn-secondary text-sm" onClick={() => setWizardStep((s) => s - 1)}>
                  Back
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <button
                  className="btn-secondary text-sm"
                  onClick={() => {
                    setShowForm(false);
                    setWizardStep(1);
                  }}
                >
                  Cancel
                </button>
                {wizardStep < 3 ? (
                  <button
                    className="btn-primary text-sm"
                    onClick={() => {
                      if (wizardStep === 1 && (!form.name.trim() || !form.destination.trim())) return;
                      if (wizardStep === 2 && (!form.startDate || !form.endDate)) return;
                      setWizardStep((s) => s + 1);
                    }}
                  >
                    Next
                  </button>
                ) : (
                  <button className="btn-primary text-sm" onClick={handleCreate} disabled={loading}>
                    {loading ? "Creating..." : "Create Trip"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}