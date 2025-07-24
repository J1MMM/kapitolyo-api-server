const Officer = require("../model/Officer");
const ViolationList = require("../model/ViolationList");
const Violation = require("../model/Violation");
const Franchise = require("../model/Franchise");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const { logSystemAction } = require("./LogsController");

dayjs.extend(utc);
dayjs.extend(timezone);

const computeTotalPrice = (array) => {
  return array.reduce((total, obj) => total + obj?.price, 0);
};

function removeOneItemPerMatch(array1, array2) {
  // Iterate over each item in array1
  array1.forEach((item) => {
    // Find the index of the first occurrence of the item in array2
    const index = array2.findIndex((item2) => item2 === item);
    // If a matching item is found, remove it from array2
    if (index !== -1) {
      array2.splice(index, 1);
    }
  });

  // Return the modified array2
  return array2;
}

function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

const getViolationList = async (req, res) => {
  try {
    const result = await ViolationList.find();
    if (!result) return res.status(204).json({ message: "Empty List" });
    await logSystemAction({
      action: "FETCH_VIOLATION_LIST",
      performedBy: req?.fullname || "unknown",
      target: "LIST OF VIOLATION",
      module: "Violation",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });
    res.json(result);
  } catch (error) {
    await logSystemAction({
      action: "FETCH_VIOLATION_LIST",
      performedBy: req?.fullname || "unknown",
      target: "LIST OF VIOLATION",
      module: "Violation",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    res.status(400).json({ message: error.message });
  }
};

const getViolations = async (req, res) => {
  try {
    const result = await Violation.find({ paid: false }).sort({ _id: "desc" });

    if (!result) return res.status(204).json({ message: "Empty List" });
    await logSystemAction({
      action: "FETCH_VIOLATIONS",
      performedBy: req?.fullname || "unknown",
      target: "LIST OF ALL VIOLATIONS",
      module: "Violation",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });
    res.json(result);
  } catch (error) {
    await logSystemAction({
      action: "FETCH_VIOLATIONS",
      performedBy: req?.fullname || "unknown",
      target: "LIST OF ALL VIOLATIONS",
      module: "Violation",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    res.status(400).json({ message: error.message });
  }
};

const addViolator = async (req, res) => {
  const violationDetails = req.body;
  try {
    if (!violationDetails) return res.sendStatus(400);

    const totalPrice = computeTotalPrice(violationDetails?.violation);
    violationDetails.amount = parseInt(totalPrice);

    const newViolator = await Violation.create(violationDetails);

    await Officer.findOneAndUpdate(
      { fullname: violationDetails?.officer },
      {
        $inc: { apprehended: 1 },
      }
    );

    if (violationDetails.franchiseNo) {
      let violations = violationDetails.violation.map((obj) => obj.violation);

      const foundFranchise = await Franchise.findOne({
        MTOP: violationDetails.franchiseNo,
        isArchived: false,
      });

      if (foundFranchise) {
        const containsOthers = violations.find((v) => v == "OTHERS");

        if (containsOthers) {
          violations = violations.map((violation) => {
            if (violation == "OTHERS") {
              return `${violationDetails.others} (OTHERS)` || "OTHERS";
            } else {
              return violation;
            }
          });
        }

        const allViolations = [...foundFranchise.COMPLAINT, ...violations];
        foundFranchise.COMPLAINT = allViolations;
        foundFranchise.save();
      }
    }

    await logSystemAction({
      action: "ADD_VIOLATION",
      performedBy: req?.fullname || "unknown",
      target: `Violation ID: ${newViolator._id}` || "unknown",
      module: "Violation",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });

    res.status(201).json(newViolator);
  } catch (error) {
    await logSystemAction({
      action: "ADD_VIOLATION",
      performedBy: req?.fullname || "unknown",
      target: `Violation Ticket No: ${violationDetails?.ticketNo}` || "unknown",
      module: "Violation",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};

const updateViolation = async (req, res) => {
  try {
    const violationDetails = req.body;
    if (!violationDetails) return res.sendStatus(400);

    const prevViolationDetails = await Violation.findById(violationDetails._id);
    if (!prevViolationDetails) return res.sendStatus(400);

    if (prevViolationDetails.officer != violationDetails?.officer) {
      await Officer.findOneAndUpdate(
        { fullname: violationDetails?.officer },
        { $inc: { apprehended: 1 } }
      );
      await Officer.findOneAndUpdate(
        { fullname: prevViolationDetails.officer },
        { $inc: { apprehended: -1 } }
      );
    }

    const prevFranchise = await Franchise.findOne({
      MTOP: prevViolationDetails.franchiseNo,
      isArchived: false,
    });

    const newFranchise = await Franchise.findOne({
      MTOP: violationDetails.franchiseNo,
      isArchived: false,
    });

    let violations = violationDetails.violation?.map((obj) => obj.violation);
    let prevViolations = prevViolationDetails.violation?.map(
      (obj) => obj.violation
    );

    if (violations?.length > 0) {
      const containsOthers = violations.find((v) => v == "OTHERS");

      if (containsOthers) {
        violations = violations.map((violation) => {
          if (violation == "OTHERS") {
            return `${violationDetails.others} (OTHERS)` || "OTHERS";
          } else {
            return violation;
          }
        });
      }
    }

    if (prevViolations?.length > 0) {
      const containsOthers = prevViolations.find((v) => v == "OTHERS");

      if (containsOthers) {
        prevViolations = prevViolations.map((violation) => {
          if (violation == "OTHERS") {
            return `${prevViolationDetails.others} (OTHERS)` || "OTHERS";
          } else {
            return violation;
          }
        });
      }
    }

    //check if franchises exist sometimes it already on archive
    if (violationDetails?.franchiseNo) {
      // if franchise number is exist
      if (prevViolationDetails.franchiseNo) {
        // if the franchise number of prev violation details is exist
        if (prevViolationDetails.franchiseNo != violationDetails?.franchiseNo) {
          // if franchise number is changed
          prevFranchise.COMPLAINT = removeOneItemPerMatch(
            prevViolations,
            prevFranchise.COMPLAINT
          );
          newFranchise.COMPLAINT = [...newFranchise.COMPLAINT, ...violations];
        } else {
          // if franchiseNo is same as old violationDetails
          const updatedComplaints = removeOneItemPerMatch(
            prevViolations,
            newFranchise.COMPLAINT
          ); // remove old violations from franchise complaints field

          newFranchise.COMPLAINT = [...updatedComplaints, ...violations]; // merge violations to franchise complaints field
        }
      } else {
        // if old violation details have'nt franchise number then new updated had

        newFranchise.COMPLAINT = [...newFranchise.COMPLAINT, ...violations];
      }
    } else {
      // if franchise number is remove
      // if franchise number is remove then the old violationDetails have a franchise number it will remove it the the franchise that has this mtop
      // If there is no franchise number now and the old violationDetails also do not have a franchise number, then no method will be executed.
      if (prevViolationDetails.franchiseNo) {
        console.log(
          "franchise now have not franchise number but old record had"
        );

        prevFranchise.COMPLAINT = removeOneItemPerMatch(
          prevViolations,
          prevFranchise.COMPLAINT
        );
      }
    }

    const totalPrice = computeTotalPrice(violationDetails?.violation);
    violationDetails.amount = parseInt(totalPrice);

    if (newFranchise) await newFranchise.save();
    if (prevFranchise) await prevFranchise.save();

    await prevViolationDetails.set(violationDetails);
    await prevViolationDetails.save();

    await logSystemAction({
      action: "UPDATE_VIOLATION",
      performedBy: req?.fullname || "unknown",
      target: `Violation ID: ${prevViolationDetails._id}` || "unknown",
      module: "Violation",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });

    res.status(201).json(prevViolationDetails);
  } catch (error) {
    await logSystemAction({
      action: "UPDATE_VIOLATION",
      performedBy: req?.fullname || "unknown",
      target: `Violation ID: ${violationDetails._id}` || "unknown",
      module: "Violation",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};

const getViolationsPaid = async (req, res) => {
  try {
    const result = await Violation.find({ paid: true }).sort({ _id: "desc" });

    if (!result) return res.status(204).json({ message: "Empty List" });
    await logSystemAction({
      action: "FETCH_VIOLATIONS_PAID",
      performedBy: req?.fullname || "unknown",
      target: "LIST OF PAID VIOLATIONS",
      module: "Violation",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });
    res.json(result);
  } catch (error) {
    await logSystemAction({
      action: "FETCH_VIOLATIONS_PAID",
      performedBy: req?.fullname || "unknown",
      target: "LIST OF PAID VIOLATIONS",
      module: "Violation",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    res.status(400).json({ message: error.message });
  }
};

const updateViolationPaidStatus = async (req, res) => {
  try {
    const violationDetails = req.body;
    if (!violationDetails) return res.sendStatus(400);
    const datenow = dayjs().tz("Asia/Kuala_Lumpur");

    if (violationDetails.franchiseNo) {
      let violations = violationDetails.violation?.map((obj) => obj.violation);

      if (violations?.length > 0) {
        const containsOthers = violations.find((v) => v == "OTHERS");

        if (containsOthers) {
          violations = violations.map((violation) => {
            if (violation == "OTHERS") {
              return `${violationDetails.others} (OTHERS)` || "OTHERS";
            } else {
              return violation;
            }
          });
        }
      }

      const foundFranchise = await Franchise.findOne({
        MTOP: violationDetails.franchiseNo,
        isArchived: false,
      });

      if (foundFranchise) {
        foundFranchise.PAID_VIOLATIONS = [
          ...foundFranchise.PAID_VIOLATIONS,
          ...violations,
        ];
        await foundFranchise.save();
      }
    }
    const updatedViolation = await Violation.findOneAndUpdate(
      { _id: violationDetails._id, paid: false },
      {
        paid: true,
        or: violationDetails.or,
        ortf: violationDetails.ortf,
        orDate: violationDetails.orDate,
        receiptNo: violationDetails.or,
        datePaid: datenow,
        payor: violationDetails.name,
        remarks: violationDetails.remarks,
        collectingOfficer: violationDetails.collectingOfficer,
      },
      { new: true }
    );
    if (!updatedViolation) return res.sendStatus(400);

    await logSystemAction({
      action: "UPDATE_VIOLATION_PAID_STATUS",
      performedBy: req?.fullname || "unknown",
      target: "Violation ID: " + violationDetails._id || "unknown",
      module: "Violation Paidlist",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });
    res.sendStatus(201);
  } catch (error) {
    await logSystemAction({
      action: "UPDATE_VIOLATION_PAID_STATUS",
      performedBy: req?.fullname || "unknown",
      target: "Violation ID: " + violationDetails._id || "unknown",
      module: "Violation Paidlist",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    res.status(400).json({ message: error.message });
  }
};

function removeDuplicates(array) {
  // Use Set to store unique elements
  const uniqueSet = new Set(array);

  // Convert Set back to array
  const uniqueArray = Array.from(uniqueSet);

  return uniqueArray;
}

const violationsAnalytics = async (req, res) => {
  const dateNow = dayjs().tz("Asia/Kuala_Lumpur");
  const today = dateNow.startOf("day");

  try {
    const totalUnpaid = await Violation.countDocuments({ paid: false });
    const recentlyPaid = await Violation.countDocuments({
      datePaid: { $gte: today },
    });

    const registeredMTOPs = await Violation.aggregate([
      {
        $match: {
          franchiseNo: { $exists: true, $ne: null, $ne: "" }, // Filter out documents where franchiseNo is empty or missing
          paid: false,
        },
      },
      {
        $lookup: {
          from: "franchises",
          localField: "franchiseNo",
          foreignField: "MTOP",
          as: "franchise",
        },
      },
      {
        $match: {
          "franchise.isArchived": false,
          $expr: {
            $in: ["$franchiseNo", "$franchise.MTOP"], // Filter to include only documents where Violation.franchiseNo exists in Franchise.MTOP
          },
        },
      },
      {
        $project: {
          _id: 0,
          franchiseNo: 1, // Include only the Violation.franchiseNo field
        },
      },
    ]);

    const registered = registeredMTOPs.map((v) => v.franchiseNo).length;
    const unregistered = totalUnpaid - registered;

    const registeredPercentage = ((registered / totalUnpaid) * 100).toFixed();
    const unregisteredPercentage = (
      (unregistered / totalUnpaid) *
      100
    ).toFixed();

    // Check if the result is NaN, if so, set it to 0
    const registeredPercentageResult = isNaN(registeredPercentage)
      ? 0
      : registeredPercentage;
    const unregisteredPercentageResult = isNaN(unregisteredPercentage)
      ? 0
      : unregisteredPercentage;

    await logSystemAction({
      action: "VIOLATIONS_ANALYTICS",
      performedBy: req?.fullname || "unknown",
      target: "VIOLATIONS ANALYTICS",
      module: "Dashboard",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });
    res.json({
      registered,
      unregistered,
      registeredPercentage: registeredPercentageResult,
      unregisteredPercentage: unregisteredPercentageResult,
      recentlyPaid,
      pieData: [
        { id: 0, value: registered, label: "Registered", color: "#1A237E" },
        { id: 1, value: unregistered, label: "Unregistered", color: "#ECEDFC" },
      ],
    });
  } catch (error) {
    await logSystemAction({
      action: "VIOLATIONS_ANALYTICS",
      performedBy: req?.fullname || "unknown",
      target: "VIOLATIONS ANALYTICS",
      module: "Dashboard",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getViolationList,
  addViolator,
  getViolations,
  updateViolation,
  getViolationsPaid,
  updateViolationPaidStatus,
  violationsAnalytics,
};
