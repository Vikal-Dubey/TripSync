import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTrip, deleteTrip } from "../api/trips.js";
import { listDays, addDay, deleteDay, updateDay, addActivity, deleteActivity } from "../api/itinerary.js";
import { listPackingItems, addPackingItem, togglePackingItem } from "../api/packing.js";
import { listVotes, createVote } from "../api/votes.js";
import { listMessages } from "../api/chat.js";
import { useAuthStore } from "../store/authStore.js";
import { getSocket } from "../lib/socket.js";
import { listBookings, addBooking, updateBooking, deleteBooking } from "../api/bookings.js";
import { listExpenses, getBalances, addExpense, deleteExpense } from "../api/expenses.js";
import { generateItinerary, summarizeChat, askRecommendation, optimizeRoute } from "../api/ai.js";
import VideoCall from "../components/VideoCall.jsx";
import { getWeather } from "../api/weather.js";
import CurrencyConverter from "../components/CurrencyConverter.jsx";

export default function TripPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [trip, setTrip] = useState(null);
  const [days, setDays] = useState([]);
  const [packingItems, setPackingItems] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [votes, setVotes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balanceSummary, setBalanceSummary] = useState({ balances: [], settlements: [] });
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [chatSummary, setChatSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [recQuestion, setRecQuestion] = useState("");
  const [recAnswer, setRecAnswer] = useState(null);
  const [askingRec, setAskingRec] = useState(false);
  const [aiMode, setAiMode] = useState("fill");
  const [weather, setWeather] = useState({ available: false });
  
  // Custom states for design system
  const [activeTab, setActiveTab] = useState("itinerary");
  const [copied, setCopied] = useState(false);

  const socketRef = useRef(null);

  // Initial load — plain REST, one time
  useEffect(() => {
    Promise.all([
      getTrip(token, tripId),
      listDays(token, tripId),
      listPackingItems(token, tripId),
      listBookings(token, tripId),
      listVotes(token, tripId),
      listMessages(token, tripId),
      listExpenses(token, tripId),
      getBalances(token, tripId),
      getWeather(token, tripId),
    ])
      .then(
        ([
          tripData,
          daysData,
          itemsData,
          bookingsData,
          votesData,
          messagesData,
          expensesData,
          balancesData,
          weatherData,
        ]) => {
          setTrip(tripData);
          setDays(daysData);
          setPackingItems(itemsData);
          setBookings(bookingsData);
          setVotes(votesData);
          setMessages(messagesData);
          setExpenses(expensesData);
          setBalanceSummary(balancesData);
          setWeather(weatherData);
        }
      )
      .catch((e) => setError(e.message));
  }, [token, tripId]);

  // Socket connection + event wiring
  useEffect(() => {
    const socket = getSocket(token);
    socketRef.current = socket;
    socket.connect();

    socket.emit("trip:join", tripId, (res) => {
      if (!res?.ok) setError(res?.error ?? "Failed to join live sync");
      else setConnected(true);
    });

    socket.on("day:added", (day) => setDays((prev) => [...prev, day]));
    socket.on("day:deleted", ({ dayId }) => setDays((prev) => prev.filter((d) => d.id !== dayId)));

    socket.on("activity:added", ({ dayId, activity }) =>
      setDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, activities: [...d.activities, activity] } : d)))
    );
    socket.on("activity:updated", ({ dayId, activity }) =>
      setDays((prev) =>
        prev.map((d) =>
          d.id === dayId
            ? { ...d, activities: d.activities.map((a) => (a.id === activity.id ? activity : a)) }
            : d
        )
      )
    );
    socket.on("activity:deleted", ({ dayId, activityId }) =>
      setDays((prev) =>
        prev.map((d) =>
          d.id === dayId ? { ...d, activities: d.activities.filter((a) => a.id !== activityId) } : d
        )
      )
    );

    socket.on("packing:added", (item) => setPackingItems((prev) => [...prev, item]));
    socket.on("packing:updated", (item) =>
      setPackingItems((prev) => prev.map((i) => (i.id === item.id ? item : i)))
    );

    socket.on("booking:added", (booking) => setBookings((prev) => [booking, ...prev]));
    socket.on("booking:updated", (booking) =>
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? booking : b)))
    );
    socket.on("booking:deleted", ({ bookingId }) =>
      setBookings((prev) => prev.filter((b) => b.id !== bookingId))
    );

    socket.on("vote:created", (vote) => setVotes((prev) => [vote, ...prev]));
    socket.on("vote:updated", (vote) => setVotes((prev) => prev.map((v) => (v.id === vote.id ? vote : v))));

    socket.on("chat:new", (message) => setMessages((prev) => [...prev, message]));

    socket.on("expense:added", (expense) => setExpenses((prev) => [expense, ...prev]));
    socket.on("expense:deleted", ({ expenseId }) =>
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId))
    );
    socket.on("balances:updated", (summary) => setBalanceSummary(summary));
    socket.on("itinerary:sync", (updatedDays) => setDays(updatedDays));
    socket.on("day:updated", (day) => {
      setDays((prev) => prev.map((d) => (d.id === day.id ? day : d)));
    });

    return () => {
      socket.off("day:added");
      socket.off("day:deleted");
      socket.off("activity:added");
      socket.off("activity:updated");
      socket.off("activity:deleted");
      socket.off("pa  cking:added");
      socket.off("packing:updated");
      socket.off("vote:created");
      socket.off("vote:updated");
      socket.off("booking:added");
      socket.off("booking:updated");
      socket.off("booking:deleted");
      socket.off("chat:new");
      socket.off("expense:added");
      socket.off("expense:deleted");
      socket.off("balances:updated");
      socket.off("itinerary:sync");
      socket.off("day:updated");
      socket.disconnect();
    };
  }, [token, tripId]);

  // REST updates wrapper
  async function handleAddDay() {
    if (isFullyPlanned) return;
    try {
      await addDay(token, tripId, { dayNumber: days.length + 1 });
    } catch (err) {
      setError(err.message);
    }
  }
  async function handleDeleteDay(dayId) {
    await deleteDay(token, tripId, dayId);
  }
  async function handleUpdateDay(dayId, name) {
    // Optimistic UI update: instantly update local state day names list
    setDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, name } : d)));
    try {
      await updateDay(token, tripId, dayId, { name });
    } catch (err) {
      console.error("Failed to sync day rename with backend database:", err);
    }
  }
  async function handleAddActivity(dayId, title) {
    if (!title.trim()) return;
    await addActivity(token, tripId, dayId, { title });
  }
  async function handleDeleteActivity(dayId, activityId) {
    await deleteActivity(token, tripId, dayId, activityId);
  }
  async function handleAddPackingItem(name) {
    if (!name.trim()) return;
    await addPackingItem(token, tripId, name);
  }
  async function handleTogglePacking(itemId, checked) {
    await togglePackingItem(token, tripId, itemId, checked);
  }
  async function handleAddBooking(type, confirmation, link) {
    if (!type.trim()) return;
    await addBooking(token, tripId, { type, details: { confirmation, link } });
  }
  async function handleUpdateBooking(bookingId, type, confirmation, link) {
    if (!type.trim()) return;
    await updateBooking(token, tripId, bookingId, { type, details: { confirmation, link } });
  }
  async function handleDeleteBooking(bookingId) {
    await deleteBooking(token, tripId, bookingId);
  }
  async function handleCreateVote(question, options) {
    if (!question.trim() || options.length < 2) return;
    await createVote(token, tripId, { question, options });
  }
  function handleCastVote(voteId, optionIndex) {
    socketRef.current?.emit("vote:cast", { tripId, voteId, optionIndex });
  }
  function handleSendChat(content) {
    if (!content.trim()) return;
    socketRef.current?.emit("chat:send", { tripId, content });
  }
  async function handleAddExpense(amount, category, description, splitAmong) {
    if (!amount || Number(amount) <= 0) return;
    await addExpense(token, tripId, { amount: Number(amount), category, description, splitAmong });
  }
  async function handleDeleteExpense(expenseId) {
    await deleteExpense(token, tripId, expenseId);
  }
  async function handleGenerateItinerary() {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      await generateItinerary(token, tripId, aiPrompt, aiMode);
      setAiPrompt("");
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }
  async function handleSummarizeChat() {
    setSummarizing(true);
    try {
      const { summary } = await summarizeChat(token, tripId);
      setChatSummary(summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setSummarizing(false);
    }
  }
  async function handleAskRecommendation() {
    if (!recQuestion.trim()) return;
    setAskingRec(true);
    setRecAnswer(null);
    try {
      const { answer } = await askRecommendation(token, tripId, recQuestion);
      setRecAnswer(answer);
    } catch (err) {
      setError(err.message);
    } finally {
      setAskingRec(false);
    }
  }

  async function handleDeleteTrip() {
    if (!confirm("Are you sure you want to delete this trip workspace? This will permanently delete all itinerary planning, ledger expenses, and shared checklists for all members.")) return;
    try {
      await deleteTrip(token, tripId);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  }

  const me = trip?.members?.find((m) => m.userId === currentUserId);
  const inviteLink = trip ? `${window.location.origin}/join/${trip.inviteToken}` : "";
  const totalTripDays = trip ? Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / 86400000) + 1 : 0;
  const isFullyPlanned = days.length >= totalTripDays;

  function handleCopyInvite() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center px-4">
        <div className="card border-red-200 bg-red-50/50 p-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-4 font-bold text-lg">!</div>
          <h3 className="heading text-xl text-red-700 mb-2">Something went wrong</h3>
          <p className="text-sm text-red-600 mb-6">{error}</p>
          <button className="btn-primary py-2 px-4 mx-auto text-sm" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-teal-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-sec font-medium text-sm">Assembling your adventure center...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back button & Header area */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-6 rounded-3xl border border-border-custom shadow-sm relative overflow-hidden">
        {/* Sky gradient background details */}
        <div className="absolute right-0 top-0 w-64 h-full bg-sky/5 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="heading text-3xl font-bold tracking-tight text-ink">{trip.name}</h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-primary/10 text-teal-primary">
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-teal-primary animate-ping" : "bg-slate-sec"}`} />
              {connected ? "Live Planning" : "Syncing..."}
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-slate-sec mt-2 flex-wrap">
            <span className="flex items-center gap-1">
              {/* Location pin */}
              <svg className="w-4 h-4 text-coral" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              {trip.destination}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono text-xs">
              <svg className="w-4 h-4 text-ocean" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              {new Date(trip.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} → {new Date(trip.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Member Stack list */}
          <div className="flex -space-x-2 overflow-hidden mr-2">
            {trip.members.map((m) => (
              <div
                key={m.id}
                className="w-8 h-8 rounded-full bg-teal-primary text-white text-xs font-bold border-2 border-surface flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                title={`${m.user.name} (${m.role})`}
              >
                {m.user.name.slice(0, 1).toUpperCase()}
              </div>
            ))}
          </div>

          <button
            className={`btn-primary text-xs py-2! px-4! transition-all duration-200 ${copied ? "bg-green-success hover:bg-green-success/80" : ""}`}
            onClick={handleCopyInvite}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Invite Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
                Copy Invite
              </>
            )}
          </button>

          {me?.role === "ORGANIZER" && (
            <button
              className="btn-primary text-xs py-2! px-4! bg-red-500 hover:bg-red-600 transition-colors"
              onClick={handleDeleteTrip}
            >
              Delete Trip
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Workspace Panel (Left Side) */}
        <div className="col-span-1 lg:col-span-8 flex flex-col gap-6">
          {/* Workspaces Tab bar */}
          <div className="flex gap-1.5 bg-surface border border-border-custom p-1.5 rounded-2xl overflow-x-auto shadow-[0_1px_3px_rgba(0,0,0,0.01)] scrollbar-none">
            <button
              onClick={() => setActiveTab("itinerary")}
              className={`tab-btn ${activeTab === "itinerary" ? "tab-btn-active" : "tab-btn-inactive"}`}
            >
              🗺️ Itinerary
            </button>
            <button
              onClick={() => setActiveTab("expenses")}
              className={`tab-btn ${activeTab === "expenses" ? "tab-btn-active" : "tab-btn-inactive"}`}
            >
              💰 Expenses
            </button>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`tab-btn ${activeTab === "bookings" ? "tab-btn-active" : "tab-btn-inactive"}`}
            >
              🎫 Bookings
            </button>
            <button
              onClick={() => setActiveTab("polls")}
              className={`tab-btn ${activeTab === "polls" ? "tab-btn-active" : "tab-btn-inactive"}`}
            >
              🗳️ Polls
            </button>
            <button
              onClick={() => setActiveTab("packing")}
              className={`tab-btn ${activeTab === "packing" ? "tab-btn-active" : "tab-btn-inactive"}`}
            >
              📦 Packing
            </button>
            <button
              onClick={() => setActiveTab("call")}
              className={`tab-btn ${activeTab === "call" ? "tab-btn-active" : "tab-btn-inactive"}`}
            >
              📞 Call
            </button>
          </div>

          {/* Active Workspace renderer */}
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {activeTab === "itinerary" && (
              <div className="flex flex-col gap-6">
                {/* AI Trip Assistant Card */}
                <div className="card-static bg-gradient-to-br from-teal-primary/5 to-orange-ai/5 border border-border-custom p-6 rounded-3xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-4 -translate-y-4">
                    {/* SVG Sparkles */}
                    <svg className="w-32 h-32 text-orange-ai" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 2z" />
                    </svg>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">✨</span>
                    <h3 className="heading text-lg font-bold text-ink">TripSync AI Planner</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-ai/10 text-orange-ai py-0.5 px-2 rounded">Generative AI</span>
                  </div>
                  
                  <p className="text-sm text-slate-sec mb-4">
                    Describe your dream trip details below (e.g. "budget sightseeing, visits to historic temples, local street food trails") and our AI will draft activity day lists instantly.
                  </p>

                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <input
                        className="input flex-1 text-sm bg-surface shadow-sm focus:ring-orange-ai/30 focus:border-orange-ai"
                        placeholder="e.g. budget trip, love trekking, explore markets..."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleGenerateItinerary()}
                      />
                      <button
                        className="btn-primary text-sm whitespace-nowrap bg-teal-primary hover:bg-teal-dark"
                        onClick={handleGenerateItinerary}
                        disabled={generating}
                      >
                        {generating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Drafting...
                          </>
                        ) : (
                          "✨ Generate"
                        )}
                      </button>
                    </div>
                    <div className="flex gap-5 text-xs text-slate-sec">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input type="radio" className="accent-teal-primary" name="aiMode" checked={aiMode === "fill"} onChange={() => setAiMode("fill")} />
                        <span>Fill in remaining days ({Math.max(0, totalTripDays - days.length)} left)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input type="radio" className="accent-teal-primary" name="aiMode" checked={aiMode === "replace"} onChange={() => setAiMode("replace")} />
                        <span>Regenerate entire itinerary</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Timeline and Days list */}
                {days.length === 0 ? (
                  <div className="card text-center py-12 bg-surface">
                    <div className="text-3xl mb-2">🗺️</div>
                    <h4 className="heading text-lg font-semibold text-ink">Itinerary is waiting</h4>
                    <p className="text-sm text-slate-sec max-w-xs mx-auto mt-1 mb-4">No day activities mapped yet. Create custom days or use our AI planner.</p>
                    <button className="btn-primary py-2 px-4 text-sm mx-auto disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleAddDay} disabled={isFullyPlanned}>
                      {isFullyPlanned ? "All days planned" : "+ Add Day 1"}
                    </button>
                  </div>
                ) : (
                  <div className="relative border-l border-dashed border-teal-primary/30 ml-4 pl-8 flex flex-col gap-6">
                    {days.map((day, idx) => (
                      <div key={day.id} className="relative">
                        {/* Day count circle marker */}
                        <div className="absolute -left-12 top-0.5 w-8 h-8 rounded-full bg-teal-primary text-white text-sm font-bold flex items-center justify-center shadow-sm">
                          {day.dayNumber}
                        </div>
                        
                        <DayBlock
                          day={day}
                          tripId={tripId}
                          token={token}
                          weatherForDay={weather.available ? weather.forecast.find((f) => f.dayNumber === day.dayNumber) : null}
                          onAddActivity={(title) => handleAddActivity(day.id, title)}
                          onDeleteActivity={(activityId) => handleDeleteActivity(day.id, activityId)}
                          onDeleteDay={() => handleDeleteDay(day.id)}
                          onUpdateDay={(name) => handleUpdateDay(day.id, name)}
                        />
                      </div>
                    ))}
                    
                    <button
                      className="btn-secondary self-start py-2.5! px-5! ml-0 mt-2 text-sm shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleAddDay}
                      disabled={isFullyPlanned}
                    >
                      {isFullyPlanned ? (
                        "All trip days planned 🗺️"
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-teal-primary" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          Add day {days.length + 1}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "expenses" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ExpensesPanel
                  expenses={expenses}
                  balanceSummary={balanceSummary}
                  members={trip.members}
                  currentUserId={currentUserId}
                  onAdd={handleAddExpense}
                  onDelete={handleDeleteExpense}
                />
              </div>
            )}

            {activeTab === "bookings" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-6">
                <BookingList
                  bookings={bookings}
                  onAdd={handleAddBooking}
                  onUpdate={handleUpdateBooking}
                  onDelete={handleDeleteBooking}
                />
                
                <div className="border-t border-border-custom pt-6">
                  <div className="mb-4">
                    <h3 className="heading text-xl">Quick Exchange Rates</h3>
                    <p className="text-xs text-slate-sec">In-app currency conversions</p>
                  </div>
                  <CurrencyConverter />
                </div>
              </div>
            )}

            {activeTab === "polls" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <VoteList
                  votes={votes}
                  currentUserId={currentUserId}
                  onCastVote={handleCastVote}
                  onCreateVote={handleCreateVote}
                />
              </div>
            )}

            {activeTab === "packing" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <PackingList
                  items={packingItems}
                  onAdd={handleAddPackingItem}
                  onToggle={handleTogglePacking}
                />
              </div>
            )}

            {activeTab === "call" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="mb-4">
                  <h3 className="heading text-xl">Planning Call</h3>
                  <p className="text-xs text-slate-sec">Sync audio & video feeds in full mesh real-time</p>
                </div>
                {socketRef.current ? (
                  <VideoCall
                    socket={socketRef.current}
                    tripId={tripId}
                    currentUserName={trip.members.find((m) => m.userId === currentUserId)?.user.name}
                  />
                ) : (
                  <p className="text-sm text-slate-sec">Connecting socket client...</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Persistent Sidebars (Right Side - Desktop) */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-6">
          {/* Decisions highlights summary card */}
          <div className="card-static bg-surface border border-border-custom p-5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3 border-b border-border-custom pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <h4 className="heading text-sm font-bold text-ink">AI Decision Summary</h4>
              </div>
              <button
                className="text-[10px] uppercase font-bold text-teal-primary tracking-wider hover:underline"
                onClick={handleSummarizeChat}
                disabled={summarizing}
              >
                {summarizing ? "Analyzing..." : "Refresh ✨"}
              </button>
            </div>
            
            {chatSummary ? (
              chatSummary.length === 0 ? (
                <p className="text-xs text-slate-sec font-medium text-center py-4 bg-muted-custom/30 rounded-xl">No explicit decisions discovered in chat logs yet.</p>
              ) : (
                <ul className="text-xs flex flex-col gap-2 font-medium text-slate-sec leading-relaxed">
                  {chatSummary.map((s, i) => (
                    <li key={i} className="flex gap-2 items-start bg-muted-custom/40 p-2.5 rounded-xl border border-border-custom/50">
                      <span className="text-teal-primary font-bold">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-slate-sec mb-3">Keep decisions documented. Query chat logs to summarize agreements instantly.</p>
                <button className="btn-secondary py-1.5! px-3! text-[11px]" onClick={handleSummarizeChat}>
                  ✨ Summarize Decisions
                </button>
              </div>
            )}
          </div>

          {/* Real-time group chat */}
          <div className="card-static bg-surface border border-border-custom p-5 rounded-2xl">
            <div className="flex items-center gap-2 mb-3 border-b border-border-custom pb-3">
              <span className="text-lg">💬</span>
              <h4 className="heading text-sm font-bold text-ink">Group Workspace Chat</h4>
            </div>
            <ChatBox messages={messages} currentUserId={currentUserId} onSend={handleSendChat} />
          </div>

          {/* Travel assistant guide card */}
          <div className="card-static bg-surface border border-border-custom p-5 rounded-2xl">
            <div className="flex items-center gap-2 mb-3 border-b border-border-custom pb-3">
              <span className="text-lg">📍</span>
              <h4 className="heading text-sm font-bold text-ink">Ask TripSync Assistant</h4>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex gap-1.5">
                <input
                  className="input flex-1 text-xs py-2 px-3"
                  placeholder="e.g. good local food markets nearby?"
                  value={recQuestion}
                  onChange={(e) => setRecQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAskRecommendation()}
                />
                <button
                  className="btn-primary text-xs py-2! px-3.5!"
                  onClick={handleAskRecommendation}
                  disabled={askingRec}
                >
                  {askingRec ? "..." : "Ask"}
                </button>
              </div>
              {recAnswer && (
                <div className="p-3 bg-teal-primary/5 border border-teal-primary/10 rounded-xl text-xs text-slate-sec leading-relaxed mt-1">
                  <span className="font-bold text-teal-primary block mb-1">Local Guide:</span>
                  {recAnswer}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DayBlock({
  day,
  tripId,
  token,
  weatherForDay,
  onAddActivity,
  onDeleteActivity,
  onDeleteDay,
  onUpdateDay,
}) {
  const [title, setTitle] = useState("");
  const [suggestedOrder, setSuggestedOrder] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [dayName, setDayName] = useState(day.name || "");

  useEffect(() => {
    setDayName(day.name || "");
  }, [day.name]);

  async function handleOptimize() {
    setOptimizing(true);
    try {
      const { suggestedOrder: order } = await optimizeRoute(token, tripId, day.id);
      setSuggestedOrder(order);
    } catch {
      // fail silently
    } finally {
      setOptimizing(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4 border-b border-border-custom pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isEditingName ? (
            <div className="flex items-center gap-1.5">
              <input
                className="input py-1 px-2.5 text-xs font-semibold max-w-[150px]"
                value={dayName}
                onChange={(e) => setDayName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onUpdateDay(dayName);
                    setIsEditingName(false);
                  } else if (e.key === "Escape") {
                    setDayName(day.name || "");
                    setIsEditingName(false);
                  }
                }}
                autoFocus
              />
              <button
                className="text-xs text-green-success hover:text-green-700 font-bold p-1 cursor-pointer"
                onClick={() => {
                  onUpdateDay(dayName);
                  setIsEditingName(false);
                }}
              >
                ✓
              </button>
              <button
                className="text-xs text-coral hover:text-red-700 font-bold p-1 cursor-pointer"
                onClick={() => {
                  setDayName(day.name || "");
                  setIsEditingName(false);
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group/title">
              <span className="heading text-base font-bold text-ink">
                {day.name ? day.name : `Day ${day.dayNumber}`}
              </span>
              <button
                title="Edit Day Name"
                className="text-slate-sec/45 hover:text-teal-primary cursor-pointer p-0.5 rounded hover:bg-muted-custom opacity-0 group-hover/title:opacity-100 transition-opacity"
                onClick={() => setIsEditingName(true)}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
              </button>
            </div>
          )}

          {weatherForDay && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                weatherForDay.precipitationProbability >= 50
                  ? "bg-sky/10 text-ocean border border-sky/20"
                  : "bg-orange-ai/10 text-orange-ai border border-orange-ai/20"
              }`}
            >
              <span>{weatherForDay.precipitationProbability >= 50 ? "🌧️" : "☀️"}</span>
              <span>{weatherForDay.precipitationProbability}%</span>
              <span>·</span>
              <span>{Math.round(weatherForDay.tempMax)}°/{Math.round(weatherForDay.tempMin)}°</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {day.activities.length > 1 && (
            <button
              className="text-xs font-semibold text-teal-primary hover:text-teal-dark hover:underline flex items-center gap-1"
              onClick={handleOptimize}
              disabled={optimizing}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.656 48.656 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l-3 3m3-3l3 3" />
              </svg>
              {optimizing ? "Optimizing..." : "Suggest Order"}
            </button>
          )}

          <button
            className="text-xs font-semibold text-slate-sec/60 hover:text-red-500 hover:underline flex items-center gap-1"
            onClick={() => {
              if (confirm(`Delete Day ${day.dayNumber} and all its activities?`)) {
                onDeleteDay();
              }
            }}
          >
            Delete Day
          </button>
        </div>
      </div>

      {suggestedOrder && (
        <div className="bg-orange-ai/5 border border-orange-ai/10 text-orange-ai text-xs font-medium p-3 rounded-xl mb-4 leading-relaxed flex items-start gap-2">
          <span>📍</span>
          <div>
            <span className="font-bold">Optimized Sequence:</span> {suggestedOrder.join(" → ")}
          </div>
        </div>
      )}

      {day.activities.length === 0 ? (
        <p className="text-xs text-slate-sec italic text-center py-6">No activities listed. Add one below!</p>
      ) : (
        <ul className="flex flex-col gap-2 mb-4">
          {day.activities.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between text-sm bg-muted-custom/40 border border-border-custom/50 py-2.5 px-4 rounded-xl hover:bg-muted-custom/75 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-teal-primary font-bold">📍</span>
                <span className="font-semibold text-ink">{a.title}</span>
                {a.time && (
                  <span className="text-[10px] font-bold font-mono bg-border-custom text-slate-sec py-0.5 px-1.5 rounded">
                    {a.time}
                  </span>
                )}
              </div>

              <button
                className="text-slate-sec/50 hover:text-red-500 transition-colors text-xs font-semibold"
                onClick={() => onDeleteActivity(a.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <input
          className="input w-full text-sm bg-muted-custom/30 border border-border-custom/80 focus:bg-surface focus:ring-teal-primary/30"
          placeholder="Add activity (e.g. visit temple, dinner), press Enter"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAddActivity(title);
              setTitle("");
            }
          }}
        />
        <span className="absolute right-4 top-3 text-[10px] uppercase font-bold text-slate-sec/40 select-none">Enter ↵</span>
      </div>
    </div>
  );
}

function PackingList({ items, onAdd, onToggle }) {
  const [name, setName] = useState("");
  const total = items.length;
  const packed = items.filter((i) => i.checkedBy !== null).length;
  const percent = total > 0 ? Math.round((packed / total) * 100) : 0;

  return (
    <div className="card-static bg-surface border border-border-custom p-6 rounded-3xl">
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex justify-between items-center text-sm font-semibold text-slate-sec">
          <span className="flex items-center gap-1.5">
            <span>📦</span>
            <span>Items Prepared</span>
          </span>
          <span className="text-teal-primary font-bold">{packed} / {total} Packed ({percent}%)</span>
        </div>
        <div className="progress-bg">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-sec italic text-center py-8">Packing checklist is empty. Add travel essentials below!</p>
      ) : (
        <ul className="flex flex-col gap-2 mb-4 max-h-[300px] overflow-y-auto pr-1">
          {items.map((item) => (
            <li key={item.id}>
              <label className="flex items-center gap-3 text-sm cursor-pointer select-none bg-muted-custom/30 border border-border-custom/50 hover:bg-muted-custom/55 p-3 rounded-xl transition-all">
                <input
                  type="checkbox"
                  className="accent-teal-primary w-4.5 h-4.5 rounded cursor-pointer"
                  checked={!!item.checkedBy}
                  onChange={(e) => onToggle(item.id, e.target.checked)}
                />
                <span className={`font-semibold text-ink ${item.checkedBy ? "line-through text-slate-sec/60" : ""}`}>
                  {item.name}
                </span>
                {item.checkedBy && (
                  <span className="text-[10px] uppercase font-bold tracking-wide bg-teal-primary/10 text-teal-primary ml-auto py-0.5 px-2 rounded">
                    Packed
                  </span>
                )}
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <input
          className="input w-full text-sm"
          placeholder="Add packing essential item, press Enter"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAdd(name);
              setName("");
            }
          }}
        />
        <span className="absolute right-4 top-3 text-[10px] uppercase font-bold text-slate-sec/40 select-none">Enter ↵</span>
      </div>
    </div>
  );
}

function BookingList({ bookings, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState({ type: "", confirmation: "", link: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ type: "", confirmation: "", link: "" });

  function startEdit(b) {
    setEditingId(b.id);
    setEditForm({ type: b.type, confirmation: b.details?.confirmation ?? "", link: b.details?.link ?? "" });
  }

  function saveEdit(bookingId) {
    onUpdate(bookingId, editForm.type, editForm.confirmation, editForm.link);
    setEditingId(null);
  }

  // Helper to map travel category icons
  function getBookingIcon(type) {
    const t = type.toLowerCase();
    if (t.includes("hotel") || t.includes("stay") || t.includes("room")) return "🏨";
    if (t.includes("flight") || t.includes("plane") || t.includes("air")) return "✈️";
    if (t.includes("train") || t.includes("cab") || t.includes("transport") || t.includes("car")) return "🚘";
    return "🎟️";
  }

  return (
    <div className="flex flex-col gap-6">
      {bookings.length === 0 ? (
        <div className="card text-center py-10 bg-surface">
          <div className="text-3xl mb-2">🎫</div>
          <h4 className="heading text-lg font-semibold text-ink">No bookings added</h4>
          <p className="text-sm text-slate-sec max-w-xs mx-auto mt-1">Upload flight tickets, hotel reservations, or activity confirmations below.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookings.map((b) =>
            editingId === b.id ? (
              <div key={b.id} className="card p-5 border border-teal-primary/40 bg-surface">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-sec">Reservation Type</label>
                    <input
                      className="input text-sm"
                      placeholder="e.g. Flight Ticket"
                      value={editForm.type}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-sec">Confirmation Code</label>
                    <input
                      className="input text-sm"
                      placeholder="e.g. AM621X"
                      value={editForm.confirmation}
                      onChange={(e) => setEditForm({ ...editForm, confirmation: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-sec">External Link</label>
                    <input
                      className="input text-sm"
                      placeholder="e.g. url link"
                      value={editForm.link}
                      onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2 justify-end mt-2">
                    <button className="btn-primary text-xs py-1.5! px-3!" onClick={() => saveEdit(b.id)}>Save</button>
                    <button className="btn-secondary text-xs py-1.5! px-3!" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              </div>
            ) : (
              <div key={b.id} className="card bg-surface relative overflow-hidden flex flex-col justify-between border border-border-custom hover:border-teal-primary/20">
                {/* Boarding pass notch decorative */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 rounded-l-full bg-bg-warm border-l border-border-custom" />
                
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{getBookingIcon(b.type)}</span>
                    <span className="heading text-base font-bold capitalize text-ink">{b.type}</span>
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-teal-primary/10 text-teal-primary py-0.5 px-2.5 rounded-full">
                      Confirmed
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 border-t border-border-custom border-dashed pt-3 mb-4">
                    <span className="text-[10px] uppercase font-bold text-slate-sec">Confirmation Code</span>
                    <span className="font-mono text-sm font-bold text-ink">{b.details?.confirmation || "N/A"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border-custom pt-3 text-xs font-semibold">
                  <div className="flex gap-3">
                    <button className="text-slate-sec hover:text-teal-primary" onClick={() => startEdit(b)}>
                      Edit Details
                    </button>
                    <button className="text-slate-sec hover:text-red-500" onClick={() => onDelete(b.id)}>
                      Delete
                    </button>
                  </div>
                  {b.details?.link && (
                    <a href={b.details.link} target="_blank" rel="noreferrer" className="text-teal-primary font-bold hover:underline flex items-center gap-0.5">
                      Open Voucher
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Adding voucher card widget */}
      <div className="card-static bg-surface border border-border-custom p-5 rounded-2xl">
        <h4 className="heading text-sm font-bold text-ink mb-4">Add Booking Confirmation</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-sec">Category</label>
            <input className="input text-xs" placeholder="e.g. Flight / Hotel Stay" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-sec">Confirmation #</label>
            <input className="input text-xs" placeholder="Confirmation code" value={form.confirmation} onChange={(e) => setForm({ ...form, confirmation: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-sec">Voucher Link</label>
            <input className="input text-xs" placeholder="http://booking.com..." value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          </div>
        </div>
        <button
          className="btn-primary text-xs py-2! px-4! self-start"
          onClick={() => {
            onAdd(form.type, form.confirmation, form.link);
            setForm({ type: "", confirmation: "", link: "" });
          }}
        >
          Upload Voucher
        </button>
      </div>
    </div>
  );
}

function VoteList({ votes, currentUserId, onCastVote, onCreateVote }) {
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  return (
    <div className="flex flex-col gap-4">
      {votes.length === 0 ? (
        <div className="card text-center py-10 bg-surface">
          <div className="text-3xl mb-2">🗳️</div>
          <h4 className="heading text-lg font-semibold text-ink">No active polls</h4>
          <p className="text-sm text-slate-sec max-w-xs mx-auto mt-1">Create a poll to decide hotel bookings, dining places, or traveling modes together.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {votes.map((vote) => {
            const counts = vote.options.map(
              (_, i) => Object.values(vote.votes ?? {}).filter((v) => v === i).length
            );
            const total = counts.reduce((a, b) => a + b, 0) || 1;
            const myChoice = vote.votes?.[currentUserId];

            return (
              <div key={vote.id} className="card bg-surface flex flex-col justify-between border border-border-custom hover:border-teal-primary/20">
                <div>
                  <h4 className="heading text-base font-bold text-ink mb-4 flex items-center gap-1.5">
                    <span>🗳️</span>
                    <span>{vote.question}</span>
                  </h4>
                  
                  <div className="flex flex-col gap-2.5">
                    {vote.options.map((opt, i) => {
                      const percent = Math.round((counts[i] / total) * 100);
                      const isVoted = myChoice === i;

                      return (
                        <button
                          key={i}
                          onClick={() => onCastVote(vote.id, i)}
                          className={`relative text-left text-sm rounded-xl border p-3.5 overflow-hidden transition-all duration-200 cursor-pointer ${
                            isVoted ? "border-teal-primary bg-teal-primary/5" : "border-border-custom bg-surface hover:bg-muted-custom/30"
                          }`}
                        >
                          {/* Colored dynamic progress width */}
                          <span
                            className={`absolute inset-y-0 left-0 transition-all duration-300 ${isVoted ? "bg-teal-primary/10" : "bg-muted-custom"}`}
                            style={{ width: `${percent}%` }}
                          />
                          
                          <span className="relative flex justify-between items-center font-semibold">
                            <span className="flex items-center gap-2">
                              {isVoted && <span className="text-teal-primary">✓</span>}
                              <span>{opt}</span>
                            </span>
                            <span className="font-mono text-xs text-slate-sec">
                              {counts[i]} ({percent}%)
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm ? (
        <div className="card-static bg-surface border border-border-custom p-6 rounded-3xl flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
          <h4 className="heading text-base font-bold text-ink">New Decision Poll</h4>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-ink">Poll Question</label>
            <input className="input text-sm" placeholder="e.g. Which boat tour should we take?" value={question} onChange={(e) => setQuestion(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-semibold text-ink">Poll Options</label>
            {options.map((opt, i) => (
              <input
                key={i}
                className="input text-sm"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
              />
            ))}
          </div>

          <div className="flex justify-between items-center border-t border-border-custom pt-4">
            <button className="btn-secondary text-xs py-1.5! px-3!" onClick={() => setOptions([...options, ""])}>
              + Add Option
            </button>
            <div className="flex gap-2">
              <button className="btn-secondary text-xs py-1.5! px-3!" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button
                className="btn-primary text-xs py-1.5! px-4.5!"
                onClick={() => {
                  onCreateVote(question, options.filter((o) => o.trim()));
                  setQuestion("");
                  setOptions(["", ""]);
                  setShowForm(false);
                }}
              >
                Post Poll
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button className="btn-secondary text-sm self-start py-2 px-4 shadow-sm hover:shadow" onClick={() => setShowForm(true)}>
          <svg className="w-4 h-4 text-teal-primary" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Poll
        </button>
      )}
    </div>
  );
}

function ChatBox({ messages, currentUserId, onSend }) {
  const [text, setText] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-80 bg-surface">
      <div ref={containerRef} className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 scrollbar-thin max-h-[260px] pb-2">
        {messages.length === 0 ? (
          <p className="text-xs text-slate-sec italic text-center my-auto">Chat is quiet. Send a ping to start co-planning!</p>
        ) : (
          messages.map((m) => {
            const isMe = m.userId === currentUserId;
            return (
              <div key={m.id} className={`flex flex-col max-w-[85%] ${isMe ? "self-end items-end" : "self-start items-start"}`}>
                <span className="text-[10px] text-slate-sec/60 font-semibold block mb-0.5 ml-1 mr-1">{m.user.name}</span>
                <span
                  className={`inline-block rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    isMe ? "bg-teal-primary text-white font-medium rounded-tr-none" : "bg-muted-custom text-ink rounded-tl-none border border-border-custom/30"
                  }`}
                >
                  {m.content}
                </span>
              </div>
            );
          })
        )}
      </div>
      
      <div className="flex gap-2 mt-3 border-t border-border-custom pt-3 relative">
        <input
          className="input flex-1 text-xs"
          placeholder="Type planning message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSend(text);
              setText("");
            }
          }}
        />
        <button
          className="btn-primary text-xs py-2 px-4 whitespace-nowrap bg-teal-primary hover:bg-teal-dark"
          onClick={() => {
            onSend(text);
            setText("");
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function ExpensesPanel({ expenses, balanceSummary, members, currentUserId, onAdd, onDelete }) {
  const [form, setForm] = useState({ amount: "", category: "", description: "" });
  const [splitWith, setSplitWith] = useState(members.map((m) => m.userId)); // default: everyone

  function toggleMember(userId) {
    setSplitWith((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  // Calculate my balance
  const myBalance = balanceSummary.balances.find((b) => b.userId === currentUserId)?.balance || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Balances card (Left Column) */}
      <div className="col-span-1 lg:col-span-5 flex flex-col gap-6">
        {/* Net User Balance Card */}
        <div className="card-static bg-surface border border-border-custom p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-3 -translate-y-3">
            <svg className="w-24 h-24 text-teal-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
            </svg>
          </div>
          
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-sec">My Personal Balance</span>
          <h4 className={`font-display text-4xl font-extrabold mt-1 ${myBalance > 0 ? "text-teal-primary" : myBalance < 0 ? "text-coral" : "text-slate-sec"}`}>
            {myBalance > 0 ? `+₹${myBalance}` : myBalance < 0 ? `-₹${Math.abs(myBalance)}` : "Settled up"}
          </h4>
          <p className="text-xs text-slate-sec mt-2">
            {myBalance > 0 && "You are owed funds by the group."}
            {myBalance < 0 && "You owe money to the group."}
            {myBalance === 0 && "Your ledger is perfectly clean!"}
          </p>
        </div>

        {/* Ledger checklist */}
        <div className="card-static bg-surface border border-border-custom p-5 rounded-2xl">
          <h4 className="heading text-sm font-bold text-ink mb-3">Group Balances</h4>
          <ul className="flex flex-col gap-2.5 text-xs font-semibold text-slate-sec">
            {balanceSummary.balances.map((b) => (
              <li key={b.userId} className="flex justify-between items-center bg-muted-custom/40 p-2.5 rounded-xl border border-border-custom/50">
                <span>{b.userId === currentUserId ? "You (Self)" : b.name}</span>
                <span className={`font-bold font-mono ${b.balance > 0 ? "text-teal-primary" : b.balance < 0 ? "text-coral" : "text-slate-sec/60"}`}>
                  {b.balance > 0 ? `+₹${b.balance}` : b.balance < 0 ? `-₹${Math.abs(b.balance)}` : "settled"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Debt Settlements */}
        {balanceSummary.settlements.length > 0 && (
          <div className="card-static bg-surface border border-border-custom p-5 rounded-2xl border-l-4 border-l-orange-ai">
            <h4 className="heading text-sm font-bold text-ink mb-3">Optimized Settlements</h4>
            <ul className="flex flex-col gap-2">
              {balanceSummary.settlements.map((s, i) => (
                <li key={i} className="text-xs font-semibold text-slate-sec flex items-center gap-1.5 bg-orange-ai/5 border border-orange-ai/10 p-2.5 rounded-xl">
                  <span className="text-ink">{s.fromName === undefined ? s.from : s.fromName}</span>
                  <span className="text-coral">→</span>
                  <span className="text-ink">{s.toName ?? s.to}</span>
                  <span className="ml-auto font-mono font-bold text-ink bg-surface border border-border-custom/80 py-0.5 px-2 rounded">
                    ₹{s.amount}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Expense ledger entries (Right Column) */}
      <div className="col-span-1 lg:col-span-7 flex flex-col gap-6">
        {/* Ledger listing */}
        <div className="card-static bg-surface border border-border-custom p-6 rounded-3xl">
          <h4 className="heading text-base font-bold text-ink mb-4">Expenses History</h4>
          
          {expenses.length === 0 ? (
            <p className="text-sm text-slate-sec italic text-center py-10">No expenses recorded yet. Create one below to split!</p>
          ) : (
            <ul className="flex flex-col gap-3 mb-4 max-h-[300px] overflow-y-auto pr-1">
              {expenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between text-sm bg-muted-custom/40 border border-border-custom/50 py-3 px-4 rounded-xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink text-base">₹{Number(e.amount)}</span>
                      {e.category && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-primary/10 text-teal-primary py-0.5 px-2.5 rounded-full">
                          {e.category}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-sec mt-1 block">
                      {e.description && `${e.description} · `} Paid by <span className="font-semibold text-ink">{e.paidBy.name}</span>
                    </span>
                  </div>
                  
                  <button className="text-slate-sec/50 hover:text-red-500 font-semibold text-xs" onClick={() => onDelete(e.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Expense creation panel */}
        <div className="card-static bg-surface border border-border-custom p-5 rounded-2xl">
          <h4 className="heading text-sm font-bold text-ink mb-4">Add Expense Log</h4>
          
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-ink">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-2.5 font-bold text-slate-sec">₹</span>
                  <input
                    className="input pl-8 w-full text-sm"
                    placeholder="0.00"
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-ink">Category</label>
                <input
                  className="input text-sm"
                  placeholder="e.g. Travel, Dinner, Sightseeing"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-ink">Description</label>
              <input
                className="input text-sm"
                placeholder="e.g. boat ride in Ganges / airport taxi ride"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="border-t border-border-custom pt-3">
              <p className="text-xs font-bold text-slate-sec mb-2">Split Among Planners:</p>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const active = splitWith.includes(m.userId);
                  return (
                    <label
                      key={m.userId}
                      className={`code-chip py-1.5! px-3! flex items-center gap-2 cursor-pointer select-none transition-all duration-150 ${
                        active ? "border-teal-primary bg-teal-primary/5 text-teal-primary" : "border-border-custom"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-teal-primary"
                        checked={active}
                        onChange={() => toggleMember(m.userId)}
                      />
                      <span className="font-semibold">{m.user.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              className="btn-primary text-xs py-2.5! px-5! self-start"
              onClick={() => {
                onAdd(form.amount, form.category, form.description, splitWith);
                setForm({ amount: "", category: "", description: "" });
              }}
            >
              Post Expense
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}