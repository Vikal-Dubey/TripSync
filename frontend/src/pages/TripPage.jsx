import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getTrip } from "../api/trips.js";
import { listDays, addDay, addActivity, deleteActivity } from "../api/itinerary.js";
import { listPackingItems, addPackingItem, togglePackingItem } from "../api/packing.js";
import { listVotes, createVote } from "../api/votes.js";
import { listMessages } from "../api/chat.js";
import { useAuthStore } from "../store/authStore.js";
import { getSocket } from "../lib/socket.js";
import { listBookings, addBooking, updateBooking, deleteBooking } from "../api/bookings.js";
import { listExpenses, getBalances, addExpense, deleteExpense } from "../api/expenses.js";

export default function TripPage() {
  const { tripId } = useParams();
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
    ])
      .then(([tripData, daysData, itemsData, bookingsData, votesData, messagesData, expensesData, balancesData]) => {
        setTrip(tripData);
        setDays(daysData);
        setPackingItems(itemsData);
        setBookings(bookingsData);
        setVotes(votesData);
        setMessages(messagesData);
        setExpenses(expensesData);
        setBalanceSummary(balancesData);
      })
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
      socket.disconnect();
    };
  }, [token, tripId]);

  // These now just fire the request — no local setState here, the socket event does that
  async function handleAddDay() {
    await addDay(token, tripId, { dayNumber: days.length + 1 });
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

  if (error) return <p className="text-red-600 text-center mt-10">{error}</p>;
  if (!trip) return <p className="text-center text-ink/50 font-mono text-sm mt-10">Loading…</p>;

  const me = trip.members.find((m) => m.userId === currentUserId);
  const inviteLink = `${window.location.origin}/join/${trip.inviteToken}`;

  return (
    <div className="max-w-3xl mx-auto mt-10 px-4 pb-16">
      <div className="flex items-center gap-2">
        <h2 className="heading text-3xl">{trip.name}</h2>
        <span className={`w-2 h-2 rounded-full ${connected ? "bg-trail" : "bg-mist"}`} title={connected ? "Live" : "Connecting…"} />
      </div>
      <p className="text-ink/60">{trip.destination}</p>
      <p className="font-mono text-sm text-ink/40 mt-1">
        {new Date(trip.startDate).toLocaleDateString()} → {new Date(trip.endDate).toLocaleDateString()}
      </p>

      {me?.role === "ORGANIZER" && (
        <div className="card mt-4 flex items-center justify-between gap-4">
          <span className="text-sm text-ink/60">Invite link (organizer only)</span>
          <code className="code-chip truncate max-w-xs">{inviteLink}</code>
        </div>
      )}

      <Section title="Members">
        <ul className="flex flex-wrap gap-2">
          {trip.members.map((m) => (
            <li key={m.id} className="card p-2 px-3! text-sm flex items-center gap-2">
              <span>{m.user.name}</span>
              <span className={`code-chip py-0.5! ${m.role === "ORGANIZER" ? "text-amber" : ""}`}>{m.role}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Itinerary">
        <div className="relative">
          {days.map((day, i) => (
            <div key={day.id} className="relative pl-8 pb-4">
              {i < days.length - 1 && (
                <span className="absolute left-2.25 top-6 bottom-0 border-l-2 border-dashed border-amber/50" />
              )}
              <span className="absolute left-0 top-1 w-5 h-5 rounded-full bg-trail text-white text-xs flex items-center justify-center font-mono">
                {day.dayNumber}
              </span>
              <DayBlock
                day={day}
                onAddActivity={(title) => handleAddActivity(day.id, title)}
                onDeleteActivity={(activityId) => handleDeleteActivity(day.id, activityId)}
              />
            </div>
          ))}
        </div>
        <button className="btn-secondary mt-2" onClick={handleAddDay}>
          + Add day {days.length + 1}
        </button>
      </Section>

      <Section title="Vote on it">
        <VoteList votes={votes} currentUserId={currentUserId} onCastVote={handleCastVote} onCreateVote={handleCreateVote} />
      </Section>

      <Section title="Packing list">
        <PackingList items={packingItems} onAdd={handleAddPackingItem} onToggle={handleTogglePacking} />
      </Section>

      <Section title="Bookings">
        <BookingList
          bookings={bookings}
          onAdd={handleAddBooking}
          onUpdate={handleUpdateBooking}
          onDelete={handleDeleteBooking}
        />
      </Section>

      <Section title="Group chat">
        <ChatBox messages={messages} currentUserId={currentUserId} onSend={handleSendChat} />
      </Section>

      <Section title="Expenses">
        <ExpensesPanel
          expenses={expenses}
          balanceSummary={balanceSummary}
          members={trip.members}
          currentUserId={currentUserId}
          onAdd={handleAddExpense}
          onDelete={handleDeleteExpense}
        />
      </Section>

    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-8">
      <h3 className="heading text-lg text-trail mb-3">{title}</h3>
      {children}
    </div>
  );
}

function DayBlock({ day, onAddActivity, onDeleteActivity }) {
  const [title, setTitle] = useState("");
  return (
    <div className="card">
      <ul className="flex flex-col gap-1 mb-2">
        {day.activities.map((a) => (
          <li key={a.id} className="flex items-center justify-between text-sm">
            <span>
              {a.title} {a.time && <span className="text-ink/40 font-mono text-xs ml-1">{a.time}</span>}
            </span>
            <button className="text-ink/30 hover:text-red-500 text-xs" onClick={() => onDeleteActivity(a.id)}>
              remove
            </button>
          </li>
        ))}
      </ul>
      <input
        className="input w-full text-sm"
        placeholder="Add activity, press Enter"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onAddActivity(title);
            setTitle("");
          }
        }}
      />
    </div>
  );
}

