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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = JSON.parse(req.query.filter) || {};
    let filterQuery = {};

    if (filter.items && Array.isArray(filter.items)) {
      filter.items.forEach((item) => {
        const { field, value, operator } = item;

        switch (operator) {
          case "contains":
            filterQuery[field] = { $regex: RegExp(value, "i") };
            break;
          case "equals":
            filterQuery[field] = value;
            break;
          case "startsWith":
            filterQuery[field] = { $regex: RegExp(`^${value}`, "i") };
            break;
          case "endsWith":
            filterQuery[field] = { $regex: RegExp(`${value}$`, "i") };
            break;
          case "isEmpty":
            filterQuery["$or"] = [{ [field]: null }, { [field]: "" }];
            break;
          case "isNotEmpty":
            filterQuery[field] = { $ne: null, $ne: "" };
            break;
          case "isAnyOf":
            filterQuery[field] = { $in: value };
            break;
        }
      });
    }

    const [logs, totalLogs] = await Promise.all([
      Log.find(filterQuery)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Log.countDocuments(filterQuery).exec(),
    ]);

    const formattedLogs = logs.map((log) => ({
      ...log.toObject(),
      id: log._id.toString(),
    }));

    res.json({
      logs: formattedLogs,
      total: totalLogs,
      page,
      totalPages: Math.ceil(totalLogs / limit),
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getLogs, logSystemAction };
