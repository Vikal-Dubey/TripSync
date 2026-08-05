import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" },
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

// Phase 0 checkpoint route
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Routes get mounted here as phases progress, e.g.:
// import authRoutes from "./routes/auth.js";
// app.use("/api/auth", authRoutes);

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  // Phase 3 will add: socket.join(tripId), itinerary/vote/chat events

  socket.on("disconnect", () => {
    console.log("socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT ?? 4000;
httpServer.listen(PORT, () => {
  console.log(`TripSync server listening on http://localhost:${PORT}`);
});