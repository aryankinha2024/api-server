import jwt from "jsonwebtoken";

export default function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Authentication token missing"));
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {

      return next(new Error("Token expired - please login again"));
    }
    
    if (err.name === "JsonWebTokenError") {
      return next(new Error("Invalid token format"));
    }
  
    console.error("Socket auth error:", err.message);
    return next(new Error("Authentication failed"));
  }

}
