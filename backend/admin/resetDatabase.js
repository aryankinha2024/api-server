import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "../model/user.model.js";
import Friendship from "../model/friend.model.js";
import Message from "../model/messages.model.js";
import Room from "../model/rooms.model.js";
import connectDB from "../config/db.js";

dotenv.config();

const resetDatabase = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    await connectDB(MONGO_URI);
    console.log("📡 Connected to DB");

    // 1️⃣ Delete all USERS
    await User.deleteMany({});
    console.log("🗑️ Deleted: All users");

    // 2️⃣ Delete all FRIENDSHIPS
    await Friendship.deleteMany({});
    console.log("🗑️ Deleted: All friendships");

    // 3️⃣ Delete all MESSAGES
    await Message.deleteMany({});
    console.log("🗑️ Deleted: All messages");

    // 4️⃣ Delete all ROOMS
    await Room.deleteMany({});
    console.log("🗑️ Deleted: All rooms");

    // 5️⃣ Remove lastMessage (if any rooms somehow survived)
    await Room.updateMany({}, { $unset: { lastMessage: "" } });
    console.log("🗑️ Cleared: lastMessage fields");

    // Close DB
    await mongoose.connection.close();
    console.log("🔌 DB connection closed");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    process.exit(1);
  }
};

resetDatabase();
