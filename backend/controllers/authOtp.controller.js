import bcrypt from "bcryptjs";
import SignupOtp from "../model/signupOtp.model.js";
import User from "../model/user.model.js";
import { sendOTPEmail } from "../utils/sendEmail.js";
import { generateTokens } from "./auth.controller.js";

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


export const sendOtp = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    const exists = await User.findOne({ $or: [{ email }, { name }] });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    await SignupOtp.deleteMany({ email });

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await SignupOtp.create({
      name,
      email,
      hashedPassword,
      otp: hashedOtp,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    // Send OTP email with improved error handling
    console.log("Sending OTP email to:", email);
    const emailResult = await sendOTPEmail(email, otp);
    
    if (!emailResult.success) {
      await SignupOtp.deleteOne({ email });
      console.error("Failed to send OTP email:", emailResult.error);
      return res.status(500).json({ 
        message: "Failed to send OTP email. Please try again.",
        error: emailResult.error 
      });
    }

    console.log("OTP sent successfully to:", email);
    res.json({ message: "OTP sent to your email" });

  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const signupData = await SignupOtp.findOne({ email });
    if (!signupData) {
      return res.status(400).json({ message: "OTP expired or not requested" });
    }

    if (signupData.expiresAt < Date.now()) {
      await SignupOtp.deleteOne({ email });
      return res.status(400).json({ message: "OTP expired" });
    }

    const isMatch = await bcrypt.compare(otp, signupData.otp);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const newUser = await User.create({
      name: signupData.name,
      email: signupData.email,
      password: signupData.hashedPassword
    });

    const { accessToken, refreshToken } = generateTokens(newUser._id);

    newUser.refreshToken = refreshToken;
    await newUser.save();

    await SignupOtp.deleteOne({ email });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      accessToken,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "OTP verification failed" });
  }
};