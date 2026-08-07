import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { tripId: req.params.tripId },
    orderBy: { createdAt: "desc" },
  });
  res.json(bookings);
});

router.post("/", async (req, res) => {
  const { type, details } = req.body;
  if (!type || !details) return res.status(400).json({ error: "type and details are required" });

  const booking = await prisma.booking.create({ data: { tripId: req.params.tripId, type, details } });

  req.app.get("io").to(req.params.tripId).emit("booking:added", booking);
  res.status(201).json(booking);
});

router.patch("/:bookingId", async (req, res) => {
  const result = await prisma.booking.updateMany({
    where: { id: req.params.bookingId, tripId: req.params.tripId },
    data: {
      ...(req.body.type && { type: req.body.type }),
      ...(req.body.details && { details: req.body.details }),
    },
  });
  if (result.count === 0) return res.status(404).json({ error: "Booking not found in this trip" });

  const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId } });

  req.app.get("io").to(req.params.tripId).emit("booking:updated", booking);
  res.json(booking);
});

router.delete("/:bookingId", async (req, res) => {
  const result = await prisma.booking.deleteMany({
    where: { id: req.params.bookingId, tripId: req.params.tripId },
  });
  if (result.count === 0) return res.status(404).json({ error: "Booking not found in this trip" });

  req.app.get("io").to(req.params.tripId).emit("booking:deleted", { bookingId: req.params.bookingId });
  res.status(204).send();
});

export default router;