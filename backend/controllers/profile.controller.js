import User from "../model/user.model.js";
import { uploadImage } from "../utils/uploadImage.js";
import bcrypt from "bcryptjs";

export const updateAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Upload image to Cloudinary
    const uploadResult = await uploadImage(req.file.path);

    // Save URL to user profile
    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: uploadResult.url },
      { new: true }
    );

    res.json({
      message: "Avatar updated successfully",
      avatarUrl: user.avatar
    });

  } catch (error) {
    console.error("Avatar upload error:", error);
    res.status(500).json({ message: "Avatar upload failed" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    const trimmedName = name.trim();

    // Check if name already exists (exclude current user)
    const existingUser = await User.findOne({ 
      name: trimmedName,
      _id: { $ne: userId } 
    });

    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Update user name
    const user = await User.findByIdAndUpdate(
      userId,
      { name: trimmedName },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });

  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.json({
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
};
