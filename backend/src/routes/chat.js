import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const messages = await prisma.chatMessage.findMany({
    where: { tripId: req.params.tripId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  res.json(messages);
});

export default router;