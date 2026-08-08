import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { computeSettlements } from "../lib/settleUp.js";

const router = Router({ mergeParams: true });

async function getBalancesForTrip(tripId) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { members: { include: { user: { select: { id: true, name: true } } } } },
  });
  const expenses = await prisma.expense.findMany({ where: { tripId }, include: { splits: true } });

  const totals = {};
  trip.members.forEach((m) => (totals[m.userId] = 0));

  for (const exp of expenses) {
    totals[exp.paidById] = (totals[exp.paidById] ?? 0) + Number(exp.amount);
    for (const split of exp.splits) {
      totals[split.userId] = (totals[split.userId] ?? 0) - Number(split.amount);
    }
  }

  const balances = trip.members.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    balance: Math.round((totals[m.userId] ?? 0) * 100) / 100,
  }));

  return { balances, settlements: computeSettlements(balances) };
}

router.get("/", async (req, res) => {
  const expenses = await prisma.expense.findMany({
    where: { tripId: req.params.tripId },
    include: { splits: true, paidBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(expenses);
});

router.get("/balances", async (req, res) => {
  res.json(await getBalancesForTrip(req.params.tripId));
});

router.post("/", async (req, res) => {
  const { amount, category, description, splitAmong, splits: customSplits } = req.body;
  const total = Number(amount);
  if (!total || total <= 0) return res.status(400).json({ error: "amount must be greater than 0" });

  let splitData;

  if (Array.isArray(customSplits) && customSplits.length > 0) {
    const sum = customSplits.reduce((s, c) => s + Number(c.amount), 0);
    if (Math.abs(sum - total) > 0.01) {
      return res.status(400).json({ error: "split amounts must add up to the total" });
    }
    splitData = customSplits.map((c) => ({ userId: c.userId, amount: Number(c.amount) }));
  } else {
    const members = await prisma.tripMember.findMany({ where: { tripId: req.params.tripId } });
    const participantIds = splitAmong?.length ? splitAmong : members.map((m) => m.userId);
    const share = Math.floor((total / participantIds.length) * 100) / 100;

    splitData = participantIds.map((userId, i) => ({
      userId,
      amount:
        i === participantIds.length - 1
          ? Math.round((total - share * (participantIds.length - 1)) * 100) / 100 // remainder goes to last split, avoids rounding drift
          : share,
    }));
  }

  const expense = await prisma.expense.create({
    data: {
      tripId: req.params.tripId,
      paidById: req.userId,
      amount: total,
      category,
      description,
      splits: { create: splitData },
    },
    include: { splits: true, paidBy: { select: { id: true, name: true } } },
  });

  const summary = await getBalancesForTrip(req.params.tripId);
  const io = req.app.get("io");
  io.to(req.params.tripId).emit("expense:added", expense);
  io.to(req.params.tripId).emit("balances:updated", summary);

  res.status(201).json(expense);
});

router.delete("/:expenseId", async (req, res) => {
  const expense = await prisma.expense.findFirst({
    where: { id: req.params.expenseId, tripId: req.params.tripId },
  });
  if (!expense) return res.status(404).json({ error: "Expense not found in this trip" });

  await prisma.expenseSplit.deleteMany({ where: { expenseId: expense.id } });
  await prisma.expense.delete({ where: { id: expense.id } });

  const summary = await getBalancesForTrip(req.params.tripId);
  const io = req.app.get("io");
  io.to(req.params.tripId).emit("expense:deleted", { expenseId: expense.id });
  io.to(req.params.tripId).emit("balances:updated", summary);

  res.status(204).send();
});

export default router;