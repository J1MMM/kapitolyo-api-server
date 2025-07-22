const bcrypt = require("bcrypt");
const User = require("../model/User");
const ROLES_LIST = require("../config/roles_list");
const { logSystemAction } = require("./LogsController");

const getAllUsers = async (req, res) => {
  try {
    const result = await User.find();
    if (!result) return res.status(204).json({ message: "No students found" });
    await logSystemAction({
      action: "FETCH_USERS",
      performedBy: req?.fullname || "unknown",
      target: "LIST OF USERS",
      module: "User Management",
      ip: req.ip || req.headers.origin || "unknown",
    });
    res.json(result);
  } catch (error) {
    await logSystemAction({
      action: "FETCH_USERS",
      performedBy: req?.fullname || "unknown",
      target: "LIST OF USERS",
      module: "User Management",
      ip: req.ip || req.headers.origin || "unknown",
      status: "FAILED",
    });
    res.status(400).json({ message: error.message });
  }
};
const checkEmailDuplication = async (req, res) => {
  try {
    const result = await User.find({ email: req.body.email });
    res.json(result);
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
};

const createUser = async (req, res) => {
  const accountDetails = req.body;
  if (!accountDetails)
    return res.status(400).json({ message: "All fields are required" });

  const duplicate = await User.findOne({ email: accountDetails.email }).exec();
  if (duplicate)
    return res
      .status(409)
      .json({ message: "This Email Address is Already in use" }); //confilict

  try {
    const hashedPwd = await bcrypt.hash(accountDetails.pwd, 10);

    const result = await User.create({
      email: accountDetails.email,
      password: hashedPwd,
      firstname: accountDetails.fname,
      lastname: accountDetails.lname,
      middlename: accountDetails.mname,
      gender: accountDetails.gender,
      address: accountDetails.address,
      contactNo: accountDetails.contactNo,
      roles: { [accountDetails.role]: ROLES_LIST[accountDetails.role] },
    });

    await logSystemAction({
      action: "CREATE_USER",
      performedBy: req?.fullname || "unknown",
      target: "New User",
      module: "User Management",
      ip: req.ip || req.headers.origin || "unknown",
    });

    res.status(201).json({
      success: `New user ${accountDetails.fname} has been created successfully!`,
      result,
    });
  } catch (error) {
    await logSystemAction({
      action: "CREATE_USER",
      performedBy: req?.fullname || "unknown",
      target: "New User",
      module: "User Management",
      ip: req.ip || req.headers.origin || "unknown",
      status: "FAILED",
    });
    res.status(400).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  if (!req.body?.id)
    return res.status(400).json({ message: "ID are required" });

  try {
    const user = await User.findOne({ _id: req.body.id }).exec();
    let pwdMatch = false;

    if (req?.body?.password) {
      pwdMatch = await bcrypt.compare(req.body.password, user.password);
    } else {
      pwdMatch = true;
    }

    const duplicate = await User.findOne({ email: req.body.email }).exec();
    if (duplicate && duplicate._id != req.body.id)
      return res.status(409).json({ message: "Email address already in use" });

    if (req?.body?.firstname) user.firstname = req.body.firstname;
    if (req?.body?.lastname) user.lastname = req.body.lastname;
    if (req?.body?.middlename) user.middlename = req.body.middlename;
    if (req?.body?.gender) user.gender = req.body.gender;
    if (req?.body?.address) user.address = req.body.address;
    if (req?.body?.contactNo) user.contactNo = req.body.contactNo;
    if (req?.body?.middlename?.trim() === "") {
      user.middlename = "";
    }
    if (req?.body?.email) user.email = req.body.email;
    if (req?.body?.password)
      user.password = await bcrypt.hash(req.body.password, 10);
    if (req?.body?.role)
      user.roles = { [req.body.role]: ROLES_LIST[req.body.role] };

    const result = await user.save();

    await logSystemAction({
      action: "UPDATE_USER",
      performedBy: req?.fullname || "unknown",
      target: `User ID: ${req.body.id}` || "unknown",
      module: "User Management",
      ip: req.ip || req.headers.origin || "unknown",
    });
    res.json({ success: "User updated successfully!", result });
  } catch (error) {
    await logSystemAction({
      action: "UPDATE_USER",
      performedBy: req?.fullname || "unknown",
      target: `User ID: ${req.body.id}` || "unknown",
      module: "User Management",
      ip: req.ip || req.headers.origin || "unknown",
      status: "FAILED",
    });
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  const { idsToDelete } = req.body;
  if (!idsToDelete) return res.sendStatus(400);

  try {
    await User.deleteMany({ _id: { $in: idsToDelete } });
    const result = await User.find();
    await logSystemAction({
      action: "DELETE_USER",
      performedBy: req?.fullname || "unknown",
      target: `User ID: ${idsToDelete}` || "unknown",
      module: "User Management",
      ip: req.ip || req.headers.origin || "unknown",
    });
    res.json(result);
  } catch (error) {
    await logSystemAction({
      action: "DELETE_USER",
      performedBy: req?.fullname || "unknown",
      target: `User ID: ${idsToDelete}` || "unknown",
      module: "User Management",
      ip: req.ip || req.headers.origin || "unknown",
      status: "FAILED",
    });
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};

const archiveUser = async (req, res) => {
  const { idsToDelete: selectedIDs, toAchive } = req.body;
  if (!selectedIDs || !req.id)
    return res.status(400).json({ message: "id's are required" });

  const updateOperation = {
    $set: {
      archive: toAchive ? true : false,
    },
  };

  try {
    await User.updateMany({ _id: { $in: selectedIDs } }, updateOperation);
    const users = await User.find();

    await logSystemAction({
      action: "ARCHIVE_USER",
      performedBy: req?.fullname || "unknown",
      target: `User ID: ${selectedIDs}` || "unknown",
      module: "User Management",
      ip: req.ip || req.headers.origin || "unknown",
    });

    res.json(users);
  } catch (error) {
    await logSystemAction({
      action: "ARCHIVE_USER",
      performedBy: req?.fullname || "unknown",
      target: `User ID: ${selectedIDs}` || "unknown",
      module: "User Management",
      ip: req.ip || req.headers.origin || "unknown",
      status: "FAILED",
    });
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
};

const getUser = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.sendStatus(400);

  try {
    const user = await User.findOne({ _id: id });
    if (!user) return res.sendStatus(204);

    await logSystemAction({
      action: "GET_USER",
      performedBy: req?.fullname || "unknown",
      target: `User ID: ${id}` || "unknown",
      module: "User Management",
      ip: req.ip || req.headers.origin || "unknown",
    });
    res.json(user);
  } catch (err) {
    await logSystemAction({
      action: "GET_USER",
      performedBy: req?.fullname || "unknown",
      target: `User ID: ${id}` || "unknown",
      module: "User Management",
      ip: req.ip || req.headers.origin || "unknown",
      status: "FAILED",
    });
    console.error(err);
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUser,
  archiveUser,
  checkEmailDuplication,
};
