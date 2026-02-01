import { Server } from "socket.io";
import socketAuth from "./middleware/auth.js";
import registerUserStatusHandlers from "./userStatus.js";
import registerFriendHandlers from "./friend.js";
import registerChatHandlers from "./chat.js";
import Room from "../model/rooms.model.js";

const onlineUsers = new Map();

export default async function socketHandler(server) {
  const io = new Server(server, {
    cors: {
      origin: [process.env.FRONTEND_URL, "http://localhost:5173"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use(socketAuth);

  io.on("connection", async (socket) => {
    // console.log("New socket:", socket.id);
    const userId = socket.userId;

    const rooms = await Room.find({
      participants: userId,
    }).select("_id");

    rooms.forEach((room) => {
      socket.join(room._id.toString());
    });

    registerUserStatusHandlers(io, socket, onlineUsers);

    registerFriendHandlers(io, socket, onlineUsers);

    registerChatHandlers(io, socket);
  });

  return { io, onlineUsers };
}
