const User = require("../model/User");
const { logSystemAction } = require("./LogsController");

const handleLogout = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204);

  const refreshToken = cookies.jwt;
  const foundUser = await User.findOne({ refreshToken }).exec();
  if (!foundUser) {
    await logSystemAction({
      action: "USER_LOGOUT",
      performedBy: `${foundUser.firstname} ${foundUser.lastname}` || "unknown",
      target: "LOGOUT",
      module: "Logout",
      ip: req.ip || req.headers.origin || "unknown",
      status: "FAILED",
    });
    res.clearCookie("jwt", { httpOnly: true, sameSite: "None", secure: true });
    return res.sendStatus(204);
  }

  //delete refresh token in the database
  foundUser.refreshToken = "";
  const result = await foundUser.save();
  await logSystemAction({
    action: "USER_LOGOUT",
    performedBy: `${foundUser.firstname} ${foundUser.lastname}` || "unknown",
    target: "LOGOUT",
    module: "Logout",
    ip: req.ip || req.headers.origin || "unknown",
  });
  res.clearCookie("jwt", { httpOnly: true, sameSite: "None", secure: true }); //secure: true - only serves on htttps
  res.sendStatus(204);
};

module.exports = { handleLogout };
