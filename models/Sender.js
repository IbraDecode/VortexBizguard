const mongoose = require("mongoose");

const SenderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ["connected", "disconnected", "connecting", "error"],
    default: "disconnected",
  },
  qrCode: {
    type: String,
  },
  sessionData: {
    type: Object,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
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

module.exports = mongoose.model("Sender", SenderSchema);

