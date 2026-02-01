import Room from "../model/rooms.model.js";
import Message from "../model/messages.model.js";
import Friendship from "../model/friend.model.js";

export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required" });
    }

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Verify user is a participant of the room
    if (!room.participants.includes(userId)) {
      return res.status(403).json({ message: "You are not a participant of this room" });
    }

    // Fetch messages for the room, populate sender info
    const messages = await Message.find({ roomId })
      .populate("sender", "name email avatar")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      messages,
      count: messages.length
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to fetch messages" 
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { roomId, text, attachment } = req.body;

    if (!roomId || (!text && !attachment)) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Determine the other participant
    const receiverId = room.participants.find(id => id.toString() !== senderId);

    // Check if users are still friends
    const friendship = await Friendship.findOne({
      status: "accepted",
      $or: [
        { requester: senderId, recipient: receiverId },
        { requester: receiverId, recipient: senderId }
      ]
    });

    if (!friendship) {
      return res.status(403).json({ message: "You are not friends anymore" });
    }

    // Create message
    const message = await Message.create({
      roomId,
      sender: senderId,
      text,
      attachment: attachment || "",
      readBy: [senderId],
    });

    // Populate sender info for the response
    await message.populate("sender", "name email avatar");

    // Update room's lastMessage
    room.lastMessage = {
      text: text || "📎 Attachment",
      sender: senderId,
      createdAt: new Date(),
    };
    await room.save();

    // SEND REAL-TIME MESSAGE
    const io = req.app.get("io");
    if (io) {
      const messageData = {
        ...message.toObject(),
        roomLastMessage: room.lastMessage,
      };
      io.to(roomId).emit("new-message", messageData);
    } else {
      console.error("Socket.io instance not found on app");
    }

    return res.status(201).json({ 
      success: true,
      message: "Message sent", 
      data: message 
    });

  } catch (err) {
    console.error("Send Message Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};


export const unsendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only sender can unsend
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Soft delete: change message text
    message.text = "This message was unsent";
    message.attachment = "";
    message.isUnsent = true;

    await message.save();

    // Update Room last message if needed
    const room = await Room.findById(message.roomId);
    if (room?.lastMessage?.createdAt?.getTime() === message.createdAt.getTime()) {

      const lastMsg = await Message.find({ roomId: message.roomId })
        .sort({ createdAt: -1 })
        .limit(1);

      room.lastMessage = lastMsg[0]
        ? {
            text: lastMsg[0].isUnsent 
              ? "This message was unsent"
              : lastMsg[0].text || "📎 Attachment",
            sender: lastMsg[0].sender,
            createdAt: lastMsg[0].createdAt
          }
        : null;

      await room.save();
    }

    // Send via socket
    const io = req.app.get("io");
    if (io) {
      io.to(message.roomId).emit("message:unsent", {
        messageId: message._id,
        newText: "This message was unsent"
      });
    }

    return res.json({ success: true, message: "Message unsent" });

  } catch (err) {
    console.error("Unsend Message Error:", err);
    res.status(500).json({ message: "Server error while unsending message" });
  }
};
