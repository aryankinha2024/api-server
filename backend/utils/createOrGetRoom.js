import Room from "../model/rooms.model.js";

export default async function createOrGetRoom(user1, user2) {
  // Generate consistent roomId by sorting user IDs
  const roomId = [user1, user2].sort().join("_");

  // Check if room already exists
  let room = await Room.findById(roomId);

  // If exists, return
  if (room) return room;

  // Create new room with custom _id
  room = await Room.create({
    _id: roomId,
    participants: [user1, user2],
    lastMessage: null
  });

  return room;
}
