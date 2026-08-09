import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { askGemini, askGeminiJson } from "../lib/llm.js";

const router = Router({ mergeParams: true });

// --- Itinerary generator ---
router.post("/generate-itinerary", async (req, res) => {
  const { prompt, mode = "fill" } = req.body; // mode: "fill" | "replace"
  if (!prompt?.trim()) return res.status(400).json({ error: "prompt is required" });

  const trip = await prisma.trip.findUnique({ where: { id: req.params.tripId } });
  const totalTripDays =
    Math.round((trip.endDate - trip.startDate) / (1000 * 60 * 60 * 24)) + 1;

  const io = req.app.get("io");
  let existingDays = await prisma.itineraryDay.findMany({
    where: { tripId: req.params.tripId },
    include: { activities: true },
    orderBy: { dayNumber: "asc" },
  });

  if (mode === "replace") {
    for (const day of existingDays) {
      await prisma.activity.deleteMany({ where: { dayId: day.id } });
      await prisma.itineraryDay.delete({ where: { id: day.id } });
      io.to(req.params.tripId).emit("day:deleted", { dayId: day.id });
    }
    existingDays = [];
  }

  const remainingDays = totalTripDays - existingDays.length;
  if (remainingDays <= 0) {
    return res.status(400).json({
      error: `This trip is already fully planned (${totalTripDays} day${totalTripDays > 1 ? "s" : ""}). Delete a day first, or use "Regenerate entire itinerary" to start over.`,
    });
  }

  const schema = {
    type: "object",
    properties: {
      days: {
        type: "array",
        items: {
          type: "object",
          properties: {
            activities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  time: { type: "string", nullable: true },
                  location: { type: "string", nullable: true },
                  notes: { type: "string", nullable: true },
                },
                required: ["title"],
              },
            },
          },
          required: ["activities"],
        },
      },
    },
    required: ["days"],
  };

  const existingSummary = existingDays.length
    ? existingDays
        .map((d) => `Day ${d.dayNumber}: ${d.activities.map((a) => a.title).join(", ") || "(empty)"}`)
        .join("\n")
    : "No days planned yet.";

  const system = `You are a trip itinerary planner. Keep activity titles short and concrete, 3-5 activities per day. Generate EXACTLY ${remainingDays} new day(s) — no more, no fewer. Do not repeat or restate the already-planned days below; they are context only, so your new days flow naturally after them without duplicating activities.`;

  const userPrompt = `Trip destination: ${trip.destination}Total trip length: ${totalTripDays} daysAlready planned:${existingSummary}Generate the remaining ${remainingDays} day(s) based on this request: ${prompt}`;

  let parsed;
  try {
    parsed = await askGeminiJson({ system, prompt: userPrompt, schema, maxTokens: 4000 });
  } catch (err) {
    return res.status(502).json({ error: "Failed to generate itinerary: " + err.message });
  }

  if (!Array.isArray(parsed.days)) {
    return res.status(502).json({ error: "AI response was not in the expected format" });
  }

  // Hard cap regardless of what the model returned — this is the actual fix for the range bug
  const daysToCreate = parsed.days.slice(0, remainingDays);
  const startingDayNumber = existingDays.length + 1;
  const createdDays = [];

  for (const [i, d] of daysToCreate.entries()) {
    const day = await prisma.itineraryDay.create({
      data: { tripId: req.params.tripId, dayNumber: startingDayNumber + i },
    });

    const activities = [];
    for (const a of d.activities ?? []) {
      const activity = await prisma.activity.create({
        data: {
          dayId: day.id,
          title: a.title,
          time: a.time ?? null,
          location: a.location ?? null,
          notes: a.notes ?? null,
          addedById: req.userId,
        },
      });
      activities.push(activity);
    }

    const fullDay = { ...day, activities };
    io.to(req.params.tripId).emit("day:added", fullDay);
    createdDays.push(fullDay);
  }

  res.status(201).json({ days: createdDays });
});

// --- Chat summarizer ---
router.post("/summarize-chat", async (req, res) => {
  const messages = await prisma.chatMessage.findMany({
    where: { tripId: req.params.tripId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  if (messages.length === 0) return res.json({ summary: [] });

  const transcript = messages.map((m) => `${m.user.name}: ${m.content}`).join("\n");

  const schema = {
    type: "object",
    properties: {
      summary: { type: "array", items: { type: "string" } },
    },
    required: ["summary"],
  };

  const system = `You summarize group trip-planning chat into a short list of concrete decisions the group reached. If no clear decisions were made, return an empty array. Keep each item under 15 words.`;

  try {
    const parsed = await askGeminiJson({ system, prompt: transcript, schema, maxTokens: 500 });
    res.json({ summary: parsed.summary ?? [] });
  } catch (err) {
    res.status(502).json({ error: "Failed to summarize chat: " + err.message });
  }
});

// --- Local recommendations chatbot ---
router.post("/recommendations", async (req, res) => {
  const { question } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: "question is required" });

  const trip = await prisma.trip.findUnique({ where: { id: req.params.tripId } });

  const system = `You are a knowledgeable local travel guide for ${trip.destination}. Answer the traveler's question concisely and practically, in 2-4 sentences. Plain text only, no markdown.`;

  try {
    const answer = await askGemini({ system, prompt: question, maxTokens: 400 });
    res.json({ answer: answer.trim() });
  } catch (err) {
    res.status(502).json({ error: "Failed to get recommendation: " + err.message });
  }
});

// --- Route order suggestion (advisory only) ---
router.post("/optimize-route/:dayId", async (req, res) => {
  const day = await prisma.itineraryDay.findFirst({
    where: { id: req.params.dayId, tripId: req.params.tripId },
    include: { activities: true },
  });
  if (!day) return res.status(404).json({ error: "Day not found in this trip" });
  if (day.activities.length < 2) {
    return res.json({ suggestedOrder: day.activities.map((a) => a.title) });
  }

  const list = day.activities
    .map((a, i) => `${i + 1}. ${a.title}${a.location ? ` (${a.location})` : ""}`)
    .join("\n");

  const schema = {
    type: "object",
    properties: { order: { type: "array", items: { type: "string" } } },
    required: ["order"],
  };

  const system = `Suggest a sensible visiting order for a day's activities to minimize backtracking, based on typical geography and logical flow (morning activities first, meals at reasonable times). Use the exact activity titles given, just reordered.`;

  try {
    const parsed = await askGeminiJson({ system, prompt: list, schema, maxTokens: 400 });
    res.json({ suggestedOrder: parsed.order ?? [] });
  } catch (err) {
    res.status(502).json({ error: "Failed to suggest order: " + err.message });
  }
});

export default router;