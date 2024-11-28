import Message from "../models/message";
import User from "../models/user";
import { getReceiverSocketId } from "..";
import { Request, Response } from "express";
import { Server } from "socket.io";
import { getDataUri } from "../utils/features";
import cloudinary from "cloudinary";

export const getUsersForSidebar = async (
  req: Request,
  res: Response,
  io: Server
): Promise<void> => {
  try {
    console.log("req user", req.user);
    if (!req.user) {
      res.status(401).json({ msg: "Unauthorized", success: false });
      return;
    }
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error);
    res
      .status(500)
      .json({ error: "Internal server error from getUsersForSidebar" });
  }
};

export const getMessages = async (
  req: Request,
  res: Response,
  io: Server
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ msg: "Unauthorized", success: false });
      return;
    }
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (
  req: Request,
  res: Response,
  io: Server
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ msg: "Unauthorized", success: false });
      return;
    }
    const { text } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    console.log(text);
    let fileContent = null;
    if (req.file) {
      console.log(req.file);
      const file = getDataUri(req.file);
      if (!file.content) {
        res.status(400).json({
          msg: "No file content provided",
          success: false,
        });
        return;
      }
      fileContent = file.content;
    }

    let imageUrl = {};

    if (fileContent) {
      const cdb = await cloudinary.v2.uploader.upload(fileContent);
      imageUrl = {
        public_id: cdb.public_id,
        url: cdb.secure_url,
      };
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: text || "",
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
