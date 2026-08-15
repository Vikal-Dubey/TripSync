import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireMember } from "../middleware/requireMember.js";
import { requireOrganizer } from "../middleware/requireOrganizer.js";
import itineraryRoutes from "./itinerary.js";
import packingRoutes from "./packing.js";
import bookingRoutes from "./bookings.js";
import voteRoutes from "./votes.js";
import chatRoutes from "./chat.js";
import expenseRoutes from "./expenses.js";
import aiRoutes from "./ai.js";
import weatherRoutes from "./weather.js";

const router = Router();
router.use(requireAuth); // every route below requires a valid token

// Create a trip — creator automatically becomes organizer
router.post("/", async (req, res) => {
  const { name, destination, startDate, endDate, budget } = req.body;
  if (!name || !destination || !startDate || !endDate) {
    return res.status(400).json({ error: "name, destination, startDate, and endDate are required" });
  }

  const trip = await prisma.trip.create({
    data: {
      name,
      destination,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      budget: budget ?? null,
      tokenExpiresAt: new Date(endDate),
      members: { create: { userId: req.userId, role: "ORGANIZER" } },
    },
    include: { members: true },
  });

  res.status(201).json(trip);
});

// List trips the current user belongs to
router.get("/", async (req, res) => {
  const trips = await prisma.trip.findMany({
    where: { members: { some: { userId: req.userId } } },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(trips);
});

// Get one trip (must be a member)
router.get("/:tripId", requireMember, async (req, res) => {
  const trip = await prisma.trip.findUnique({
    where: { id: req.params.tripId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  res.json(trip);
});

// Update trip settings (organizer only)
router.patch("/:tripId", requireOrganizer, async (req, res) => {
  const { name, destination, startDate, endDate, budget } = req.body;
  const trip = await prisma.trip.update({
    where: { id: req.params.tripId },
    data: {
      ...(name && { name }),
      ...(destination && { destination }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(budget !== undefined && { budget }),
    },
  });
  res.json(trip);
});

// Delete trip (organizer only)
router.delete("/:tripId", requireOrganizer, async (req, res) => {
  const tripId = req.params.tripId;

  try {
    // Delete ExpenseSplit first (need to find expenses of the trip first)
    const expenses = await prisma.expense.findMany({ where: { tripId } });
    const expenseIds = expenses.map((e) => e.id);
    if (expenseIds.length > 0) {
      await prisma.expenseSplit.deleteMany({ where: { expenseId: { in: expenseIds } } });
    }
    await prisma.expense.deleteMany({ where: { tripId } });

    // Delete Activity (need to find itinerary days first)
    const days = await prisma.itineraryDay.findMany({ where: { tripId } });
    const dayIds = days.map((d) => d.id);
    if (dayIds.length > 0) {
      await prisma.activity.deleteMany({ where: { dayId: { in: dayIds } } });
    }
    await prisma.itineraryDay.deleteMany({ where: { tripId } });

    // Delete other direct relations
    await prisma.booking.deleteMany({ where: { tripId } });
    await prisma.vote.deleteMany({ where: { tripId } });
    await prisma.chatMessage.deleteMany({ where: { tripId } });
    await prisma.packingItem.deleteMany({ where: { tripId } });
    await prisma.tripMember.deleteMany({ where: { tripId } });

    // Delete the trip itself
    await prisma.trip.delete({ where: { id: tripId } });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete trip: " + err.message });
  }
});

// Join a trip via invite link
router.post("/join/:inviteToken", async (req, res) => {
  const trip = await prisma.trip.findUnique({ where: { inviteToken: req.params.inviteToken } });

  if (!trip) return res.status(404).json({ error: "Invalid invite link" });
  if (trip.tokenExpiresAt < new Date()) {
    return res.status(410).json({ error: "This invite link has expired" });
  }

  const existing = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId: trip.id, userId: req.userId } },
  });
  if (existing) return res.json({ message: "Already a member", trip });

  await prisma.tripMember.create({
    data: { tripId: trip.id, userId: req.userId, role: "PARTICIPANT" },
  });
  res.status(201).json({ message: "Joined trip", trip });
});

router.use("/:tripId/days", requireMember, itineraryRoutes);
router.use("/:tripId/packing", requireMember, packingRoutes);
router.use("/:tripId/bookings", requireMember, bookingRoutes);
router.use("/:tripId/votes", requireMember, voteRoutes);
router.use("/:tripId/messages", requireMember, chatRoutes);
router.use("/:tripId/expenses", requireMember, expenseRoutes);
router.use("/:tripId/ai", requireMember, aiRoutes);
router.use("/:tripId/weather", requireMember, weatherRoutes);

export default router;