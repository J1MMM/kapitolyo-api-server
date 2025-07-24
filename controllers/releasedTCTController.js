const Ticket = require("../model/Ticket");
const { logSystemAction } = require("./LogsController");

const getAllTickets = async (req, res) => {
  try {
    const result = await Ticket.find().sort({
      _id: "desc",
    });
    if (!result) return res.status(204).json({ message: "No Data found" });
    await logSystemAction({
      action: "FETCH_TICKETS",
      performedBy: req?.fullname || "unknown",
      target: "All Tickets" || "unknown",
      module: "Released TCT",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });
    res.json(result);
  } catch (error) {
    await logSystemAction({
      action: "FETCH_TICKETS",
      performedBy: req?.fullname || "unknown",
      target: "All Tickets" || "unknown",
      module: "Released TCT",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};

const addTicket = async (req, res) => {
  try {
    const ticketDetails = req.body;
    if (!ticketDetails)
      return res.status(400).json({ message: "All fields are required" });

    const result = await Ticket.create(ticketDetails);
    await logSystemAction({
      action: "ADD_TICKET",
      performedBy: req?.fullname || "unknown",
      target: `Ticket ID: ${result._id}` || "unknown",
      module: "Released TCT",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });
    res.status(201).json(result);
  } catch (error) {
    await logSystemAction({
      action: "ADD_TICKET",
      performedBy: req?.fullname || "unknown",
      target: `Ticket ID: ${result._id}` || "unknown",
      module: "Released TCT",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};

const updateTicket = async (req, res) => {
  const ticketDetails = req.body;
  try {
    if (!ticketDetails) return res.sendStatus(400);
    const result = await Ticket.findByIdAndUpdate(
      ticketDetails._id,
      ticketDetails,
      { new: true }
    );
    await logSystemAction({
      action: "UPDATE_TICKET",
      performedBy: req?.fullname || "unknown",
      target: `Ticket ID: ${ticketDetails._id}` || "unknown",
      module: "Released TCT",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });
    res.status(201).json(result);
  } catch (error) {
    await logSystemAction({
      action: "UPDATE_TICKET",
      performedBy: req?.fullname || "unknown",
      target: `Ticket ID: ${ticketDetails._id}` || "unknown",
      module: "Released TCT",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getAllTickets,
  addTicket,
  updateTicket,
};
