const express = require("express");
const { requireOwner } = require("../middleware/auth");
const {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  addActivity
} = require("../utils/dataManager");

const router = express.Router();

// Get all users (Owner only)
router.get("/", requireOwner, async (req, res) => {
  try {
    const users = await getUsers();
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to get users" });
  }
});

// Get premium users (Owner only)
router.get("/premium", requireOwner, async (req, res) => {
  try {
    const users = await getUsers();
    const premiumUsers = users.filter(user => user.role === "premium");
    res.json({
      success: true,
      users: premiumUsers
    });
  } catch (error) {
    console.error("Get premium users error:", error);
    res.status(500).json({ error: "Failed to get premium users" });
  }
});

// Get admin users (Owner only)
router.get("/admin", requireOwner, async (req, res) => {
  try {
    const users = await getUsers();
    const adminUsers = users.filter(user => user.role === "admin");
    res.json({
      success: true,
      users: adminUsers
    });
  } catch (error) {
    console.error("Get admin users error:", error);
    res.status(500).json({ error: "Failed to get admin users" });
  }
});

// Get user by ID (Owner only)
router.get("/:id", requireOwner, async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// Update user (Owner only)
router.put("/:id", requireOwner, async (req, res) => {
  try {
    const { username, email, role, status } = req.body;
    
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    
    const updatedUser = await updateUser(req.params.id, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Log activity
    await addActivity({
      userId: req.user.id,
      action: "update_user",
      description: `Updated user: ${updatedUser.username}`,
      metadata: { userId: updatedUser._id, changes: Object.keys(updateData) }
    });
    
    res.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete user (Owner only)
router.delete("/:id", requireOwner, async (req, res) => {
  try {
    const user = await deleteUser(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Log activity
    await addActivity({
      userId: req.user.id,
      action: "delete_user",
      description: `Deleted user: ${user.username}`,
      metadata: { userId: user._id }
    });
    
    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Promote user to premium (Owner only)
router.post("/:id/promote", requireOwner, async (req, res) => {
  try {
    const updatedUser = await updateUser(req.params.id, { role: "premium" });
    
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Log activity
    await addActivity({
      userId: req.user.id,
      action: "promote_user",
      description: `Promoted user ${updatedUser.username} to premium`,
      metadata: { userId: updatedUser._id, newRole: "premium" }
    });
    
    res.json({
      success: true,
      message: `User ${updatedUser.username} promoted to premium`,
      user: updatedUser
    });
  } catch (error) {
    console.error("Promote user error:", error);
    res.status(500).json({ error: "Failed to promote user" });
  }
});

// Demote user from premium (Owner only)
router.post("/:id/demote", requireOwner, async (req, res) => {
  try {
    const updatedUser = await updateUser(req.params.id, { role: "user" });
    
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Log activity
    await addActivity({
      userId: req.user.id,
      action: "demote_user",
      description: `Demoted user ${updatedUser.username} to user`,
      metadata: { userId: updatedUser._id, newRole: "user" }
    });
    
    res.json({
      success: true,
      message: `User ${updatedUser.username} demoted to user`,
      user: updatedUser
    });
  } catch (error) {
    console.error("Demote user error:", error);
    res.status(500).json({ error: "Failed to demote user" });
  }
});

// Ban user (Owner only)
router.post("/:id/ban", requireOwner, async (req, res) => {
  try {
    const updatedUser = await updateUser(req.params.id, { status: "banned" });
    
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Log activity
    await addActivity({
      userId: req.user.id,
      action: "ban_user",
      description: `Banned user: ${updatedUser.username}`,
      metadata: { userId: updatedUser._id, newStatus: "banned" }
    });
    
    res.json({
      success: true,
      message: `User ${updatedUser.username} banned`,
      user: updatedUser
    });
  } catch (error) {
    console.error("Ban user error:", error);
    res.status(500).json({ error: "Failed to ban user" });
  }
});

// Unban user (Owner only)
router.post("/:id/unban", requireOwner, async (req, res) => {
  try {
    const updatedUser = await updateUser(req.params.id, { status: "active" });
    
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Log activity
    await addActivity({
      userId: req.user.id,
      action: "unban_user",
      description: `Unbanned user: ${updatedUser.username}`,
      metadata: { userId: updatedUser._id, newStatus: "active" }
    });
    
    res.json({
      success: true,
      message: `User ${updatedUser.username} unbanned`,
      user: updatedUser
    });
  } catch (error) {
    console.error("Unban user error:", error);
    res.status(500).json({ error: "Failed to unban user" });
  }
});

module.exports = router;

