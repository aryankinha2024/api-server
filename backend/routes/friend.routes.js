import express from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  cancelFriendRequest,
  getPendingRequests,
  getSentRequests,
  getFriends,
  getRejectedRequests,
  checkFriendshipStatus
} from "../controllers/friend.controller.js";

import authenticate from "../middleware/authenticate.js";

const router = express.Router();

router.use(authenticate);

router.post("/request", sendFriendRequest);
router.post("/accept", acceptFriendRequest);
router.post("/reject", rejectFriendRequest);
router.post("/remove", removeFriend);
router.post("/cancel", cancelFriendRequest);

router.get("/pending", getPendingRequests);
router.get("/sent", getSentRequests);
router.get("/list", getFriends);
router.get("/rejected", getRejectedRequests);
router.get("/status/:friendId", checkFriendshipStatus);

export default router;
