import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { prisma } from "./lib/prisma.js";
import { verifyToken } from "./lib/jwt.js";
import authRoutes from "./routes/auth.js";
import tripRoutes from "./routes/trips.js";
const activeCalls = new Map(); // tripId -> Map(socketId -> { userId, name })

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

  // --- WebRTC call signaling ---

  socket.on("call:join", async (tripId, callback) => {
    const member = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: socket.userId } },
      include: { user: { select: { name: true } } },
    });
    if (!member) return callback?.({ ok: false, error: "Not a member of this trip" });

    if (!activeCalls.has(tripId)) activeCalls.set(tripId, new Map());
    const call = activeCalls.get(tripId);

    const existingPeers = [...call.entries()].map(([socketId, info]) => ({ socketId, ...info }));

    call.set(socket.id, { userId: socket.userId, name: member.user.name });
    socket.data.callTripId = tripId;

    socket.to(tripId).emit("call:peer-joined", {
      socketId: socket.id,
      userId: socket.userId,
      name: member.user.name,
    });

    callback?.({ ok: true, existingPeers });
  });

  socket.on("webrtc:signal", ({ to, signal }) => {
    io.to(to).emit("webrtc:signal", { from: socket.id, signal });
  });

  socket.on("call:leave", (tripId) => {
    const call = activeCalls.get(tripId);
    if (call) {
      call.delete(socket.id);
      if (call.size === 0) activeCalls.delete(tripId);
    }
    socket.to(tripId).emit("call:peer-left", { socketId: socket.id });
    socket.data.callTripId = null;
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected:", socket.id);
    
    const tripId = socket.data.callTripId;
    if (tripId) {
      const call = activeCalls.get(tripId);
      if (call) {
        call.delete(socket.id);
        if (call.size === 0) activeCalls.delete(tripId);
      }
      socket.to(tripId).emit("call:peer-left", { socketId: socket.id });
    }
  });
});

const PORT = process.env.PORT ?? 4000;
httpServer.listen(PORT, () => {
  console.log(`TripSync server listening on http://localhost:${PORT}`);
});