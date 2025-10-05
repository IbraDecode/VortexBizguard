const mongoose = require("mongoose");

const BugSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  type: {
    type: String,
    enum: ["crash", "freeze", "spam", "custom"],
    required: true,
  },
  target: {
    type: String,
    required: true,
  },
  message: {
    type: String,
  },
  count: {
    type: Number,
    default: 1,
  },
  delay: {
    type: Number,
    default: 1,
  },
  status: {
    type: String,
    enum: ["active", "stopped", "completed", "failed"],
    default: "stopped",
  },
  progress: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Bug", BugSchema);