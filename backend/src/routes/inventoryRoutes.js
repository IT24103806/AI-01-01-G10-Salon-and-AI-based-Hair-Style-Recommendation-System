const express = require("express");
const {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  trackProductUsage,
  createOrder,
  getMyOrders,
  getAllOrders,
  markOrderStatus,
  getInventoryReport,
  getOrderReceipt
} = require("../controllers/inventoryController");
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const validateRequest = require("../middleware/validationMiddleware");
const {
  createProductValidation,
  updateProductValidation,
  trackUsageValidation,
  createOrderValidation,
  updateOrderStatusValidation
} = require("../validators/inventoryValidator");

const router = express.Router();

router.use(protect);

router.get("/products", listProducts);
router.post(
  "/products",
  authorize("admin"),
  upload.single("productImage"),
  createProductValidation,
  validateRequest,
  createProduct
);
router.put(
  "/products/:id",
  authorize("admin"),
  upload.single("productImage"),
  updateProductValidation,
  validateRequest,
  updateProduct
);
router.delete("/products/:id", authorize("admin"), deleteProduct);
router.put("/products/:id/usage", authorize("admin"), trackUsageValidation, validateRequest, trackProductUsage);

router.post("/orders", createOrderValidation, validateRequest, createOrder);
router.get("/orders/my", getMyOrders);
router.get("/orders", authorize("admin"), getAllOrders);
router.get("/orders/:id/receipt", getOrderReceipt);
router.put("/orders/:id/status", updateOrderStatusValidation, validateRequest, markOrderStatus);

router.get("/report", authorize("admin"), getInventoryReport);

module.exports = router;