function PackingList({ items, onAdd, onToggle }) {
  const [name, setName] = useState("");
  return (
    <div className="card">
      <ul className="flex flex-col gap-2 mb-3">
        {items.map((item) => (
          <li key={item.id}>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="accent-trail w-4 h-4"
                checked={!!item.checkedBy}
                onChange={(e) => onToggle(item.id, e.target.checked)}
              />
              <span className={item.checkedBy ? "line-through text-ink/40" : ""}>{item.name}</span>
            </label>
          </li>
        ))}
      </ul>
      <input
        className="input w-full text-sm"
        placeholder="Add item, press Enter"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onAdd(name);
            setName("");
          }
        }}
      />
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

  return (
    <div className="card">
      <ul className="flex flex-col gap-2 mb-3">
        {bookings.map((b) =>
          editingId === b.id ? (
            <li key={b.id} className="border-b border-mist last:border-0 pb-2 last:pb-0">
              <div className="grid grid-cols-3 gap-2 mb-2">
                <input
                  className="input text-sm"
                  placeholder="Type"
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                />
                <input
                  className="input text-sm"
                  placeholder="Confirmation #"
                  value={editForm.confirmation}
                  onChange={(e) => setEditForm({ ...editForm, confirmation: e.target.value })}
                />
                <input
                  className="input text-sm"
                  placeholder="Link"
                  value={editForm.link}
                  onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <button className="btn-primary text-sm" onClick={() => saveEdit(b.id)}>Save</button>
                <button className="btn-secondary text-sm" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </li>
          ) : (
            <li
              key={b.id}
              className="flex items-center justify-between text-sm border-b border-mist last:border-0 pb-2 last:pb-0"
            >
              <div>
                <span className="font-medium capitalize">{b.type}</span>{" "}
                <span className="text-ink/50">{b.details?.confirmation}</span>
              </div>
              <div className="flex items-center gap-3">
                {b.details?.link && (
                  <a href={b.details.link} target="_blank" rel="noreferrer" className="text-trail text-xs font-mono">
                    link →
                  </a>
                )}
                <button className="text-ink/40 hover:text-trail text-xs" onClick={() => startEdit(b)}>
                  edit
                </button>
                <button className="text-ink/40 hover:text-red-500 text-xs" onClick={() => onDelete(b.id)}>
                  delete
                </button>
              </div>
            </li>
          )
        )}
      </ul>
      <div className="grid grid-cols-3 gap-2">
        <input className="input text-sm" placeholder="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
        <input className="input text-sm" placeholder="Confirmation #" value={form.confirmation} onChange={(e) => setForm({ ...form, confirmation: e.target.value })} />
        <input className="input text-sm" placeholder="Link" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
      </div>
      <button
        className="btn-secondary mt-2 text-sm"
        onClick={() => {
          onAdd(form.type, form.confirmation, form.link);
          setForm({ type: "", confirmation: "", link: "" });
        }}
      >
        Add booking
      </button>
    </div>
  );
}

