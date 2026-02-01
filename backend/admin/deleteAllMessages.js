import mongoose from "mongoose";
import dotenv from "dotenv";
import Message from "../model/messages.model.js";
import Room from "../model/rooms.model.js";
import connectDB from "../config/db.js";

dotenv.config();

const deleteAllMessages = async () => {
  try {

    const MONGO_URI = process.env.MONGO_URI;
    await connectDB(MONGO_URI);
    console.log("📡 Connected to DB");


    await Message.deleteMany({});
    console.log("🗑️ Deleted: All messages");

    await Room.updateMany({}, { $unset: { lastMessage: "" } });
    console.log("🗑️ Deleted: lastMessage from every room");

    await mongoose.connection.close();
    console.log("🔌 DB connection closed");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error deleting messages & lastMessage:", error);
    process.exit(1);
  }
};

deleteAllMessages();
