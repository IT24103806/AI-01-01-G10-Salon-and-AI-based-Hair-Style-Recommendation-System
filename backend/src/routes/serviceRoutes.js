const express = require("express");
const {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService
} = require("../controllers/serviceController");
const { protect, authorize } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validationMiddleware");
const { createServiceValidation, updateServiceValidation } = require("../validators/serviceValidator");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/", protect, getServices);
router.get("/:id", protect, getServiceById);
router.post(
  "/",
  protect,
  authorize("admin"),
  upload.single("image"),
  createServiceValidation,
  validateRequest,
  createService
);
router.put(
  "/:id",
  protect,
  authorize("admin"),
  upload.single("image"),
  updateServiceValidation,
  validateRequest,
  updateService
);
router.delete("/:id", protect, authorize("admin"), deleteService);

module.exports = router;
