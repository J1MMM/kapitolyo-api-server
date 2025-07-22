const Log = require("../model/Log");

const logSystemAction = async ({
  action,
  performedBy,
  target,
  module,
  ip,
  status = "SUCCESS",
}) => {
  try {
    await Log.create({
      action,
      performedBy,
      target,
      module,
      ip,
      status,
    });
    console.log(`System log created: ${action} by ${performedBy} on ${target}`);
  } catch (error) {
    console.error("Failed to save system log:", error);
  }
};

const getLogs = async (req, res) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 }).exec();

    const formattedLogs = logs.map((log) => ({
      ...log.toObject(),
      id: log._id.toString(), // add `id` from `_id`
    }));

    res.json(formattedLogs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getLogs, logSystemAction };
