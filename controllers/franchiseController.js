const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const Franchise = require("../model/Franchise");
const PendingFranchise = require("../model/PendingFranchise");
const { logSystemAction } = require("./LogsController");
// Set the timezone to UTC
dayjs.extend(utc);
dayjs.extend(timezone);

function getMonthName(monthNumber) {
  const monthNames = [
    "Oct", // 0 maps to October
    "Jan", // 1 maps to January
    "Feb", // 2 maps to February
    "Mar", // 3 maps to March
    "Apr", // 4 maps to April
    "May", // 5 maps to May
    "Jun", // 6 maps to June
    "Jul", // 7 maps to July
    "Aug", // 8 maps to August
    "Sept", // 9 maps to September
  ];

  if (monthNumber < 0 || monthNumber > 9) {
    return "Invalid month number";
  }

  return `${monthNames[monthNumber]}`;
}

function getLastDigit(plateNumber) {
  // Iterate from the end of the string to the beginning
  for (let i = plateNumber.length - 1; i >= 0; i--) {
    // Check if the current character is a digit
    if (!isNaN(plateNumber[i]) && plateNumber[i] !== " ") {
      return plateNumber[i];
    }
  }
  // If no digit is found, return an appropriate message or value
  return "No digit found";
}

function isSameDay(date1, date2) {
  // Parse strings to Date objects if inputs are strings
  if (typeof date1 === "string") {
    date1 = new Date(date1);
  }
  if (typeof date2 === "string") {
    date2 = new Date(date2);
  }

  // Check if the dates are on the same day
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function findDuplicateMTOP(arrayOfObjects) {
  const mtopCounts = {}; // Object to store counts of each MTOP

  // Iterate through the array of objects
  arrayOfObjects.forEach((obj) => {
    const mtop = obj.MTOP; // Assuming MTOP property name is 'MTOP'

    // Increment count for the current MTOP
    mtopCounts[mtop] = (mtopCounts[mtop] || 0) + 1;
  });

  // Find MTOPs with counts greater than 1 (indicating duplicates)
  const duplicates = Object.keys(mtopCounts).filter(
    (mtop) => mtopCounts[mtop] > 1
  );

  return duplicates;
}
function getRenewalDate(plateNumber, lastRenewalDate = new Date()) {
  if (!plateNumber || !lastRenewalDate) {
    return null;
  }
  // Extract the last digit from the plate number
  const lastDigit = plateNumber.match(/\d(?=\D*$)/);
  if (!lastDigit) {
    return null;
  }

  // Map last digit to corresponding month (1-based index)
  const monthMap = {
    0: 10, // October
    1: 1, // January
    2: 2, // February
    3: 3, // March
    4: 4, // April
    5: 5, // May
    6: 6, // June
    7: 7, // July
    8: 8, // August
    9: 9, // September
  };

  const month = monthMap[lastDigit[0]];
  const renewalBaseDate = new Date(lastRenewalDate);
  const nextYear = renewalBaseDate.getFullYear() + 1;

  // Create a date for the first day of the next month
  const firstDayOfNextMonth = new Date(nextYear, month, 1);
  // Subtract one day to get the last day of the target month
  const lastDayOfMonth = new Date(firstDayOfNextMonth - 1);

  return lastDayOfMonth;
}

const getAllFranchise = async (req, res) => {
  try {
    // Get the current page and the number of records per page from the query parameters
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const pageSize = parseInt(req.query.pageSize) || 100; // Default to 100 records per page if not provided

    // Calculate the number of records to skip
    const skip = (page - 1) * pageSize;

    // Fetch the data with pagination and sorting
    const rows = await Franchise.find({ isArchived: false })
      .sort({ MTOP: "asc" })
      .skip(skip)
      .limit(pageSize);

    // Count the total number of non-archived records
    const totalRows = await Franchise.countDocuments({ isArchived: false });

    // Send the paginated data along with total record count
    res.json({
      rows,
      totalRows,
      currentPage: page,
      totalPages: Math.ceil(totalRows / pageSize),
    });
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllArchived = async (req, res) => {
  try {
    const rows = await Franchise.find({ isArchived: true }).sort({
      DATE_ARCHIVED: "desc",
    });
    const totalRows = await Franchise.countDocuments();

    await logSystemAction({
      action: "FETCH_ARCHIVED_FRANCHISES",
      performedBy: req?.fullname || "unknown",
      target: "All Archived Franchises",
      module: "Archived Franchise",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });

    res.json({ rows, totalRows });
  } catch (err) {
    await logSystemAction({
      action: "FETCH_ARCHIVED_FRANCHISES",
      performedBy: req?.fullname || "unknown",
      target: "All Archived Franchises",
      module: "Archived Franchise",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.error("Error fetching data:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const archiveFranchise = async (req, res) => {
  const { id } = req.body;
  const datenow = dayjs().tz("Asia/Kuala_Lumpur");
  try {
    const updatedFranchise = await Franchise.findByIdAndUpdate(
      id,
      {
        isArchived: true,
        DATE_ARCHIVED: datenow,
        archivedBy: req?.fullname,
        actionFrom: "revoke",
      },
      { new: true } // To return the updated document
    );

    if (!updatedFranchise) {
      return res.status(404).json({ message: "Franchise not found" });
    }

    await logSystemAction({
      action: "ARCHIVE_FRANCHISE",
      performedBy: req?.fullname || "unknown",
      target: `Franchise ID: ${id}`,
      module: "Franchise",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });

    res.json(updatedFranchise);
  } catch (error) {
    await logSystemAction({
      action: "ARCHIVE_FRANCHISE",
      performedBy: req?.fullname || "unknown",
      target: `Franchise ID: ${id}`,
      module: "Franchise",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.error("Error updating franchise:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllAvailableMTOPs = async (req, res) => {
  try {
    // Find all available MTOP numbers that are currently assigned to franchises
    const usedFranchises = await Franchise.find({
      isArchived: false,
      MTOP: { $gte: 0, $lte: 8500 },
    }).distinct("MTOP");

    const mtopInPending = await PendingFranchise.find({
      isArchived: false,
      MTOP: { $gte: 0, $lte: 8500 },
    }).distinct("MTOP");

    const allUsedMtop = [...mtopInPending, ...usedFranchises];

    // Generate an array containing all MTOP numbers from 0001 to 8500
    const allMTOPs = Array.from({ length: 8500 }, (_, index) =>
      String(index + 1).padStart(4, "0")
    );

    // Find the missing MTOP numbers by filtering out the used MTOP numbers
    const missingMTOPs = allMTOPs.filter((MTOP) => !allUsedMtop.includes(MTOP));
    await logSystemAction({
      action: "FETCH_AVAILABLE_MTOPS",
      performedBy: req?.fullname || "unknown",
      target: "Available MTOPs",
      module: "Dashboard",
      ip: req.headers["x-forwarded-for"] || "unknown",
    });
    // Return the array of missing MTOP numbers as JSON response
    return res.json(missingMTOPs);
  } catch (error) {
    await logSystemAction({
      action: "FETCH_AVAILABLE_MTOPS",
      performedBy: req?.fullname || "unknown",
      target: "Available MTOPs",
      module: "Dashboard",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.error("Error getting missing MTOPs:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const addNewFranchise = async (req, res) => {
  try {
    const franchiseDetails = req.body;
    if (
      !franchiseDetails.mtop ||
      !franchiseDetails.date ||
      !franchiseDetails.fname ||
      !franchiseDetails.lname ||
      !franchiseDetails.address ||
      !franchiseDetails.contact ||
      !franchiseDetails.drivername ||
      !franchiseDetails.driveraddress ||
      !franchiseDetails.make ||
      !franchiseDetails.model ||
      !franchiseDetails.plateno ||
      !franchiseDetails.motorno ||
      !franchiseDetails.or ||
      !franchiseDetails.cr
    ) {
      return res
        .status(400)
        .json({ message: "Important franchise details are required." });
    }
    // Check if a document with the same MTOP already exists
    const existingFranchise = await Franchise.findOne({
      MTOP: franchiseDetails.mtop,
      isArchived: false,
    });

    if (existingFranchise) {
      return res.status(400).json({ message: "MTOP already exists" });
    }
    const datenow = dayjs().tz("Asia/Kuala_Lumpur");
    const dateRenewal = dayjs(franchiseDetails.date).tz("Asia/Kuala_Lumpur");
    const expireDate = datenow.add(1, "year");

    const latestPendingFranchise = await PendingFranchise.find()
      .sort({ refNo: -1 }) // Sort in descending order
      .limit(1);

    let latestRefNo;

    if (latestPendingFranchise.length > 0) {
      // Convert refNo to a number
      latestRefNo = parseInt(latestPendingFranchise[0].refNo) + 1;
    } else {
      latestRefNo = 154687;
    }
    const receiptData = [
      { label: "Mayor's Permit", price: 385.0, displayPrice: "385.00" },
      { label: "Franchise Tax", price: 110.0, displayPrice: "110.00" },
      { label: "Health / S.S.F.", price: 63.8, displayPrice: "63.80" },
      { label: "Sticker - Color Coding", price: 55.0, displayPrice: "55.00" },
      { label: "Docket/Filing", price: 55.0, displayPrice: "27.50/27.50" },
      // { label: "Docket Fee", price: 27.5 },
      // { label: "Filing Fee", price: 27.5 },
      {
        label: "Tin Plate/Registration",
        price: 345.0,
        displayPrice: "330.00/15.00",
      },
      // { label: "Registration Fee", price: 15.0 },
      { label: "Sticker for Garbage", price: 50.0, displayPrice: "50.00" },
      {
        label: "Garbage/Notarial Fee",
        price: 50.0,
        displayPrice: "50.00/0.00",
      },
      // { label: "Notarial Fee", price: 0.0 },
    ];

    const lto_date = getRenewalDate(franchiseDetails.plateno, dateRenewal);

    // Create a new franchise document and save it to the database
    const newFranchise = await PendingFranchise.create({
      MTOP: franchiseDetails.mtop,
      DATE_RENEWAL: dateRenewal,
      FIRSTNAME: franchiseDetails.fname,
      LASTNAME: franchiseDetails.lname,
      MI: franchiseDetails.mi,
      ADDRESS: franchiseDetails.address,
      OWNER_NO: franchiseDetails.contact,
      OWNER_SEX: franchiseDetails.ownerSex,
      DRIVERS_NAME: franchiseDetails.drivername,
      DRIVERS_ADDRESS: franchiseDetails.driveraddress,
      DRIVERS_NO: franchiseDetails.contact2,
      DRIVERS_SEX: franchiseDetails.driverSex,
      DRIVERS_LICENSE_NO: franchiseDetails.driverlicenseno,
      MAKE: franchiseDetails.make,
      MODEL: franchiseDetails.model,
      PLATE_NO: franchiseDetails.plateno,
      MOTOR_NO: franchiseDetails.motorno,
      STROKE: franchiseDetails.stroke,
      CHASSIS_NO: franchiseDetails.chassisno,
      FUEL_DISP: franchiseDetails.fuelDisp,
      OR: franchiseDetails.or,
      CR: franchiseDetails.cr,
      TPL_PROVIDER: franchiseDetails.tplProvider,
      TPL_DATE_1: franchiseDetails.tplDate1,
      TPL_DATE_2: franchiseDetails.tplDate2,
      TYPE_OF_FRANCHISE: franchiseDetails.typeofFranchise,
      KIND_OF_BUSINESS: franchiseDetails.kindofBusiness,
      TODA: franchiseDetails.toda,
      DATE_RELEASE_OF_ST_TP: franchiseDetails.daterelease,
      ROUTE: franchiseDetails.route,
      REMARKS: franchiseDetails.remarks,
      isArchived: false,
      DATE_EXPIRED: expireDate,
      createdAt: datenow,
      refNo: latestRefNo,
      transaction: "New Franchise",
      receiptData: receiptData,
      LTO_RENEWAL_DATE: lto_date,
      processedBy: franchiseDetails?.processedBy,
      collectingOfficer: franchiseDetails?.collectingOfficer,
    });

    await logSystemAction({
      action: "ADD_NEW_FRANCHISE",
      performedBy: req?.fullname || "unknown",
      target: `Franchise ID: ${newFranchise._id}`,
      module: "Franchise",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });

    res.status(201).json(latestRefNo);
  } catch (error) {
    await logSystemAction({
      action: "ADD_NEW_FRANCHISE",
      performedBy: req?.fullname || "unknown",
      target: `Franchise ID: ${req.body?.id}`,
      module: "Franchise",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.error("Error adding new franchise:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// transfer franchise
const handleFranchiseTransfer = async (req, res) => {
  try {
    const franchiseDetails = req.body;
    if (!franchiseDetails) {
      return res
        .status(400)
        .json({ message: "Important franchise details are required." });
    }

    const datenow = dayjs().tz("Asia/Kuala_Lumpur");
    const dateRenewal = dayjs(franchiseDetails.date).tz("Asia/Kuala_Lumpur");
    const expireDate = datenow.add(1, "year");
    let refNo;
    let receiptData = [];
    // generate ref number
    const latestPendingFranchise = await PendingFranchise.find()
      .sort({ refNo: -1 }) // Sort in descending order
      .limit(1);

    if (latestPendingFranchise.length > 0) {
      // Convert refNo to a number
      refNo = parseInt(latestPendingFranchise[0].refNo) + 1;
    } else {
      refNo = 154687;
    }

    if (franchiseDetails.changeOwner) {
      receiptData.push({
        key: receiptData.length,
        label: "CHANGE OF OWNER",
        price: 165.0,
      });
    }

    if (franchiseDetails.changeDriver) {
      receiptData.push({
        key: receiptData.length,
        label: "CHANGE OF DRIVER",
        price: 300.0,
      });
    }

    if (franchiseDetails.changeMotor) {
      receiptData.push({
        key: receiptData.length,
        label: "CHANGE OF MOTOR",
        price: 165.0,
      });
    }

    if (franchiseDetails.changeTODA) {
      receiptData.push({
        key: receiptData.length,
        label: "CHANGE OF TODA",
        price: 165.0,
      });
    }

    // const updatedOldFranchise = await Franchise.findByIdAndUpdate(
    //   franchiseDetails.id,
    //   { isArchived: true, DATE_ARCHIVED: datenow },
    //   { new: true }
    // );

    const foundFranchise = await Franchise.findOne({
      _id: franchiseDetails.id,
      isArchived: false,
    });

    const newFranchise = await PendingFranchise.create({
      receiptData: receiptData,
      refNo: refNo,
      previousVersion: franchiseDetails.id,
      MTOP: franchiseDetails.mtop,
      DATE_RENEWAL: dateRenewal,
      FIRSTNAME: franchiseDetails.fname,
      LASTNAME: franchiseDetails.lname,
      MI: franchiseDetails.mi,
      ADDRESS: franchiseDetails.address,
      OWNER_NO: franchiseDetails.contact,
      OWNER_SEX: franchiseDetails.ownerSex,
      DRIVERS_NAME: franchiseDetails.drivername,
      DRIVERS_ADDRESS: franchiseDetails.driveraddress,
      DRIVERS_NO: franchiseDetails.contact2,
      DRIVERS_SEX: franchiseDetails.driverSex,
      DRIVERS_LICENSE_NO: franchiseDetails.driverlicenseno,
      MAKE: franchiseDetails.make,
      MODEL: franchiseDetails.model,
      PLATE_NO: franchiseDetails.plateno,
      MOTOR_NO: franchiseDetails.motorno,
      STROKE: franchiseDetails.stroke,
      CHASSIS_NO: franchiseDetails.chassisno,
      FUEL_DISP: franchiseDetails.fuelDisp,
      OR: franchiseDetails.or,
      CR: franchiseDetails.cr,
      TPL_PROVIDER: franchiseDetails.tplProvider,
      TPL_DATE_1: franchiseDetails.tplDate1,
      TPL_DATE_2: franchiseDetails.tplDate2,
      TYPE_OF_FRANCHISE: franchiseDetails.typeofFranchise,
      KIND_OF_BUSINESS: franchiseDetails.kindofBusiness,
      TODA: franchiseDetails.toda,
      DATE_RELEASE_OF_ST_TP: franchiseDetails.daterelease,
      ROUTE: franchiseDetails.route,
      REMARKS: franchiseDetails.remarks,
      isArchived: false,
      DATE_EXPIRED: expireDate,
      createdAt: datenow,
      transaction: "Transfer Franchise",
      renewedAt: foundFranchise.renewedAt,
      LTO_RENEWAL_DATE: getRenewalDate(franchiseDetails.plateno, dateRenewal),
      processedBy: franchiseDetails?.processedBy,
      collectingOfficer: franchiseDetails?.collectingOfficer,
      MPreceiptData: franchiseDetails?.MPreceiptData,
      MPpaymentOr: franchiseDetails?.MPpaymentOr,
    });

    await Franchise.findByIdAndUpdate(franchiseDetails.id, {
      pending: true,
      receiptData: receiptData,
      transaction: "Transfer Franchise",
      processedBy: franchiseDetails?.processedBy,
      newOwner: franchiseDetails.newOwner,
      newDriver: franchiseDetails.newDriver,
      newMotor: franchiseDetails.newMotor,
      newToda: franchiseDetails.newToda,
    });

    await logSystemAction({
      action: "TRANSFER_FRANCHISE",
      performedBy: req?.fullname || "unknown",
      target: `Franchise ID: ${newFranchise._id}`,
      module: "Franchise",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });

    res.status(201).json({ refNo, receiptData });
  } catch (error) {
    await logSystemAction({
      action: "TRANSFER_FRANCHISE",
      performedBy: req?.fullname || "unknown",
      target: `Franchise ID: ${req.body?.id}`,
      module: "Franchise",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.error("Error transfering franchise:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const handleFranchiseUpdate = async (req, res) => {
  try {
    const franchiseDetails = req.body;
    if (!franchiseDetails) {
      return res
        .status(400)
        .json({ message: "Important franchise details are required." });
    }

    const dateRenewal = dayjs(franchiseDetails.date).tz("Asia/Kuala_Lumpur");
    let renewdate = dayjs().tz("Asia/Kuala_Lumpur");
    let expireDate = dateRenewal.add(1, "year");

    // get ref number
    const latestPendingFranchise = await PendingFranchise.find()
      .sort({ refNo: -1 }) // Sort in descending order
      .limit(1);

    let refNo;

    if (latestPendingFranchise.length > 0) {
      // Convert refNo to a number
      refNo = parseInt(latestPendingFranchise[0].refNo) + 1;
    } else {
      refNo = 154687;
    }

    let mayors_permit = 385.0;
    let surcharge1 = 0;
    let franchise = 110.0;
    let surcharge2 = 0;
    let interest = 0;
    let health = 63.8;
    let sticker = 55;
    let docket = 27.5;
    let filing = 27.5;
    let garbage = 50.0;
    // //generate receipt data
    // const initialreceiptData = [
    //   { key: "1", label: "Mayor's Permit", price: mayors_permit },
    //   { key: "2", label: "Surcharge", price: surcharge1 },
    //   {
    //     key: "3",
    //     label: "Franchise",
    //     price: franchise,
    //   },
    //   {
    //     key: "4",
    //     label: "Surcharge",
    //     price: surcharge2,
    //   },
    //   { key: "5", label: "Interest", price: interest },
    //   { key: "6", label: "Health / S.S.F.", price: health },
    //   {
    //     key: "7",
    //     label: "Sticker / Docket Feee",
    //     price: sticker + docket,
    //     displayPrice: `${sticker.toLocaleString("en-PH", {
    //       style: "currency",
    //       currency: "PHP",
    //     })}/${docket.toLocaleString("en-PH", {
    //       style: "currency",
    //       currency: "PHP",
    //     })}`,
    //   },
    //   {
    //     key: "11",
    //     label: "Filing/Garbage/Notarial",
    //     price: filing + garbage,
    //     displayPrice: `${filing.toLocaleString("en-PH", {
    //       style: "currency",
    //       currency: "PHP",
    //     })}/${garbage.toLocaleString("en-PH", {
    //       style: "currency",
    //       currency: "PHP",
    //     })}`,
    //   },
    // ];
    // Get the current date and time
    let monthsPassed = undefined;

    // const franchiseTax = 110.0;
    // const surcharge = franchiseTax * 0.25;
    // const interest = (franchiseTax + surcharge) * 0.02;

    const foundFranchise = await Franchise.findOne({
      _id: franchiseDetails.id,
      isArchived: false,
    });
    // console.log(foundFranchise);

    const dateRenew = dayjs(franchiseDetails?.date).tz("Asia/Kuala_Lumpur");
    const lto_date = getRenewalDate(
      franchiseDetails?.plateno,
      foundFranchise?.DATE_RENEWAL
    );
    // Get the expiration date from foundFranchise (assuming DATE_EXPIRED is the property)
    const expirationDate = dayjs(lto_date).tz("Asia/Kuala_Lumpur");

    const dateNow = dayjs().tz("Asia/Kuala_Lumpur"); // Current date in the specified timezone
    const lastRenewalDate = dayjs(foundFranchise.DATE_RENEWAL).tz(
      "Asia/Kuala_Lumpur"
    ); // Last renewal date in the same timezone

    // Extract only the year
    const currentYear = dateNow.year();
    const lastRenewalYear = lastRenewalDate.year(); //2021
    console.log(expirationDate.format());
    console.log(dateRenewal.format());

    // Check if the expiration date is in the past
    if (expirationDate.isBefore(dateRenew)) {
      monthsPassed = dateRenew.diff(expirationDate, "month") + 1;
    }
    console.log(monthsPassed);

    if (monthsPassed < 12 && monthsPassed >= 1) {
      surcharge1 = mayors_permit * 0.5;
      surcharge2 = franchise * 0.25;
      interest = surcharge2 * 0.2 * monthsPassed;
    }
    // console.log(currentYear);
    // console.log(lastRenewalYear);
    // console.log(lastRenewalYear - currentYear);

    if (
      //2025-2021 4 >= 3
      currentYear - lastRenewalYear >= 3 ||
      lastRenewalYear + 2 == currentYear
    ) {
      let months_1year_passed = monthsPassed - 12;
      mayors_permit *= 2;
      health *= 2;
      sticker *= 2;
      docket *= 2;
      filing *= 2;
      garbage *= 2;

      surcharge1 = mayors_permit * 0.5;
      surcharge2 = franchise * 0.25;

      interest = surcharge2 * 0.1 * 12;

      if (months_1year_passed >= 1) {
        interest += surcharge2 * 0.2 * monthsPassed;
      }

      franchise *= 2;
      surcharge2 = franchise * 0.125;
    }

    const receiptData = [
      { key: "1", label: "Mayor's Permit", price: mayors_permit },
      { key: "2", label: "Surcharge", price: surcharge1 },
      {
        key: "3",
        label: "Franchise",
        price: franchise,
      },
      {
        key: "4",
        label: "Surcharge",
        price: surcharge2,
      },
      { key: "5", label: "Interest", price: interest },
      { key: "6", label: "Health / S.S.F.", price: health },
      {
        key: "7",
        label: "Sticker / Docket Fee",
        price: sticker + docket,
        displayPrice: `${sticker.toLocaleString("en-PH", {
          style: "currency",
          currency: "PHP",
        })}/${docket.toLocaleString("en-PH", {
          style: "currency",
          currency: "PHP",
        })}`,
      },
      {
        key: "11",
        label: "Filing/Garbage/Notarial",
        price: filing + garbage,
        displayPrice: `${filing.toLocaleString("en-PH", {
          style: "currency",
          currency: "PHP",
        })}/${garbage.toLocaleString("en-PH", {
          style: "currency",
          currency: "PHP",
        })}`,
      },
    ];

    // const receiptData = initialreceiptData.map((v) => {
    //   if (v.label == "Interest") {
    //     return {
    //       ...v,
    //       price: monthsPassed == 0 ? interest : interest * monthsPassed,
    //     };
    //   } else {
    //     return v;
    //   }
    // });

    const sameRenewalDate = isSameDay(
      franchiseDetails.date,
      foundFranchise.DATE_RENEWAL
    );

    const newPendingFranchise = await PendingFranchise.create({
      DATE_RENEWAL: dateRenewal,
      FIRSTNAME: franchiseDetails.fname,
      LASTNAME: franchiseDetails.lname,
      MI: franchiseDetails.mi,
      ADDRESS: franchiseDetails.address,
      OWNER_NO: franchiseDetails.contact,
      OWNER_SEX: franchiseDetails.ownerSex,
      DRIVERS_NAME: franchiseDetails.drivername,
      DRIVERS_ADDRESS: franchiseDetails.driveraddress,
      DRIVERS_NO: franchiseDetails.contact2,
      DRIVERS_SEX: franchiseDetails.driverSex,
      DRIVERS_LICENSE_NO: franchiseDetails.driverlicenseno,
      MAKE: franchiseDetails.make,
      MODEL: franchiseDetails.model,
      PLATE_NO: franchiseDetails.plateno,
      MOTOR_NO: franchiseDetails.motorno,
      STROKE: franchiseDetails.stroke,
      CHASSIS_NO: franchiseDetails.chassisno,
      FUEL_DISP: franchiseDetails.fuelDisp,
      OR: franchiseDetails.or,
      CR: franchiseDetails.cr,
      TPL_PROVIDER: franchiseDetails.tplProvider,
      TPL_DATE_1: franchiseDetails.tplDate1,
      TPL_DATE_2: franchiseDetails.tplDate2,
      TYPE_OF_FRANCHISE: franchiseDetails.typeofFranchise,
      KIND_OF_BUSINESS: franchiseDetails.kindofBusiness,
      TODA: franchiseDetails.toda,
      DATE_RELEASE_OF_ST_TP: franchiseDetails.daterelease,
      ROUTE: franchiseDetails.route,
      REMARKS: franchiseDetails.remarks,
      isArchived: false,
      DATE_EXPIRED: expireDate,
      //old fields
      COMPLAINT: foundFranchise.COMPLAINT,
      createdAt: foundFranchise.createdAt,
      MTOP: foundFranchise.MTOP,
      PAID_VIOLATIONS: foundFranchise.PAID_VIOLATIONS,
      previousVersion: foundFranchise._id,
      renewedAt: !sameRenewalDate ? renewdate : foundFranchise.renewedAt,
      refNo: refNo,
      receiptData: receiptData,
      transaction: "Franchise Renewal",
      LTO_RENEWAL_DATE: foundFranchise.LTO_RENEWAL_DATE,
      processedBy: franchiseDetails?.processedBy,
      collectingOfficer: franchiseDetails?.collectingOfficer,
    });

    foundFranchise.pending = true;
    foundFranchise.receiptData = receiptData;
    foundFranchise.transaction = "Franchise Renewal";
    foundFranchise.processedBy = franchiseDetails?.processedBy;
    await foundFranchise.save();

    await logSystemAction({
      action: "FRANCHISE_RENEWAL",
      performedBy: req?.fullname || "unknown",
      target: `Franchise ID: ${franchiseDetails?.id}`,
      module: "Franchise",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });

    res.json({ refNo, receiptData });
  } catch (error) {
    await logSystemAction({
      action: "FRANCHISE_RENEWAL",
      performedBy: req?.fullname || "unknown",
      target: `Franchise ID: ${req.body?.id}`,
      module: "Franchise",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.error("Error updating franchise:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const dateNow = dayjs().tz("Asia/Kuala_Lumpur");
    const today = dateNow.startOf("day");
    const numDays = 6;
    const dayNow = dateNow.day();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyFranchiseAnalytics = [];

    for (let i = numDays; i >= 0; i--) {
      const currentDate = dayjs(dateNow)
        .subtract(i, "day")
        .tz("Asia/Kuala_Lumpur");
      const dayofWeek = currentDate.day();
      const start = currentDate.startOf("day").toISOString();
      const end = currentDate.endOf("day").toISOString();

      const added = await Franchise.countDocuments({
        isArchived: false,
        createdAt: { $gte: start, $lte: end },
      });

      const revoked = await Franchise.countDocuments({
        isArchived: true,
        DATE_ARCHIVED: { $gte: start, $lte: end },
      });

      const renewed = await Franchise.countDocuments({
        isArchived: false,
        renewedAt: { $gte: start, $lte: end },
      });

      dailyFranchiseAnalytics.push({
        key: dayofWeek == dayNow ? "Today" : days[dayofWeek],
        added: added,
        renewed: renewed,
        revoked: revoked,
      });
    }

    // get recentlyAdded
    const recentlyAdded = await Franchise.countDocuments({
      isArchived: false,
      createdAt: { $gte: today.toISOString() },
    });
    // get recentlyRevoked
    const recentlyRevoked = await Franchise.countDocuments({
      isArchived: true,
      DATE_ARCHIVED: { $gte: today.toISOString() },
    });
    // get franchises
    const franchises = await Franchise.countDocuments({
      isArchived: false,
    });

    await logSystemAction({
      action: "GET_ANALYTICS",
      performedBy: req?.fullname || "unknown",
      target: "FRANCHISE OVERVIEW",
      module: "DASHBOARD",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });

    res.json({
      franchises: franchises,
      recentlyAdded: recentlyAdded,
      recentlyRevoked: recentlyRevoked,
      franchiseAnalytics: dailyFranchiseAnalytics,
    });
  } catch (err) {
    await logSystemAction({
      action: "GET_ANALYTICS",
      performedBy: req?.fullname || "unknown",
      target: "FRANCHISE OVERVIEW",
      module: "DASHBOARD",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.error("Error fetching data:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getFranchisePending = async (req, res) => {
  try {
    const result = await PendingFranchise.find({ isArchived: false });
    await logSystemAction({
      action: "FETCH_ALL_PENDING_FRANCHISES",
      performedBy: req?.fullname || "unknown",
      target: `ALL PENDING FRANCHISES`,
      module: "Cashier",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });
    res.json(result);
  } catch (err) {
    await logSystemAction({
      action: "FETCH_ALL_PENDING_FRANCHISES",
      performedBy: req?.fullname || "unknown",
      target: `ALL PENDING FRANCHISES`,
      module: "Cashier",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.error("Error fetching data:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getFranchisePendingPaid = async (req, res) => {
  try {
    const result = await PendingFranchise.find({ isArchived: true }).sort({
      refNo: "desc",
    });
    await logSystemAction({
      action: "FETCH_PAID_FRANCHISES",
      performedBy: req?.fullname || "unknown",
      target: `ALL PAID FRANCHISES`,
      module: "Cashier",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });
    res.json(result);
  } catch (err) {
    await logSystemAction({
      action: "FETCH_PAID_FRANCHISES",
      performedBy: req?.fullname || "unknown",
      target: `ALL PAID FRANCHISES`,
      module: "Cashier",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.error("Error fetching data:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const pendingFranchisePayment = async (req, res) => {
  try {
    const franchiseDetails = req.body;
    if (!franchiseDetails)
      return res
        .status(400)
        .json({ message: "Important franchise details are required." });

    const foundPending = await PendingFranchise.findOne({
      _id: franchiseDetails.id,
    });

    if (!foundPending) res.status(404).json({ message: "record not found" });

    let newFranchiseData;
    const dateNow = dayjs().tz("Asia/Kuala_Lumpur");
    const paymentOrDate = dayjs(franchiseDetails?.paymentOrDate).tz(
      "Asia/Kuala_Lumpur"
    );

    const franchiseObj = {
      MTOP: foundPending?.MTOP,
      LASTNAME: foundPending?.LASTNAME,
      FIRSTNAME: foundPending?.FIRSTNAME,
      MI: foundPending?.MI,
      ADDRESS: foundPending?.ADDRESS,
      DRIVERS_NO: foundPending?.DRIVERS_NO,
      OWNER_NO: foundPending?.OWNER_NO,
      OWNER_SEX: foundPending?.OWNER_SEX,
      TODA: foundPending?.TODA,
      DRIVERS_NAME: foundPending?.DRIVERS_NAME,
      DRIVERS_ADDRESS: foundPending?.DRIVERS_ADDRESS,
      DRIVERS_SEX: foundPending?.DRIVERS_SEX,
      OR: foundPending?.OR,
      CR: foundPending?.CR,
      DRIVERS_LICENSE_NO: foundPending?.DRIVERS_LICENSE_NO,
      MAKE: foundPending?.MAKE,
      MODEL: foundPending?.MODEL,
      MOTOR_NO: foundPending?.MOTOR_NO,
      CHASSIS_NO: foundPending?.CHASSIS_NO,
      PLATE_NO: foundPending?.PLATE_NO,
      STROKE: foundPending?.STROKE,
      FUEL_DISP: foundPending?.FUEL_DISP,
      TPL_PROVIDER: foundPending?.TPL_PROVIDER,
      TPL_DATE_1: foundPending?.TPL_DATE_1,
      TPL_DATE_2: foundPending?.TPL_DATE_2,
      DATE_RELEASE_OF_ST_TP: foundPending?.DATE_RELEASE_OF_ST_TP,
      TYPE_OF_FRANCHISE: foundPending?.TYPE_OF_FRANCHISE,
      KIND_OF_BUSINESS: foundPending?.KIND_OF_BUSINESS,
      ROUTE: foundPending?.ROUTE,
      COMPLAINT: foundPending?.COMPLAINT,
      isArchived: foundPending?.isArchived,
      PAID_VIOLATIONS: foundPending?.PAID_VIOLATIONS,
      DATE_RENEWAL: foundPending?.DATE_RENEWAL,
      DATE_EXPIRED: foundPending?.DATE_EXPIRED,
      createdAt: foundPending?.createdAt,
      DATE_ARCHIVED: foundPending?.DATE_ARCHIVED,
      REMARKS: foundPending?.REMARKS,
      renewedAt: foundPending?.renewedAt,
      paymentOr: franchiseDetails?.paymentOr,
      paymentOrDate: paymentOrDate,
      pending: false,
      receiptData: foundPending?.receiptData,
      LTO_RENEWAL_DATE: foundPending.LTO_RENEWAL_DATE,
      processedBy: franchiseDetails?.processedBy,
      collectingOfficer: franchiseDetails?.collectingOfficer,
    };

    if (foundPending.transaction == "New Franchise") {
      newFranchiseData = await Franchise.create({
        ...franchiseObj,
        MPreceiptData: foundPending?.receiptData,
        MPpaymentOr: franchiseDetails?.paymentOr,
      });
    }

    if (foundPending.transaction == "Franchise Renewal") {
      const foundFranchise = await Franchise.findOne({
        _id: foundPending?.previousVersion,
        isArchived: false,
      });

      await foundFranchise.set({
        ...franchiseObj,
        MPreceiptData: foundPending?.receiptData,
        MPpaymentOr: franchiseDetails?.paymentOr,
      });
      newFranchiseData = await foundFranchise.save();
    }

    if (foundPending.transaction == "Transfer Franchise") {
      await Franchise.findOneAndUpdate(
        {
          _id: foundPending?.previousVersion,
          isArchived: false,
        },
        {
          isArchived: true,
          DATE_ARCHIVED: dateNow,
          actionFrom: "transfer",
          archivedBy: req?.fullname,
        }
      );

      newFranchiseData = await Franchise.create({
        ...franchiseObj,
        MPreceiptData: foundPending?.MPreceiptData,
        MPpaymentOr: foundPending?.MPpaymentOr,
      });
    }

    foundPending.isArchived = true;
    foundPending.paymentOr = franchiseDetails?.paymentOr;
    foundPending.paymentOrDate = paymentOrDate;
    foundPending.collectingOfficer = franchiseDetails?.collectingOfficer;
    await foundPending.save();

    await logSystemAction({
      action: "FRANCHISE_PAYMENT",
      performedBy: req?.fullname || "unknown",
      target: `Franchise ID: ${franchiseDetails?.id}`,
      module: "Cashier",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });

    res.json({ newFranchiseData, receiptData: foundPending?.receiptData });
  } catch (err) {
    await logSystemAction({
      action: "FRANCHISE_PAYMENT",
      performedBy: req?.fullname || "unknown",
      target: `Franchise ID: ${req.body?.id}`,
      module: "Cashier",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.error("Error fetching data:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const cancelOR = async (req, res) => {
  const franchiseDetails = req.body;
  try {
    if (!franchiseDetails)
      return res
        .status(400)
        .json({ message: "Important franchise details are required." });

    const foundFranchise = await Franchise.findOne({
      MTOP: franchiseDetails.mtop,
      isArchived: false,
      pending: true,
    });

    if (foundFranchise) {
      foundFranchise.pending = false;

      await foundFranchise.save();
    }

    await PendingFranchise.deleteOne({ previousVersion: franchiseDetails.id });
    await logSystemAction({
      action: "CANCEL_OR",
      performedBy: req?.fullname || "unknown",
      target: `Franchise ID: ${franchiseDetails?.id}`,
      module: "Franchise",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });
    res.json({ message: "ok" });
  } catch (err) {
    await logSystemAction({
      action: "CANCEL_OR",
      performedBy: req?.fullname || "unknown",
      target: `Franchise ID: ${franchiseDetails?.id}`,
      module: "Franchise",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.error("Error fetching data:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const cashierCancelPending = async (req, res) => {
  const franchiseDetails = req.body;
  try {
    if (!franchiseDetails)
      return res
        .status(400)
        .json({ message: "Important franchise details are required." });

    const foundFranchise = await Franchise.findOne({
      MTOP: franchiseDetails.mtop,
      isArchived: false,
      pending: true,
    });

    if (foundFranchise) {
      foundFranchise.pending = false;

      await foundFranchise.save();
    }

    await PendingFranchise.findByIdAndDelete(franchiseDetails.id);
    await logSystemAction({
      action: "CANCEL_OR_PENDING_FRANCHISE",
      performedBy: req?.fullname || "unknown",
      target: `Franchise ID: ${franchiseDetails?.id}`,
      module: "Cashier",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });
    res.json({ message: "ok" });
  } catch (err) {
    await logSystemAction({
      action: "CANCEL_OR_PENDING_FRANCHISE",
      performedBy: req?.fullname || "unknown",
      target: `Franchise ID: ${franchiseDetails?.id}`,
      module: "Cashier",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    console.error("Error fetching data:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchFranchise = async (req, res) => {
  try {
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 100;
    const skip = (page - 1) * pageSize;
    const { sortDirection } = req.query;
    let sortField = req.query.sortField;

    switch (sortField) {
      case "mtop":
        sortField = "MTOP";
        break;
      case "lname":
        sortField = "LASTNAME";
        break;
      case "fname":
        sortField = "FIRSTNAME";
        break;
      case "mi":
        sortField = "MI";
        break;
      case "address":
        sortField = "ADDRESS";
        break;
      case "contact":
        sortField = "OWNER_NO";
        break;
      case "contact2":
        sortField = "DRIVERS_NO";
        break;
      case "toda":
        sortField = "TODA";
        break;
      case "drivername":
        sortField = "DRIVERS_NAME";
        break;
      case "driveraddress":
        sortField = "DRIVERS_ADDRESS";
        break;
      case "or":
        sortField = "OR";
        break;
      case "cr":
        sortField = "CR";
        break;
      case "driverlicenseno":
        sortField = "DRIVERS_LICENSE_NO";
        break;
      case "make":
        sortField = "MAKE";
        break;
      case "model":
        sortField = "MODEL";
        break;
      case "motorno":
        sortField = "MOTOR_NO";
        break;
      case "chassisno":
        sortField = "CHASSIS_NO";
        break;
      case "plateno":
        sortField = "PLATE_NO";
        break;
      case "stroke":
        sortField = "STROKE";
        break;
      case "remarks":
        sortField = "REMARKS";
        break;
      case "date":
        sortField = "DATE_RENEWAL";
        break;
    }

    const sort = {};
    if (sortField) {
      sort[sortField] = sortDirection === "asc" ? 1 : -1;
    }
    // console.log(sort);
    // Parse filter parameters
    let filters = {};
    try {
      filters = JSON.parse(req.query.filters || "{}");
    } catch (error) {
      return res.status(400).json({ message: "Invalid filter format" });
    }

    // Initialize the query object
    const filterQuery = { isArchived: false };

    // Build the filter query from the parsed filters
    if (filters.items && Array.isArray(filters.items)) {
      filters.items.forEach((filter) => {
        const { field, operator } = filter;
        let value = filter.value ? filter.value.trim() : "";

        let formatedField = "";
        // console.log(operator);
        // console.log(field);
        console.log(value);

        switch (field) {
          case "mtop":
            formatedField = "MTOP";
            break;
          case "lname":
            formatedField = "LASTNAME";
            break;
          case "fname":
            formatedField = "FIRSTNAME";
            break;
          case "mi":
            formatedField = "MI";
            break;
          case "address":
            formatedField = "ADDRESS";
            break;
          case "contact":
            formatedField = "OWNER_NO";
            break;
          case "contact2":
            formatedField = "DRIVERS_NO";
            break;
          case "toda":
            formatedField = "TODA";
            break;
          case "drivername":
            formatedField = "DRIVERS_NAME";
            break;
          case "driveraddress":
            formatedField = "DRIVERS_ADDRESS";
            break;
          case "or":
            formatedField = "OR";
            break;
          case "cr":
            formatedField = "CR";
            break;
          case "driverlicenseno":
            formatedField = "DRIVERS_LICENSE_NO";
            break;
          case "make":
            formatedField = "MAKE";
            break;
          case "model":
            formatedField = "MODEL";
            break;
          case "motorno":
            formatedField = "MOTOR_NO";
            break;
          case "chassisno":
            formatedField = "CHASSIS_NO";
            break;
          case "plateno":
            formatedField = "PLATE_NO";
            break;
          case "stroke":
            formatedField = "STROKE";
            break;
          case "remarks":
            formatedField = "REMARKS";
            break;
          // case "date":
          //   formatedField = "DATE_RENEWAL";
          //   value = new Date(value)
          //   break;
        }

        // console.log(formatedField);

        switch (operator) {
          case "contains":
            filterQuery[formatedField] = {
              $regex: new RegExp(value, "i"),
            }; // Case-insensitive match
            break;
          case "equals":
            filterQuery[formatedField] = value;
            break;
          case "startsWith":
            filterQuery[formatedField] = {
              $regex: new RegExp(`^${value}`, "i"),
            };
            break;
          case "endsWith":
            filterQuery[formatedField] = {
              $regex: new RegExp(`${value}$`, "i"),
            };
            break;
          // Add other operators as needed
          default:
            console.warn(`Unsupported operator: ${operator}`);
        }
      });
    }
    // console.log(filterQuery);

    // Fetch the filtered data with pagination
    const rows = await Franchise.find(filterQuery)
      .sort(sort)
      .skip(skip)
      .limit(pageSize);

    // Count the total number of records matching the filter query
    const totalRows = await Franchise.countDocuments(filterQuery);

    // Send the filtered data along with the total record count

    await logSystemAction({
      action: "FETCH_FRANCHISES",
      performedBy: req?.fullname || "unknown",
      target: `Page: ${page}, Rows: ${pageSize}`,
      module: "Franchise",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });

    res.json({
      rows,
      totalRows,
      currentPage: page,
      totalPages: Math.ceil(totalRows / pageSize),
    });
  } catch (err) {
    console.error("Error fetching data:", err);
    await logSystemAction({
      action: "FETCH_FRANCHISES",
      performedBy: req?.fullname || "unknown",
      target: "LIST OF FRANCHISES",
      module: "Franchise",
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      status: "FAILED",
    });
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getAllFranchise,
  getAllArchived,
  archiveFranchise,
  getAllAvailableMTOPs,
  addNewFranchise,
  handleFranchiseTransfer,
  handleFranchiseUpdate,
  getAnalytics,
  getFranchisePending,
  pendingFranchisePayment,
  getFranchisePendingPaid,
  cancelOR,
  cashierCancelPending,
  fetchFranchise,
};
