import User from "../model/user.model.js";

export const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1; 
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments({
      _id: { $ne: currentUserId }
    });

    const users = await User.find(
      { _id: { $ne: currentUserId } },
      { password: 0, refreshToken: 0 }
    )
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      users,
      total: totalUsers,
      page,
      limit,
      totalPages: Math.ceil(totalUsers / limit),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};
