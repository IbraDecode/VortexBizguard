const express = require("express");
const { requireOwner } = require("../middleware/auth");
const {
  getSenders,
  getSenderById,
  createSender,
  updateSender,
  deleteSender,
  addActivity
} = require("../utils/dataManager");
const {
  connectToWhatsApp,
  requestPairingCode,
  getActiveSessions,
  disconnectSession
} = require("../utils/whatsappManager");

const router = express.Router();

// Apply owner requirement to all routes
router.use(requireOwner);

// Get all senders
router.get("/", async (req, res) => {
  try {
    const senders = await getSenders();
    const activeSessions = getActiveSessions();
    
    const sendersWithStatus = senders.map(sender => ({
      id: sender._id,
      name: sender.name,
      phoneNumber: sender.phoneNumber,
      status: sender.status,
      lastActivity: sender.lastActivity,
      createdAt: sender.createdAt,
      createdBy: sender.createdBy,
      isActive: activeSessions.includes(sender.phoneNumber)
    }));
    
    res.json({
      success: true,
      senders: sendersWithStatus
    });
  } catch (error) {
    console.error("Get senders error:", error);
    res.status(500).json({ error: "Failed to get senders" });
  }
});

// Get specific sender
router.get("/:id", async (req, res) => {
  try {
    const sender = await getSenderById(req.params.id);
    
    if (!sender) {
      return res.status(404).json({ error: "Sender not found" });
    }
    
    const activeSessions = getActiveSessions();
    
    res.json({
      success: true,
      sender: {
        id: sender._id,
        name: sender.name,
        phoneNumber: sender.phoneNumber,
        status: sender.status,
        qrCode: sender.qrCode,
        lastActivity: sender.lastActivity,
        createdAt: sender.createdAt,
        createdBy: sender.createdBy,
        isActive: activeSessions.includes(sender.phoneNumber)
      }
    });
  } catch (error) {
    console.error("Get sender error:", error);
    res.status(500).json({ error: "Failed to get sender" });
  }
});

// Add new sender
router.post("/", async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    
    if (!name || !phoneNumber) {
      return res.status(400).json({ error: "Name and phone number are required" });
    }
    
    // Check if phone number already exists
    const existingSenders = await getSenders();
    const existingSender = existingSenders.find(s => s.phoneNumber === phoneNumber);
    
    if (existingSender) {
      return res.status(400).json({ error: "Phone number already exists" });
    }
    
    const senderData = {
      name,
      phoneNumber,
      status: "disconnected",
      createdBy: req.user.id
    };
    
    const sender = await createSender(senderData);
    
    // Log activity
    await addActivity({
      userId: req.user.id,
      action: "create_sender",
      description: `Added new sender: ${name} (${phoneNumber})`,
      metadata: { senderId: sender._id, phoneNumber }
    });
    
    res.status(201).json({
      success: true,
      message: "Sender added successfully",
      sender: {
        id: sender._id,
        name: sender.name,
        phoneNumber: sender.phoneNumber,
        status: sender.status,
        createdAt: sender.createdAt
      }
    });
  } catch (error) {
    console.error("Create sender error:", error);
    res.status(500).json({ error: "Failed to create sender" });
  }
});

// Update sender
router.put("/:id", async (req, res) => {
  try {
    const sender = await getSenderById(req.params.id);
    
    if (!sender) {
      return res.status(404).json({ error: "Sender not found" });
    }
    
    const updateData = {};
    const allowedFields = ["name", "phoneNumber", "status"];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    // If phone number is being updated, check for duplicates
    if (updateData.phoneNumber) {
      const existingSenders = await getSenders();
      const existingSender = existingSenders.find(s => 
        s.phoneNumber === updateData.phoneNumber && 
        s._id.toString() !== req.params.id
      );
      
      if (existingSender) {
        return res.status(400).json({ error: "Phone number already exists" });
      }
    }
    
    const updatedSender = await updateSender(req.params.id, updateData);
    
    // Log activity
    await addActivity({
      userId: req.user.id,
      action: "update_sender",
      description: `Updated sender: ${updatedSender.name}`,
      metadata: { 
        senderId: updatedSender._id, 
        changes: Object.keys(updateData) 
      }
    });
    
    res.json({
      success: true,
      message: "Sender updated successfully",
      sender: {
        id: updatedSender._id,
        name: updatedSender.name,
        phoneNumber: updatedSender.phoneNumber,
        status: updatedSender.status,
        lastActivity: updatedSender.lastActivity
      }
    });
  } catch (error) {
    console.error("Update sender error:", error);
    res.status(500).json({ error: "Failed to update sender" });
  }
});

