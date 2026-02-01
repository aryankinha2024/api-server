import express from "express";
import { getAllUsers } from "../controllers/users.controller.js";
import authenticate  from "../middleware/authenticate.js";

const router = express.Router();

// Get all users (protected route)
router.get("/all", authenticate, getAllUsers);

export default router;
