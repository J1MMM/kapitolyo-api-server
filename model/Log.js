const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  action: String,
  performedBy: String,
  target: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
  ip: String,
  module: String,
  status: {
    type: String,
    enum: ["SUCCESS", "FAILED", "WARNING"],
    default: "SUCCESS",
  },
});

module.exports = mongoose.model("Log", logSchema);
