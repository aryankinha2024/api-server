import jwt from "jsonwebtoken";
import User from "../model/user.model.js";

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    // Handle JWT errors gracefully
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired - please login again" });
    }
    
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token format" });
    }
    
    console.error("Auth error:", err.message);
    res.status(401).json({ message: "Authentication failed" });
  }
};

export default authenticate;
