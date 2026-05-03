const express = require("express");
const {
  createPayment,
  getPayments,
  markPaymentStatus,
  getPaymentByAppointment,
  getRevenueSummary,
  getDailyReport,
  getMonthlyReport,
  getPaymentReceipt
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validationMiddleware");
const { createPaymentValidation, updatePaymentStatusValidation } = require("../validators/paymentValidator");

const router = express.Router();

router.use(protect);

router.post("/", createPaymentValidation, validateRequest, createPayment);
router.get("/", getPayments);
router.get("/summary", getRevenueSummary);
router.get("/reports/daily", getDailyReport);
router.get("/reports/monthly", getMonthlyReport);
router.get("/appointment/:appointmentId", getPaymentByAppointment);
router.get("/:id/receipt", getPaymentReceipt);
router.put("/:id/status", updatePaymentStatusValidation, validateRequest, markPaymentStatus);

module.exports = router;
