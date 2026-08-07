import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { prisma } from "./lib/prisma.js";
import { verifyToken } from "./lib/jwt.js";
import authRoutes from "./routes/auth.js";
import tripRoutes from "./routes/trips.js";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" },
});

// Any route handler can reach `io` via req.app.get("io") to broadcast after a REST mutation
app.set("io", io);

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);

// Every socket connection must present a valid JWT before anything else works
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Missing auth token"));
  try {
    socket.userId = verifyToken(token).userId;
    next();
  } catch {
    next(new Error("Invalid auth token"));
  }
});

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id, "user:", socket.userId);

  // Client must explicitly join a trip room before it'll receive that trip's events
  socket.on("trip:join", async (tripId, callback) => {
    try {
      const member = await prisma.tripMember.findUnique({
        where: { tripId_userId: { tripId, userId: socket.userId } },
      });
      if (!member) return callback?.({ ok: false, error: "Not a member of this trip" });

      socket.join(tripId);
      callback?.({ ok: true });
    } catch {
      callback?.({ ok: false, error: "Failed to join trip" });
    }
  });

  socket.on("chat:send", async ({ tripId, content }) => {
    if (!content?.trim()) return;

    const member = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: socket.userId } },
    });
    if (!member) return;

    const message = await prisma.chatMessage.create({
      data: { tripId, userId: socket.userId, content: content.trim() },
      include: { user: { select: { id: true, name: true } } },
    });
    io.to(tripId).emit("chat:new", message);
  });

  socket.on("vote:cast", async ({ tripId, voteId, optionIndex }) => {
    const member = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: socket.userId } },
    });
    if (!member) return;

    const vote = await prisma.vote.findFirst({ where: { id: voteId, tripId } });
    if (!vote) return;

    const votes = { ...(vote.votes ?? {}), [socket.userId]: optionIndex };
    const updated = await prisma.vote.update({ where: { id: voteId }, data: { votes } });
    io.to(tripId).emit("vote:updated", updated);
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT ?? 4000;
httpServer.listen(PORT, () => {
  console.log(`TripSync server listening on http://localhost:${PORT}`);
});