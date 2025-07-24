const User = require("../model/User");
const { logSystemAction } = require("./LogsController");

const handleLogout = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204); // No JWT cookie

  const refreshToken = cookies.jwt;

  try {
    const foundUser = await User.findOne({ refreshToken }).exec();

    // If no user found, still clear cookie and log as failed logout
    if (!foundUser) {
      await logSystemAction({
        action: "USER_LOGOUT",
        performedBy: `Unknown (token: ${refreshToken})`,
        target: "LOGOUT",
        module: "Logout",
        ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
        status: "FAILED",
      });

      res.clearCookie("jwt", {
        httpOnly: true,
        sameSite: "None",
        secure: true,
      });
      return res.sendStatus(204);
    }

    // Invalidate the refresh token
    foundUser.refreshToken = "";
    await foundUser.save();

    // Log successful logout
    await logSystemAction({
      action: "USER_LOGOUT",
      performedBy: `${foundUser.firstname} ${foundUser.lastname}` || "unknown",
      target: "LOGOUT",
      module: "Logout",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "SUCCESS",
    });

    // Clear cookie
    res.clearCookie("jwt", { httpOnly: true, sameSite: "None", secure: true });
    res.sendStatus(204);
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { handleLogout };
