import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const votes = await prisma.vote.findMany({
    where: { tripId: req.params.tripId },
    orderBy: { createdAt: "desc" },
  });
  res.json(votes);
});

router.post("/", async (req, res) => {
  const { question, options } = req.body;
  if (!question || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: "question and at least 2 options are required" });
  }

  const vote = await prisma.vote.create({
    data: { tripId: req.params.tripId, question, options, votes: {} },
  });

  req.app.get("io").to(req.params.tripId).emit("vote:created", vote);
  res.status(201).json(vote);
});

export default router;