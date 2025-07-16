const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const franchiseSchema = new Schema({
  MTOP: {
    type: String,
    required: true,
  },
  LASTNAME: {
    type: String,
    required: false,
  },
  FIRSTNAME: {
    type: String,
    required: false,
  },
  MI: {
    type: String,
    required: false,
  },
  ADDRESS: {
    type: String,
    required: false,
  },
  DRIVERS_NO: {
    type: String,
    required: false,
  },
  OWNER_NO: {
    type: String,
    required: false,
  },
  OWNER_SEX: {
    type: String,
    required: false,
  },
  TODA: {
    type: String,
    required: false,
  },
  DRIVERS_NAME: {
    type: String,
    required: false,
  },
  DRIVERS_ADDRESS: {
    type: String,
    required: false,
  },
  DRIVERS_SEX: {
    type: String,
    required: false,
  },
  OR: {
    type: String,
    required: false,
  },
  CR: {
    type: String,
    required: false,
  },
  DRIVERS_LICENSE_NO: {
    type: String,
    required: false,
  },
  MAKE: {
    type: String,
    required: false,
  },
  MODEL: {
    type: String,
    required: false,
  },
  MOTOR_NO: {
    type: String,
    required: false,
  },
  CHASSIS_NO: {
    type: String,
    required: false,
  },
  PLATE_NO: {
    type: String,
    required: false,
  },
  STROKE: {
    type: String,
    required: false,
  },
  FUEL_DISP: {
    type: String,
    required: false,
  },
  TPL_PROVIDER: {
    type: String,
    required: false,
  },
  TPL_DATE_1: {
    type: String,
    required: false,
  },
  TPL_DATE_2: {
    type: String,
    required: false,
  },

  REMARKS: {
    type: String,
    required: false,
  },
  DATE_RELEASE_OF_ST_TP: {
    type: String,
    required: false,
  },
  TYPE_OF_FRANCHISE: {
    type: String,
    required: false,
  },
  KIND_OF_BUSINESS: {
    type: String,
    required: false,
  },
  ROUTE: {
    type: String,
    required: false,
  },
  COMPLAINT: {
    type: Array,
    required: false,
  },
  isArchived: {
    type: Boolean,
    default: false,
    required: true,
  },

  PAID_VIOLATIONS: {
    type: Array,
    required: false,
  },

  DATE_RENEWAL: {
    type: "date",
    required: false,
  },

  LTO_RENEWAL_DATE: {
    type: "date",
    required: false,
  },
  DATE_EXPIRED: {
    type: "date",
    required: false,
  },
  createdAt: {
    type: "date",
    require: true,
  },
  renewedAt: {
    type: "date",
    require: false,
  },
  DATE_ARCHIVED: {
    type: "date",
    required: false,
  },
  paymentOr: {
    type: String,
    required: false,
  },
  paymentOrDate: {
    type: "date",
    required: false,
  },
  pending: {
    type: Boolean,
    required: false,
  },
  receiptData: {
    type: Object,
    required: false,
  },

  processedBy: {
    type: String,
    required: false,
  },
  collectingOfficer: {
    type: String,
    required: false,
  },
  MPreceiptData: {
    type: Object,
    required: false,
  },
  MPpaymentOr: {
    type: String,
    required: false,
  },

  transaction: {
    type: String,
    required: false,
  },
  newOwner: {
    type: String,
    required: false,
  },
  newDriver: {
    type: String,
    required: false,
  },
  newMotor: {
    type: String,
    required: false,
  },
  newToda: {
    type: String,
    required: false,
  },
  fromAction: {
    type: String,
    required: false,
  },
  archivedBy: {
    type: String,
    required: false,
  },
});

module.exports = mongoose.model("Franchise", franchiseSchema);
