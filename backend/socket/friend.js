import Friendship from "../model/friend.model.js";

export default function registerFriendHandlers(io, socket, onlineUsers) {
  const userId = socket.userId;

  // SEND FRIEND REQUEST
  socket.on("send-friend-request", async ({ recipientId }) => {
    // Create a record
    const request = await Friendship.create({
      requester: userId,
      recipient: recipientId,
      status: "pending",
    });

    // Notify recipient if online
    const recSocket = onlineUsers.get(recipientId);
    if (recSocket) {
      io.to(recSocket).emit("friend-request-received", {
        requestId: request._id,
        requesterId: userId,
      });
    }
  });

  // ACCEPT FRIEND REQUEST
  socket.on("accept-friend-request", async ({ requestId }) => {
    const friendship = await Friendship.findByIdAndUpdate(
      requestId,
      { status: "accepted" },
      { new: true }
    );

    const { requester, recipient } = friendship;

    // Notify requester
    const requesterSocket = onlineUsers.get(requester);
    if (requesterSocket) {
      io.to(requesterSocket).emit("friend-request-accepted", {
        friendId: recipient,
      });
    }

    // Notify current user
    socket.emit("friend-added", { friendId: requester });
  });
}
