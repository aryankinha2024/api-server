import express from "express";
import { getMessages, sendMessage, unsendMessage } from "../controllers/messages.controller.js";
import authenticate from "../middleware/authenticate.js";

const router = express.Router();

router.get("/:roomId", authenticate, getMessages);

router.post("/", authenticate, sendMessage);

router.put("/unsend/:messageId", authenticate, unsendMessage);


export default router;