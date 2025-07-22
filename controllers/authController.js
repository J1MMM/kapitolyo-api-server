const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../model/User");
const { logSystemAction } = require("./LogsController");

const handleLogin = async (req, res) => {
  const { email, pwd } = req.body;

  if (!email || !pwd)
    return res.status(400).json({ message: "Email and Password are required" });

  try {
    const foundUser = await User.findOne({
      email: email,
      archive: false,
    }).exec();
    if (!foundUser) {
      await logSystemAction({
        action: "USER_LOGIN",
        performedBy: email || "unknown",
        target: "AUTHENTICATION",
        module: "Login",
        ip: req.ip || req.headers.origin || "unknown",
        status: "FAILED",
      });
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    const match = await bcrypt.compare(pwd, foundUser.password);
    if (!match) {
      await logSystemAction({
        action: "USER_LOGIN",
        performedBy: email || "unknown",
        target: "AUTHENTICATION",
        module: "Login",
        ip: req.ip || req.headers.origin || "unknown",
        status: "FAILED",
      });
      return res.status(401).json({ message: "Incorrect email or password" });
    }

    const roles = Object.values(foundUser.roles).filter(Boolean);
    const fullname = `${foundUser.firstname} ${foundUser.lastname}`;
    const id = foundUser._id;

    const accessToken = jwt.sign(
      {
        UserInfo: {
          id: id,
          email: foundUser.email,
          roles: roles,
          fullname: fullname,
        },
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      { email: foundUser.email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    foundUser.refreshToken = refreshToken;
    await foundUser.save();

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: isProduction ? "None" : "Lax", // Adjust SameSite attribute for dev
      secure: isProduction, // Secure cookie only in production
    });

    await logSystemAction({
      action: "USER_LOGIN",
      performedBy: email || "unknown",
      target: "AUTHENTICATION",
      module: "Login",
      ip: req.ip || req.headers.origin || "unknown",
    });

    res.json({ roles, accessToken, fullname });
  } catch (error) {
    await logSystemAction({
      action: "USER_LOGIN",
      performedBy: email || "unknown",
      target: "AUTHENTICATION",
      module: "Login",
      ip: req.ip || req.headers.origin || "unknown",
      status: "FAILED",
    });
    console.error("Login Error: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { handleLogin };
