const express = require("express");
const {
  createStaff,
  getStaff,
  getStaffById,
  updateStaff,
  deleteStaff
} = require("../controllers/staffController");
const { protect, authorize } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validationMiddleware");
const { createStaffValidation, updateStaffValidation } = require("../validators/staffValidator");

const router = express.Router();

router.get("/", protect, getStaff);
router.get("/:id", protect, getStaffById);
router.post("/", protect, authorize("admin"), createStaffValidation, validateRequest, createStaff);
router.put("/:id", protect, authorize("admin"), updateStaffValidation, validateRequest, updateStaff);
router.delete("/:id", protect, authorize("admin"), deleteStaff);

module.exports = router;
