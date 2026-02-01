import express from "express";
import authenticate from "../middleware/authenticate.js";
import upload from "../middleware/multer.js";
import { updateProfile, updateAvatar, changePassword } from "../controllers/profile.controller.js";

const router = express.Router();

router.put("/update", authenticate, updateProfile);
router.put("/avatar", authenticate, upload.single("avatar"), updateAvatar);
router.put("/change-password", authenticate, changePassword);

export default router;
