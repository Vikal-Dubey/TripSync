import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const days = await prisma.itineraryDay.findMany({
    where: { tripId: req.params.tripId },
    include: { activities: true },
    orderBy: { dayNumber: "asc" },
  });
  res.json(days);
});

router.post("/", async (req, res) => {
  const trip = await prisma.trip.findUnique({
    where: { id: req.params.tripId },
  });
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  const totalTripDays = Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / 86400000) + 1;

  const existingDays = await prisma.itineraryDay.findMany({
    where: { tripId: req.params.tripId },
    orderBy: { dayNumber: "asc" },
  });

  if (existingDays.length >= totalTripDays) {
    return res.status(400).json({ error: `Cannot add more days. This trip duration is limited to ${totalTripDays} days.` });
  }

  const nextDayNumber = existingDays.length + 1;
  const targetDate = new Date(trip.startDate);
  targetDate.setDate(targetDate.getDate() + existingDays.length);

  const day = await prisma.itineraryDay.create({
    data: { 
      tripId: req.params.tripId, 
      dayNumber: nextDayNumber, 
      date: targetDate 
    },
    include: { activities: true },
  });

  req.app.get("io").to(req.params.tripId).emit("day:added", day);
  res.status(201).json(day);
});

router.patch("/:dayId", async (req, res) => {
  const { name } = req.body;
  
  const day = await prisma.itineraryDay.findFirst({
    where: { id: req.params.dayId, tripId: req.params.tripId },
  });
  if (!day) return res.status(404).json({ error: "Day not found in this trip" });

  const updatedDay = await prisma.itineraryDay.update({
    where: { id: req.params.dayId },
    data: { name: name !== undefined ? name : null },
    include: { activities: true },
  });

  req.app.get("io").to(req.params.tripId).emit("day:updated", updatedDay);
  res.json(updatedDay);
});

router.delete("/:dayId", async (req, res) => {
  const day = await prisma.itineraryDay.findFirst({
    where: { id: req.params.dayId, tripId: req.params.tripId },
  });
  if (!day) return res.status(404).json({ error: "Day not found in this trip" });

  const deletedDayNumber = day.dayNumber;

  await prisma.activity.deleteMany({ where: { dayId: day.id } });
  await prisma.itineraryDay.delete({ where: { id: day.id } });

  // Shift all days with a dayNumber greater than the deleted day down by 1
  const daysToShift = await prisma.itineraryDay.findMany({
    where: {
      tripId: req.params.tripId,
      dayNumber: { gt: deletedDayNumber },
    },
  });

  for (const d of daysToShift) {
    await prisma.itineraryDay.update({
      where: { id: d.id },
      data: { dayNumber: d.dayNumber - 1 },
    });
  }

  // Fetch updated contiguous days list to broadcast to all clients
  const updatedDays = await prisma.itineraryDay.findMany({
    where: { tripId: req.params.tripId },
    include: { activities: true },
    orderBy: { dayNumber: "asc" },
  });

  const io = req.app.get("io");
  io.to(req.params.tripId).emit("day:deleted", { dayId: day.id });
  io.to(req.params.tripId).emit("itinerary:sync", updatedDays);

  res.status(204).send();
});

router.post("/:dayId/activities", async (req, res) => {
  const day = await prisma.itineraryDay.findFirst({
    where: { id: req.params.dayId, tripId: req.params.tripId },
  });
  if (!day) return res.status(404).json({ error: "Day not found in this trip" });

  const { title, time, location, notes } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });

  const activity = await prisma.activity.create({
    data: { dayId: day.id, title, time, location, notes, addedById: req.userId },
  });

  req.app.get("io").to(req.params.tripId).emit("activity:added", { dayId: day.id, activity });
  res.status(201).json(activity);
});

router.patch("/:dayId/activities/:activityId", async (req, res) => {
  const result = await prisma.activity.updateMany({
    where: { id: req.params.activityId, day: { id: req.params.dayId, tripId: req.params.tripId } },
    data: {
      ...(req.body.title && { title: req.body.title }),
      ...(req.body.time !== undefined && { time: req.body.time }),
      ...(req.body.location !== undefined && { location: req.body.location }),
      ...(req.body.notes !== undefined && { notes: req.body.notes }),
    },
  });
  if (result.count === 0) return res.status(404).json({ error: "Activity not found in this trip" });

  const activity = await prisma.activity.findUnique({ where: { id: req.params.activityId } });
  req.app.get("io").to(req.params.tripId).emit("activity:updated", { dayId: req.params.dayId, activity });
  res.json(activity);
});

router.delete("/:dayId/activities/:activityId", async (req, res) => {
  const result = await prisma.activity.deleteMany({
    where: { id: req.params.activityId, day: { id: req.params.dayId, tripId: req.params.tripId } },
  });
  if (result.count === 0) return res.status(404).json({ error: "Activity not found in this trip" });

  req.app.get("io").to(req.params.tripId).emit("activity:deleted", {
    dayId: req.params.dayId,
    activityId: req.params.activityId,
  });
  res.status(204).send();
});

export default router;