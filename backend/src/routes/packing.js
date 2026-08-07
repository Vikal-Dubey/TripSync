import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const items = await prisma.packingItem.findMany({
    where: { tripId: req.params.tripId },
    orderBy: { name: "asc" },
  });
  res.json(items);
});

router.post("/", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const item = await prisma.packingItem.create({ data: { tripId: req.params.tripId, name } });
  res.status(201).json(item);
});

router.patch("/:itemId", async (req, res) => {
  const result = await prisma.packingItem.updateMany({
    where: { id: req.params.itemId, tripId: req.params.tripId },
    data: { checkedBy: req.body.checked ? req.userId : null },
  });
  if (result.count === 0) return res.status(404).json({ error: "Item not found in this trip" });

  const item = await prisma.packingItem.findUnique({ where: { id: req.params.itemId } });
  res.json(item);
});

router.delete("/:itemId", async (req, res) => {
  const result = await prisma.packingItem.deleteMany({
    where: { id: req.params.itemId, tripId: req.params.tripId },
  });
  if (result.count === 0) return res.status(404).json({ error: "Item not found in this trip" });
  res.status(204).send();
});

export default router;