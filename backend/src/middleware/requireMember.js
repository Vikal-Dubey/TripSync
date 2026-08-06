import { prisma } from "../lib/prisma.js";

export async function requireMember(req, res, next) {
  const { tripId } = req.params;
  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: req.userId } },
  });

  if (!member) {
    return res.status(403).json({ error: "You're not a member of this trip" });
  }

  req.tripMember = member;
  next();
}