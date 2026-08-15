import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { geocodeCity, getDailyForecast } from "../lib/weather.js";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const trip = await prisma.trip.findUnique({ where: { id: req.params.tripId } });

  try {
    const { latitude, longitude } = await geocodeCity(trip.destination);
    const forecast = await getDailyForecast({
      latitude,
      longitude,
      startDate: trip.startDate.toISOString().slice(0, 10),
      endDate: trip.endDate.toISOString().slice(0, 10),
    });

    // Map each forecast date to a dayNumber based on the trip's start date,
    // so the frontend can match it against ItineraryDay.dayNumber directly.
    const startMs = new Date(trip.startDate).setHours(0, 0, 0, 0);
    const byDayNumber = forecast.map((f) => ({
      ...f,
      dayNumber: Math.round((new Date(f.date).setHours(0, 0, 0, 0) - startMs) / 86400000) + 1,
    }));

    res.json({ available: true, forecast: byDayNumber });
  } catch (err) {
    // Not a hard failure — just means we can't show weather yet (common for far-future trips)
    res.json({ available: false, message: err.message });
  }
});

export default router;