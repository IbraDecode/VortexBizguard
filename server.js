const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const mongoose = require("mongoose");

// Load environment variables
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/auth");
const bugRoutes = require("./routes/bug");
const userRoutes = require("./routes/users");
const senderRoutes = require("./routes/senders");
const dashboardRoutes = require("./routes/dashboard");

// Import middleware
const { authMiddleware } = require("./middleware/auth"); // Ensure authMiddleware is correctly destructured

// Import utilities
const { initializeWhatsApp } = require("./utils/whatsappManager");
const { initializeData } = require("./utils/dataManager");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/assets", express.static(path.join(__dirname, "assets")));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://ibradecode:bacotbacot@vortex-bizguard.7c2jebn.mongodb.net/?retryWrites=true&w=majority&appName=vortex-bizguard";

mongoose.connect(MONGODB_URI)
.then(async () => {
  console.log("✅ MongoDB connected...");
  // Initialize data after MongoDB connection
  await initializeData();
})
.catch((err) => console.error("❌ MongoDB connection error:", err));

// Socket.io connection
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Make io available to routes
app.set("io", io);

// Routes with authentication
app.use("/api/auth", authRoutes);
app.use("/api/bug", authMiddleware, bugRoutes);
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/senders", authMiddleware, senderRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);

// Serve main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 3008;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Vortex Bizguard server running on port ${PORT}`);
  
  // Initialize WhatsApp connections
  initializeWhatsApp(io);
});

module.exports = { app, io };

