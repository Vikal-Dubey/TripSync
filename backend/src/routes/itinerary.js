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
  const { dayNumber, date } = req.body;
  if (!dayNumber) return res.status(400).json({ error: "dayNumber is required" });

  const day = await prisma.itineraryDay.create({
    data: { tripId: req.params.tripId, dayNumber, date: date ? new Date(date) : null },
  });
  res.status(201).json(day);
});

router.delete("/:dayId", async (req, res) => {
  const day = await prisma.itineraryDay.findFirst({
    where: { id: req.params.dayId, tripId: req.params.tripId },
  });
  if (!day) return res.status(404).json({ error: "Day not found in this trip" });

  await prisma.activity.deleteMany({ where: { dayId: day.id } });
  await prisma.itineraryDay.delete({ where: { id: day.id } });
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
  res.json(activity);
});

router.delete("/:dayId/activities/:activityId", async (req, res) => {
  const result = await prisma.activity.deleteMany({
    where: { id: req.params.activityId, day: { id: req.params.dayId, tripId: req.params.tripId } },
  });
  if (result.count === 0) return res.status(404).json({ error: "Activity not found in this trip" });
  res.status(204).send();
});

export default router;