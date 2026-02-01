import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import connectDB from "./config/db.js";
import http from "http";
import socketHandler from "./socket/index.js";
import friendRoutes from "./routes/friend.routes.js";
import messagesRoutes from "./routes/messages.routes.js";
import roomsRoutes from "./routes/room.routes.js";
import profileRoutes from "./routes/profile.routes.js";


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(
  cors({
    origin: [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:5000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

// Serve static frontend files in production
const frontendPath = path.join(__dirname, "../backend/public");
app.use(express.static(frontendPath));

async function startServer() {
  try {

    await connectDB(MONGO_URI);

    const { io, onlineUsers } = await socketHandler(server);
    app.set("io", io);
    app.set("onlineUsers", onlineUsers);

    console.log("Socket.io initialized successfully");

    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.io ready on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

app.get('/', (req, res) => {
  res.send("Server is alive");
});

// Routes - registered BEFORE server starts
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/profile", profileRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is healthy' });
});

// Serve SPA fallback for all routes not matching API or static files
app.use((req, res) => {
  const indexPath = path.join(frontendPath, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(500).send("Error serving frontend");
    }
  });
});

startServer();
