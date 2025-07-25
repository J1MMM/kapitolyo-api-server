const Officer = require("../model/Officer");
const { logSystemAction } = require("./LogsController");

const resetOfficerApprehension = async () => {
  try {
    await Officer.updateMany({}, { $set: { apprehended: 0 } });
  } catch (error) {
    console.log(error);
  }
};

const getAllOfficer = async (req, res) => {
  try {
    const result = await Officer.find().sort({
      apprehended: "desc",
    });
    if (!result) return res.status(204).json({ message: "No Officers found" });

    // result = await Promise.all(
    //   result.map(async (officer) => {
    //     officer.fullname = `${officer.firstname} ${
    //       officer?.mi && officer?.mi + " "
    //     }${officer.lastname}`;
    //     await officer.save();
    //     return officer;
    //   })
    // );
    await logSystemAction({
      action: "FETCH_OFFICERS",
      performedBy: req?.fullname || "unknown",
      target: "LIST OF OFFICERS",
      module: "Officer",
      ip: req.headers["x-forwarded-for"] || "unknown",
    });
    res.json(result);
  } catch (error) {
    await logSystemAction({
      action: "FETCH_OFFICERS",
      performedBy: req?.fullname || "unknown",
      target: "LIST OF OFFICERS",
      module: "Officer",
      ip: req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    res.status(400).json({ message: error.message });
  }
};

const addOfficer = async (req, res) => {
  const officerDetails = req.body;
  try {
    if (
      !officerDetails.callsign ||
      !officerDetails.firstname ||
      !officerDetails.lastname
    )
      return res.status(400).json({ message: "All fields are required" });

    const newOfficer = await Officer.create({
      callsign: officerDetails.callsign,
      firstname: officerDetails.firstname,
      lastname: officerDetails.lastname,
      mi: officerDetails.mi,
      fullname: `${officerDetails.firstname} ${
        officerDetails.mi && officerDetails.mi + " "
      }${officerDetails.lastname}`,
    });

    await logSystemAction({
      action: "ADD_OFFICER",
      performedBy: req?.fullname || "unknown",
      target: `Officer ID: ${newOfficer._id}`,
      module: "Officer",
      ip: req.headers["x-forwarded-for"] || "unknown",
    });

    res.status(201).json(newOfficer);
  } catch (error) {
    await logSystemAction({
      action: "ADD_OFFICER",
      performedBy: req?.fullname || "unknown",
      target: "new officer",
      module: "Officer",
      ip: req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};

const updateOfficer = async (req, res) => {
  const officerInfo = req.body;
  try {
    if (!officerInfo) return res.sendStatus(400);
    const updatedOfficer = await Officer.findByIdAndUpdate(
      officerInfo._id,
      {
        callsign: officerInfo.callsign,
        firstname: officerInfo.firstname,
        lastname: officerInfo.lastname,
        mi: officerInfo.mi,
        fullname: `${officerInfo.firstname} ${
          officerInfo.mi ? officerInfo.mi + " " : ""
        }${officerInfo.lastname}`, // Corrected the ternary operator
      },
      { new: true }
    );

    await logSystemAction({
      action: "UPDATE_OFFICER",
      performedBy: req?.fullname || "unknown",
      target: `Officer ID: ${officerInfo?._id}` || "unknown",
      module: "Officer",
      ip: req.headers["x-forwarded-for"] || "unknown",
    });
    res.status(201).json(updatedOfficer);
  } catch (error) {
    await logSystemAction({
      action: "UPDATE_OFFICER",
      performedBy: req?.fullname || "unknown",
      target: `Officer ${officerInfo?._id}` || "unknown",
      module: "Officer",
      ip: req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};

const deleteOfficer = async (req, res) => {
  if (!req.body.id) return res.sendStatus(400);
  try {
    await Officer.deleteOne({ _id: req.body.id });
    await logSystemAction({
      action: "DELETE_OFFICER",
      performedBy: req?.fullname || "unknown",
      target: `Officer ID: ${req.body.id}` || "unknown",
      module: "Officer",
      ip: req.headers["x-forwarded-for"] || "unknown",
    });
    res.sendStatus(204);
  } catch (error) {
    await logSystemAction({
      action: "DELETE_OFFICER",
      performedBy: req?.fullname || "unknown",
      target: `Officer ID: ${req.body.id}` || "unknown",
      module: "Officer",
      ip: req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  addOfficer,
  getAllOfficer,
  deleteOfficer,
  updateOfficer,
};
