import {
  getMessages,
  getUsersForSidebar,
  sendMessage,
} from "../controllers/message";
import express from "express";
import { Server } from "socket.io";
import { protectRoute } from "../middleware/auth.middleware";
import { singleUpload } from "../middleware/multer";

const router = express.Router();
const setupMessageRoutes = (io: Server) => {
  router.get("/users", protectRoute, (req, res) => {
    getUsersForSidebar(req, res, io);
  });
  router.get("/:id", protectRoute, (req, res) => {
    getMessages(req, res, io);
  });

  router.post("/send/:id", protectRoute, singleUpload, (req, res) => {
    sendMessage(req, res, io);
  });
  return router;
};
export default setupMessageRoutes;