// Delete sender
router.delete("/:id", async (req, res) => {
  try {
    const sender = await getSenderById(req.params.id);
    
    if (!sender) {
      return res.status(404).json({ error: "Sender not found" });
    }
    
    // Disconnect session if active
    try {
      await disconnectSession(sender.phoneNumber);
    } catch (disconnectError) {
      console.log("Session disconnect error (may not be connected):", disconnectError.message);
    }
    
    await deleteSender(req.params.id);
    
    // Log activity
    await addActivity({
      userId: req.user.id,
      action: "delete_sender",
      description: `Deleted sender: ${sender.name} (${sender.phoneNumber})`,
      metadata: { 
        senderId: sender._id,
        phoneNumber: sender.phoneNumber
      }
    });
    
    res.json({
      success: true,
      message: "Sender deleted successfully"
    });
  } catch (error) {
    console.error("Delete sender error:", error);
    res.status(500).json({ error: "Failed to delete sender" });
  }
});

// Connect sender to WhatsApp
router.post("/:id/connect", async (req, res) => {
  try {
    const sender = await getSenderById(req.params.id);
    
    if (!sender) {
      return res.status(404).json({ error: "Sender not found" });
    }
    
    // Update sender status to connecting
    await updateSender(req.params.id, { 
      status: "connecting",
      lastActivity: new Date()
    });
    
    try {
      const result = await connectToWhatsApp(sender.phoneNumber);
      
      if (result.success) {
        // Update sender with QR code if provided
        const updateData = { 
          status: "connected",
          lastActivity: new Date()
        };
        
        if (result.qrCode) {
          updateData.qrCode = result.qrCode;
        }
        
        await updateSender(req.params.id, updateData);
        
        // Log activity
        await addActivity({
          userId: req.user.id,
          action: "connect_sender",
          description: `Connected sender: ${sender.name}`,
          metadata: { senderId: sender._id, phoneNumber: sender.phoneNumber }
        });
        
        res.json({
          success: true,
          message: "Sender connected successfully",
          qrCode: result.qrCode
        });
      } else {
        // Update sender status to error
        await updateSender(req.params.id, { status: "error" });
        
        res.status(500).json({ 
          error: "Failed to connect sender",
          details: result.error 
        });
      }
    } catch (connectError) {
      // Update sender status to error
      await updateSender(req.params.id, { status: "error" });
      
      console.error("WhatsApp connection error:", connectError);
      res.status(500).json({ error: "Failed to connect to WhatsApp" });
    }
  } catch (error) {
    console.error("Connect sender error:", error);
    res.status(500).json({ error: "Failed to connect sender" });
  }
});

// Disconnect sender from WhatsApp
router.post("/:id/disconnect", async (req, res) => {
  try {
    const sender = await getSenderById(req.params.id);
    
    if (!sender) {
      return res.status(404).json({ error: "Sender not found" });
    }
    
    try {
      await disconnectSession(sender.phoneNumber);
      
      // Update sender status
      await updateSender(req.params.id, { 
        status: "disconnected",
        qrCode: null,
        lastActivity: new Date()
      });
      
      // Log activity
      await addActivity({
        userId: req.user.id,
        action: "disconnect_sender",
        description: `Disconnected sender: ${sender.name}`,
        metadata: { senderId: sender._id, phoneNumber: sender.phoneNumber }
      });
      
      res.json({
        success: true,
        message: "Sender disconnected successfully"
      });
    } catch (disconnectError) {
      console.error("WhatsApp disconnection error:", disconnectError);
      res.status(500).json({ error: "Failed to disconnect from WhatsApp" });
    }
  } catch (error) {
    console.error("Disconnect sender error:", error);
    res.status(500).json({ error: "Failed to disconnect sender" });
  }
});

// Request pairing code
router.post("/:id/pairing-code", async (req, res) => {
  try {
    const sender = await getSenderById(req.params.id);
    
    if (!sender) {
      return res.status(404).json({ error: "Sender not found" });
    }
    
    try {
      const pairingCode = await requestPairingCode(sender.phoneNumber);
      
      // Update sender status
      await updateSender(req.params.id, { 
        status: "connecting",
        lastActivity: new Date()
      });
      
      // Log activity
      await addActivity({
        userId: req.user.id,
        action: "request_pairing_code",
        description: `Requested pairing code for sender: ${sender.name}`,
        metadata: { senderId: sender._id, phoneNumber: sender.phoneNumber }
      });
      
      res.json({
        success: true,
        message: "Pairing code generated successfully",
        pairingCode
      });
    } catch (pairingError) {
      console.error("Pairing code error:", pairingError);
      res.status(500).json({ error: "Failed to generate pairing code" });
    }
  } catch (error) {
    console.error("Request pairing code error:", error);
    res.status(500).json({ error: "Failed to request pairing code" });
  }
});

// Get sender status
router.get("/:id/status", async (req, res) => {
  try {
    const sender = await getSenderById(req.params.id);
    
    if (!sender) {
      return res.status(404).json({ error: "Sender not found" });
    }
    
    const activeSessions = getActiveSessions();
    const isActive = activeSessions.includes(sender.phoneNumber);
    
    res.json({
      success: true,
      status: {
        id: sender._id,
        name: sender.name,
        phoneNumber: sender.phoneNumber,
        status: sender.status,
        isActive,
        lastActivity: sender.lastActivity,
        qrCode: sender.qrCode
      }
    });
  } catch (error) {
    console.error("Get sender status error:", error);
    res.status(500).json({ error: "Failed to get sender status" });
  }
});

module.exports = router;

