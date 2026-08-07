import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getTrip } from "../api/trips.js";
import { listDays, addDay, addActivity, deleteActivity } from "../api/itinerary.js";
import { listPackingItems, addPackingItem, togglePackingItem } from "../api/packing.js";
import { listBookings, addBooking } from "../api/bookings.js";
import { useAuthStore } from "../store/authStore.js";

export default function TripPage() {
  const { tripId } = useParams();
  const token = useAuthStore((s) => s.token);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [trip, setTrip] = useState(null);
  const [days, setDays] = useState([]);
  const [packingItems, setPackingItems] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      getTrip(token, tripId),
      listDays(token, tripId),
      listPackingItems(token, tripId),
      listBookings(token, tripId),
    ])
      .then(([tripData, daysData, itemsData, bookingsData]) => {
        setTrip(tripData);
        setDays(daysData);
        setPackingItems(itemsData);
        setBookings(bookingsData);
      })
      .catch((e) => setError(e.message));
  }, [token, tripId]);

  async function handleAddDay() {
    const dayNumber = days.length + 1;
    const day = await addDay(token, tripId, { dayNumber });
    setDays((prev) => [...prev, { ...day, activities: [] }]);
  }

  async function handleAddActivity(dayId, title) {
    if (!title.trim()) return;
    const activity = await addActivity(token, tripId, dayId, { title });
    setDays((prev) =>
      prev.map((d) => (d.id === dayId ? { ...d, activities: [...d.activities, activity] } : d))
    );
  }

  async function handleDeleteActivity(dayId, activityId) {
    await deleteActivity(token, tripId, dayId, activityId);
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId ? { ...d, activities: d.activities.filter((a) => a.id !== activityId) } : d
      )
    );
  }

  async function handleAddPackingItem(name) {
    if (!name.trim()) return;
    const item = await addPackingItem(token, tripId, name);
    setPackingItems((prev) => [...prev, item]);
  }

  async function handleTogglePacking(itemId, checked) {
    const updated = await togglePackingItem(token, tripId, itemId, checked);
    setPackingItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
  }

  async function handleAddBooking(type, confirmation, link) {
    if (!type.trim()) return;
    const booking = await addBooking(token, tripId, { type, details: { confirmation, link } });
    setBookings((prev) => [booking, ...prev]);
  }

  if (error) return <p className="text-red-600 text-center mt-10">{error}</p>;
  if (!trip) return <p className="text-center text-ink/50 font-mono text-sm mt-10">Loading…</p>;

  const me = trip.members.find((m) => m.userId === currentUserId);
  const inviteLink = `${window.location.origin}/join/${trip.inviteToken}`;

  return (
    <div className="max-w-3xl mx-auto mt-10 px-4 pb-16">
      <h2 className="heading text-3xl">{trip.name}</h2>
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
            <li key={m.id} className="card p-2! px-3 text-sm flex items-center gap-2">
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

      <Section title="Packing list">
        <PackingList items={packingItems} onAdd={handleAddPackingItem} onToggle={handleTogglePacking} />
      </Section>

      <Section title="Bookings">
        <BookingList bookings={bookings} onAdd={handleAddBooking} />
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
            <button
              className="text-ink/30 hover:text-red-500 text-xs"
              onClick={() => onDeleteActivity(a.id)}
            >
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

function BookingList({ bookings, onAdd }) {
  const [form, setForm] = useState({ type: "", confirmation: "", link: "" });

  return (
    <div className="card">
      <ul className="flex flex-col gap-2 mb-3">
        {bookings.map((b) => (
          <li key={b.id} className="flex items-center justify-between text-sm border-b border-mist last:border-0 pb-2 last:pb-0">
            <div>
              <span className="font-medium capitalize">{b.type}</span>{" "}
              <span className="text-ink/50">{b.details?.confirmation}</span>
            </div>
            {b.details?.link && (
              <a href={b.details.link} target="_blank" rel="noreferrer" className="text-trail text-xs font-mono">
                link →
              </a>
            )}
          </li>
        ))}
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