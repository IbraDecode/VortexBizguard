const express = require("express");
const moment = require("moment");
const {
  getStats,
  getUsers,
  getActivities,
  getAllSettings
} = require("../utils/dataManager");
const { getActiveSessions } = require("../utils/whatsappManager");

const router = express.Router();

// Get dashboard statistics
router.get("/stats", async (req, res) => {
  try {
    const stats = await getStats();
    const users = await getUsers();
    const activeSessions = getActiveSessions();
    const settings = await getAllSettings();
    
    // Calculate user statistics
    const premiumUsers = users.filter(u => u.role === "premium");
    const adminUsers = users.filter(u => u.role === "admin");
    const activeUsers = users.filter(u => u.status === "active");
    
    // Get recent activities (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentActivities = await getActivities(null, 50);
    const todayActivities = recentActivities.filter(a => 
      new Date(a.createdAt) > yesterday
    );
    
    const dashboardStats = {
      users: {
        total: stats.users,
        active: activeUsers.length,
        premium: premiumUsers.length,
        admin: adminUsers.length
      },
      senders: {
        total: stats.senders,
        active: activeSessions.length
      },
      bugs: {
        total: stats.bugs
      },
      activities: {
        total: stats.activities,
        today: todayActivities.length
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      },
      settings
    };
    
    res.json(dashboardStats);
    
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to get dashboard statistics" });
  }
});

// Get recent activities
router.get("/activities", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const userId = req.query.userId || null;
    
    const activities = await getActivities(userId, limit);
    
    res.json(activities);
    
  } catch (error) {
    console.error("Activities error:", error);
    res.status(500).json({ error: "Failed to get activities" });
  }
});

// Get system information
router.get("/system", async (req, res) => {
  try {
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };
    
    res.json(systemInfo);
    
  } catch (error) {
    console.error("System info error:", error);
    res.status(500).json({ error: "Failed to get system information" });
  }
});

// Get user statistics by role
router.get("/users/stats", async (req, res) => {
  try {
    const users = await getUsers();
    
    const userStats = {
      byRole: {
        user: users.filter(u => u.role === "user").length,
        premium: users.filter(u => u.role === "premium").length,
        admin: users.filter(u => u.role === "admin").length,
        owner: users.filter(u => u.role === "owner").length
      },
      byStatus: {
        active: users.filter(u => u.status === "active").length,
        inactive: users.filter(u => u.status === "inactive").length,
        banned: users.filter(u => u.status === "banned").length
      },
      registrations: {
        today: users.filter(u => {
          const today = new Date();
          const userDate = new Date(u.createdAt);
          return userDate.toDateString() === today.toDateString();
        }).length,
        thisWeek: users.filter(u => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return new Date(u.createdAt) > weekAgo;
        }).length,
        thisMonth: users.filter(u => {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return new Date(u.createdAt) > monthAgo;
        }).length
      }
    };
    
    res.json(userStats);
    
  } catch (error) {
    console.error("User stats error:", error);
    res.status(500).json({ error: "Failed to get user statistics" });
  }
});

module.exports = router;

