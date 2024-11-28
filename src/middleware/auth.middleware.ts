import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import User from "../models/user";

interface AuthRequest extends Request {
  user?: any;
}

export const protectRoute = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.jwt;

    if (!token) {
      res.status(401).json({ message: "Unauthorized - No Token Provided" });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

    if (!decoded) {
      res.status(401).json({ message: "Unauthorized - Invalid Token" });
      return;
    }
    if (typeof decoded === "string" || !("userId" in decoded)) {
      res.status(401).json({
        success: false,
        message: "Unauthorized user ....",
      });
      return;
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      throw new Error("User not found");
    }

    req.user = user;

    next();
  } catch (error) {
    console.log("Error in protectRoute middleware: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
