const express = require("express");
const {
  register,
  login,
  socialLogin,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
  updateMyAccountStatus,
  updateUserAccountStatus,
  listUsers,
  updateUserManagement,
  deleteUser
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validationMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  registerValidation,
  loginValidation,
  socialLoginValidation,
  updateProfileValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  accountStatusValidation,
  adminUserManagementValidation
} = require("../validators/authValidator");

const router = express.Router();

router.post("/register", registerValidation, validateRequest, register);
router.post("/login", loginValidation, validateRequest, login);
router.post("/social", socialLoginValidation, validateRequest, socialLogin);
router.post("/forgot-password", forgotPasswordValidation, validateRequest, forgotPassword);
router.post("/reset-password", resetPasswordValidation, validateRequest, resetPassword);
router.get("/me", protect, getMe);
router.put("/me", protect, upload.single("profileImage"), updateProfileValidation, validateRequest, updateMe);
router.put("/change-password", protect, changePasswordValidation, validateRequest, changePassword);
router.put("/me/status", protect, accountStatusValidation, validateRequest, updateMyAccountStatus);
router.put(
  "/users/:id/status",
  protect,
  authorize("admin"),
  accountStatusValidation,
  validateRequest,
  updateUserAccountStatus
);
router.get("/users", protect, authorize("admin"), listUsers);
router.put("/users/:id", protect, authorize("admin"), adminUserManagementValidation, validateRequest, updateUserManagement);
router.delete("/users/:id", protect, authorize("admin"), deleteUser);

module.exports = router;
