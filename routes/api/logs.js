const express = require("express");
const { getLogs } = require("../../controllers/LogsController");
const router = express.Router();

router.get("/", getLogs);

module.exports = router;
