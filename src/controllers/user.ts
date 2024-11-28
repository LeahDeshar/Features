import { Request, RequestHandler, Response } from "express";
import Users from "../models/user";
import { getDataUri } from "../utils/features";
import cloudinary from "cloudinary";
import mongoose, { Types } from "mongoose";
import { generateToken } from "../utils/utils";

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
    file: Express.Multer.File;
  }
}
interface User {
  _id: string;
  email: string;
  password: string;
  followers: [];
  following: [];
  friendRequestsSent: [];
  friendRequestsReceived: [];
  friends: [];
  profilePic?: {
    public_id?: string;
    url?: string;
  };
}
interface RequestWithUser extends Request {
  user: User;
  file: Express.Multer.File;
}

export const registerController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { fullName, email, password } = req.body;

    console.log(req.body);
    if (!fullName || !email || !password) {
      console.log("problem");
      res.status(400).json({
        msg: "Fill all the fields",
        success: false,
      });
    }

    const findEmail = await Users.findOne({ email: email });
    if (findEmail) {
      res.status(400).json({
        msg: "Email already exist",
        success: false,
      });
      return;
    }

    const user = await Users.create({
      fullName,
      email,
      password,
    });

    if (user) {
      // generate jwt token here
      generateToken(user._id.toString(), res);
      await user.save();

      res.status(201).json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({
      msg: "Internal Error (register)",
      success: false,
      error,
    });
  }
};

export const loginController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;

    console.log(email, password);
    // login validation
    if (!email || !password) {
      res.status(400).json({
        msg: "Fill all the fields",
        success: false,
      });
    }
    // check if email exist
    let user = await Users.findOne({ email });
    console.log(user);
    if (!user) {
      res.status(400).json({
        msg: "Email does not exist",
        success: false,
      });
      return;
    }
    // check if password is correct
    const isMatch = await user.isValidPassword(password);
    if (!isMatch) {
      res.status(400).json({
        msg: "Incorrect password",
        success: false,
      });
      return;
    }

    // const token = user.generateJWT();

    // console.log(token);

    const token = generateToken(user._id.toString(), res);
    console.log(token);

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV !== "development",
    });

    res
      .status(200)

      .json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic?.url,
      });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      msg: "Internal Error (login)",
      success: false,
      error,
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const currentUserController = async (
  req: Request,
  res: Response
): Promise<void> => {
  // try {
  //   // console.log("here");
  //   // if (!req.user) {
  //   //   res.status(400).json({
  //   //     msg: "request body not send",
  //   //     success: false,
  //   //   });
  //   //   return;
  //   // }
  //   const user = await Users.findById(req.user);
  //   res.status(200).json({
  //     message: "Fetched user successfully",
  //     success: true,
  //     user,
  //   });
  // } catch (error) {
  //   res.status(500).json({
  //     message: "Unable to get current user",
  //     success: false,
  //     error,
  //   });
  // }

  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllUsersController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(400).json({
        msg: "request body not send",
        success: false,
      });
      return;
    }
    const user = await Users.findById(req.user._id);

    if (!user) {
      res.status(400).json({
        msg: "User not found",
        success: false,
      });
      return;
    }

    const users = await Users.find({ _id: { $ne: req.user._id } }).select(
      "-password"
    );
    // const users = await Users.find({}).select("-password");
    // // send all users except the current itself

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to fetch users",
      error,
    });
  }
};

export const createAvatarController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(400).json({
        msg: "request body not send",
        success: false,
      });
      return;
    }
    const user = await Users.findById(req.user._id);

    if (!user) {
      res.status(400).json({
        msg: "User not found",
        success: false,
      });
      return;
    }
    console.log("Check 1");
    // get the photo from client
    const file = getDataUri(req.file);
    if (!file.content) {
      res.status(400).json({
        msg: "No file content provided",
        success: false,
      });
      return;
    }
    console.log("Check 2");

    if (user.profilePic && user.profilePic.public_id) {
      await cloudinary.v2.uploader.destroy(user.profilePic.public_id);
    }

    // Upload new profile picture to Cloudinary
    const cdb = await cloudinary.v2.uploader.upload(file.content);

    // Update user's profile picture
    user.profilePic = {
      public_id: cdb.public_id,
      url: cdb.secure_url,
    };

    // Save user
    await user.save();

    res.status(200).json({
      msg: "Profile pic updated successfully",
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Internal Error (profile pic update)",
      success: false,
      error,
    });
  }
};