function VoteList({ votes, currentUserId, onCastVote, onCreateVote }) {
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  return (
    <div className="flex flex-col gap-3">
      {votes.map((vote) => {
        const counts = vote.options.map(
          (_, i) => Object.values(vote.votes ?? {}).filter((v) => v === i).length
        );
        const total = counts.reduce((a, b) => a + b, 0) || 1;
        const myChoice = vote.votes?.[currentUserId];

        return (
          <div key={vote.id} className="card">
            <p className="font-medium mb-2">{vote.question}</p>
            <div className="flex flex-col gap-1.5">
              {vote.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => onCastVote(vote.id, i)}
                  className={`relative text-left text-sm rounded-md border px-3 py-2 overflow-hidden ${
                    myChoice === i ? "border-trail" : "border-mist"
                  }`}
                >
                  <span
                    className="absolute inset-y-0 left-0 bg-trail/10"
                    style={{ width: `${(counts[i] / total) * 100}%` }}
                  />
                  <span className="relative flex justify-between">
                    <span>{opt}</span>
                    <span className="font-mono text-ink/50">{counts[i]}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {showForm ? (
        <div className="card flex flex-col gap-2">
          <input className="input text-sm" placeholder="Question" value={question} onChange={(e) => setQuestion(e.target.value)} />
          {options.map((opt, i) => (
            <input
              key={i}
              className="input text-sm"
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
            />
          ))}
          <div className="flex gap-2">
            <button className="btn-secondary text-sm" onClick={() => setOptions([...options, ""])}>
              + Option
            </button>
            <button
              className="btn-primary text-sm"
              onClick={() => {
                onCreateVote(question, options.filter((o) => o.trim()));
                setQuestion("");
                setOptions(["", ""]);
                setShowForm(false);
              }}
            >
              Create poll
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-secondary text-sm self-start" onClick={() => setShowForm(true)}>
          + New poll
        </button>
      )}
    </div>
  );
}

function ChatBox({ messages, currentUserId, onSend }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="card flex flex-col h-72">
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
        {messages.map((m) => (
          <div key={m.id} className={`text-sm ${m.userId === currentUserId ? "self-end text-right" : ""}`}>
            <span className="text-xs text-ink/40 font-mono block">{m.user.name}</span>
            <span
              className={`inline-block rounded-md px-3 py-1.5 ${
                m.userId === currentUserId ? "bg-trail text-white" : "bg-mist/50 text-ink"
              }`}
            >
              {m.content}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 mt-2">
        <input
          className="input flex-1 text-sm"
          placeholder="Type a message"
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
          className="btn-primary text-sm"
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

  return (
    <div className="flex flex-col gap-4">
      {/* Balances + settle-up */}
      <div className="card">
        <p className="heading text-sm text-ink/60 mb-2">Balances</p>
        <ul className="flex flex-col gap-1 mb-3 text-sm">
          {balanceSummary.balances.map((b) => (
            <li key={b.userId} className="flex justify-between">
              <span>{b.userId === currentUserId ? "You" : b.name}</span>
              <span className={b.balance > 0 ? "text-trail" : b.balance < 0 ? "text-amber" : "text-ink/40"}>
                {b.balance > 0 ? `+₹${b.balance}` : b.balance < 0 ? `-₹${Math.abs(b.balance)}` : "settled"}
              </span>
            </li>
          ))}
        </ul>

        {balanceSummary.settlements.length > 0 && (
          <>
            <p className="heading text-sm text-ink/60 mb-2">Settle up</p>
            <ul className="flex flex-col gap-1 text-sm">
              {balanceSummary.settlements.map((s, i) => (
                <li key={i} className="code-chip bg-transparent! p-0! flex gap-1">
                  <span>{s.fromName === undefined ? s.from : s.fromName}</span>
                  <span className="text-amber">→</span>
                  <span>{s.toName ?? s.to}</span>
                  <span className="ml-auto font-semibold">₹{s.amount}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Expense list */}
      <div className="card">
        <ul className="flex flex-col gap-2 mb-3">
          {expenses.map((e) => (
            <li key={e.id} className="flex items-center justify-between text-sm border-b border-mist last:border-0 pb-2 last:pb-0">
              <div>
                <span className="font-medium">₹{Number(e.amount)}</span>{" "}
                <span className="text-ink/50">
                  {e.category && `${e.category} — `}
                  paid by {e.paidBy.name}
                </span>
              </div>
              <button className="text-ink/40 hover:text-red-500 text-xs" onClick={() => onDelete(e.id)}>
                delete
              </button>
            </li>
          ))}
        </ul>

        {/* Add expense form */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input text-sm"
              placeholder="Amount"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <input
              className="input text-sm"
              placeholder="Category (optional)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <input
            className="input text-sm"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div>
            <p className="text-xs text-ink/50 mb-1">Split among:</p>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <label key={m.userId} className="code-chip py-1! flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-trail"
                    checked={splitWith.includes(m.userId)}
                    onChange={() => toggleMember(m.userId)}
                  />
                  {m.user.name}
                </label>
              ))}
            </div>
          </div>
          <button
            className="btn-primary text-sm self-start"
            onClick={() => {
              onAdd(form.amount, form.category, form.description, splitWith);
              setForm({ amount: "", category: "", description: "" });
            }}
          >
            Add expense
          </button>
        </div>
      </div>
    </div>
  );
}