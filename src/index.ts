import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cloudinary from "cloudinary";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import connectDB from "./db/config";
import { Server } from "socket.io";
import http from "http";
import setupRoutes from "./routes/user";
import setupPostRoutes from "./routes/posts";
import setupMessageRoutes from "./routes/message";
import setupCommentRoutes from "./routes/comment";
import setupReactionRoutes from "./routes/reaction";

// Initialize environment variables
dotenv.config();

// Create Express app
const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_SECRET || "",
});

// Connect to the database
connectDB();

// Define a simple health check route
app.get("/", (req: Request, res: Response) => {
  res.send("Hello World with TypeScript!");
});

// Initialize the HTTP server and Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

// Middleware to set up routes
app.use("/api/v1/user", setupRoutes(io));
app.use("/api/v1/messages", setupMessageRoutes(io));
app.use("/api/v1/post", setupPostRoutes(io));
app.use("/api/v1/comments", setupCommentRoutes(io));
app.use("/api/v1/reaction", setupReactionRoutes(io));

// Map to store connected users and their socket IDs
export const connectedUsers = new Map<string, string>();

const userSocketMap: Record<string, string> = {};

// Utility function to get a user's socket ID
export function getReceiverSocketId(userId: string): string | undefined {
  return userSocketMap[userId];
}

// Handle Socket.IO events
io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId as string | undefined;
  if (userId) userSocketMap[userId] = socket.id;

  // Emit the list of online users to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("register", (userId: string) => {
    connectedUsers.set(userId, socket.id);
    console.log(`User registered: ${userId} with socket ID: ${socket.id}`);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);

    // Remove the user's socket ID from `userSocketMap`
    for (const [key, value] of Object.entries(userSocketMap)) {
      if (value === socket.id) {
        delete userSocketMap[key];
        break;
      }
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Remove the user from `connectedUsers`
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`User disconnected: ${userId}`);
        break;
      }
    }
  });
});

// Start the server
const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
