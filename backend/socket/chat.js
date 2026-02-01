import Room from "../model/rooms.model.js";
import Message from "../model/messages.model.js";

export default function registerChatHandlers(io, socket) {
  const userId = socket.userId;

  socket.on("join-room", async ({ roomId }) => {
    socket.join(roomId);
    // console.log(`User ${userId} joined room ${roomId}`);
  });

  socket.on("send-message", async ({ roomId, text }) => {
    const msg = await Message.create({
      roomId,
      text,
      sender: userId,
    });

    // Get room to find other participants
    const room = await Room.findById(roomId);
    
    // Increment unread count for all participants except sender
    const unreadCountUpdate = {};
    room.participants.forEach((participantId) => {
      const participantIdStr = participantId.toString();
      if (participantIdStr !== userId) {
        const currentCount = room.unreadCount?.get(participantIdStr) || 0;
        unreadCountUpdate[`unreadCount.${participantIdStr}`] = currentCount + 1;
      }
    });

    // Update last message and unread counts in room
    await Room.findByIdAndUpdate(roomId, {
      lastMessage: {
        text,
        sender: userId,
        createdAt: msg.createdAt,
      },
      ...unreadCountUpdate,
    });

    // Broadcast to everyone in that room
    io.to(roomId).emit("receive-message", msg);
  });

  // UNSEND MESSAGE
  socket.on("message:unsend", async ({ messageId, roomId }) => {
    try {
      const message = await Message.findById(messageId);
      
      if (!message || message.sender.toString() !== userId) {
        return;
      }

      // Broadcast to everyone in the room (including sender)
      io.to(roomId).emit("message:unsent", {
        messageId,
        newText: "This message was unsent"
      });
    } catch (err) {
      console.error("Socket unsend error:", err);
    }
  });
}
