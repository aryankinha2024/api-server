import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    _id: { type: String },

    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    lastMessage: {
      text: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: Date,
    },

    // Map to store unread count per user: { userId: count }
    unreadCount: {
      type: Map,
      of: Number,
      default: {}
    },
  },
  { timestamps: true }
);
const Room = mongoose.model("Room", roomSchema);

export default Room;