export const followUserController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.params) {
      res.status(400).json({
        msg: "request params not send",
        success: false,
      });
      return;
    }

    if (!req.user) {
      res.status(400).json({
        msg: "request body not send",
        success: false,
      });
      return;
    }
    const userIdToFollow = req.params.id;
    const userIdToFollowObj = new mongoose.Types.ObjectId(userIdToFollow);
    const currentUserId = req.user._id;

    console.log("first", userIdToFollowObj, currentUserId);

    if (!mongoose.Types.ObjectId.isValid(userIdToFollow)) {
      res.status(400).json({ message: "Invalid user ID." });
      return;
    }

    // Check if already following
    const currentUser = await Users.findById(currentUserId);
    console.log("current", currentUser);
    if (currentUser?.following.includes(userIdToFollowObj)) {
      res.status(400).json({ message: "Already following this user." });
      return;
    }

    // Follow the user
    currentUser?.following.push(userIdToFollowObj);
    await currentUser?.save();

    // Update the followed user's followers list
    await Users.findByIdAndUpdate(userIdToFollow, {
      $addToSet: { followers: currentUserId },
    });

    res.status(200).json({
      msg: "User followed successfully",
      success: true,
      currentUser,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Internal Error (follow user)",
      success: false,
      error,
    });
  }
};
export const unfollowUserController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(400).json({
        msg: "request body not send",
        success: false,
      });
      return;
    }
    const userIdToUnfollow = req.params.id;
    const currentUserId = req.user._id;

    await Users.findByIdAndUpdate(currentUserId, {
      $pull: { following: userIdToUnfollow },
    });

    // Remove from followed user's followers list
    await Users.findByIdAndUpdate(userIdToUnfollow, {
      $pull: { followers: currentUserId },
    });

    res.status(200).json({ message: "User unfollowed successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error });
  }
};

export const sendFriendRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(400).json({
        msg: "request body not send",
        success: false,
      });
      return;
    }
    const recipientId = req.params.id;
    const recipientIdObj = new mongoose.Types.ObjectId(recipientId);
    const currentUserId = req.user._id; // Assuming you have user ID in req.user

    // Check if already sent
    const currentUser = await Users.findById(currentUserId);

    if (currentUser?.friendRequestsSent.includes(recipientIdObj)) {
      res.status(400).json({ message: "Friend request already sent." });
    }

    // Send the friend request
    await Users.findByIdAndUpdate(currentUserId, {
      $addToSet: { friendRequestsSent: recipientId },
    });

    await Users.findByIdAndUpdate(recipientId, {
      $addToSet: { friendRequestsReceived: currentUserId },
    });

    res.status(200).json({ message: "Friend request sent successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error });
  }
};

export const acceptFriendRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(400).json({
        msg: "request body not send",
        success: false,
      });
      return;
    }
    const requesterId = req.params.id; // User ID who sent the request
    const currentUserId = req.user._id; // Assuming you have user ID in req.user

    // Remove from friend requests
    await Users.findByIdAndUpdate(currentUserId, {
      $pull: { friendRequestsReceived: requesterId },
    });

    await Users.findByIdAndUpdate(requesterId, {
      $pull: { friendRequestsSent: currentUserId },
      $addToSet: { friends: currentUserId },
    });

    await Users.findByIdAndUpdate(currentUserId, {
      $addToSet: { friends: requesterId },
    });

    res.status(200).json({ message: "Friend request accepted." });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error });
  }
};

export const declineFriendRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(400).json({
        msg: "request body not send",
        success: false,
      });
      return;
    }
    const requesterId = req.params.id;
    const currentUserId = req.user._id; // Assuming you have user ID in req.user

    // Remove from friend requests
    await Users.findByIdAndUpdate(currentUserId, {
      $pull: { friendRequestsReceived: requesterId },
    });

    await Users.findByIdAndUpdate(requesterId, {
      $pull: { friendRequestsSent: currentUserId },
    });

    res.status(200).json({ message: "Friend request declined." });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error });
  }
};
