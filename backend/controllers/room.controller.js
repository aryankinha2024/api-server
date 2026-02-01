import Room from "../model/rooms.model.js";
import createOrGetRoom from "../utils/createOrGetRoom.js";

export const getMyRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const rooms = await Room.find({
      participants: userId
    })
      .populate("participants", "name email avatar status lastSeen")
      .sort({ "lastMessage.createdAt": -1 });

    // Add unread count for current user to each room
    const roomsWithUnread = rooms.map(room => {
      const roomObj = room.toObject();
      roomObj.unreadCount = room.unreadCount?.get(userId) || 0;
      return roomObj;
    });

    return res.status(200).json({
      success: true,
      rooms: roomsWithUnread
    });

  } catch (err) {
    console.error("Get Rooms Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get or create a room with a specific friend
export const getOrCreateRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    if (!friendId) {
      return res.status(400).json({ success: false, message: "Friend ID is required" });
    }

    // Use the existing utility function to get or create room
    const room = await createOrGetRoom(userId, friendId);

    // Populate the participants
    const populatedRoom = await Room.findById(room._id)
      .populate("participants", "name email avatar status lastSeen");

    return res.status(200).json({
      success: true,
      room: populatedRoom
    });

  } catch (err) {
    console.error("Get/Create Room Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Mark messages in a room as read
export const markRoomAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;

    // Reset unread count for this user in this room
    await Room.findByIdAndUpdate(roomId, {
      [`unreadCount.${userId}`]: 0
    });

    return res.status(200).json({
      success: true,
      message: "Room marked as read"
    });

  } catch (err) {
    console.error("Mark Room as Read Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
