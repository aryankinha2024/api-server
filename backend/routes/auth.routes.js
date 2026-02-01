import express from "express";
import { login, refreshAccessToken, logout } from "../controllers/auth.controller.js";
import { sendOtp, verifyOtp } from "../controllers/authOtp.controller.js";

const router = express.Router();

// Authentication routes
router.post("/login", login);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logout);

// OTP-based signup routes
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

export default router;
