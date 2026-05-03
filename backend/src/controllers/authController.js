const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const Staff = require("../models/Staff");
const { generateToken } = require("../utils/token");
const { getNextStaffCode } = require("../utils/staffCode");

const googleClient = new OAuth2Client();

const toUserPayload = (user) => ({
  id: user._id,
  name: user.name,
  title: user.title,
  email: user.email,
  role: user.role,
  staffApprovalStatus: user.staffApprovalStatus,
  phone: user.phone,
  profileImage: user.profileImage || ""
});

const verifyGoogleToken = async (idToken) => {
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience) {
    throw new Error("Missing GOOGLE_CLIENT_ID");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience
  });
  const payload = ticket.getPayload() || {};

  return {
    providerId: payload.sub,
    email: String(payload.email || "")
      .trim()
      .toLowerCase(),
    name: String(payload.name || "").trim(),
    picture: String(payload.picture || "").trim()
  };
};

const verifyFacebookAccessToken = async (accessToken) => {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET");
  }

  const appToken = `${appId}|${appSecret}`;
  const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(
    accessToken
  )}&access_token=${encodeURIComponent(appToken)}`;
  const debugResponse = await fetch(debugUrl);
  const debugPayload = await debugResponse.json();
  const tokenData = debugPayload?.data;

  if (!debugResponse.ok || !tokenData?.is_valid || String(tokenData.app_id) !== String(appId)) {
    throw new Error("Invalid Facebook access token");
  }

  const profileUrl = `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(
    accessToken
  )}`;
  const profileResponse = await fetch(profileUrl);
  const profilePayload = await profileResponse.json();

  if (!profileResponse.ok || !profilePayload?.id) {
    throw new Error("Failed to fetch Facebook profile");
  }

  return {
    providerId: String(profilePayload.id),
    email: String(profilePayload.email || "")
      .trim()
      .toLowerCase(),
    name: String(profilePayload.name || "").trim(),
    picture: String(profilePayload?.picture?.data?.url || "").trim()
  };
};

const register = async (req, res, next) => {
  try {
    const { name, title, email, password, role, phone, staffRole, availableSlots } = req.body;
    const normalizedRole = String(role || "customer")
      .trim()
      .toLowerCase();
    if (normalizedRole === "admin") {
      return res.status(403).json({ message: "Admin registration is disabled" });
    }

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      title,
      email: normalizedEmail,
      password: hashedPassword,
      authProvider: "local",
      role: normalizedRole || "customer",
      staffApprovalStatus: normalizedRole === "staff" ? "pending" : "approved",
      phone
    });

    if (user.role === "staff") {
      const generatedCode = await getNextStaffCode();
      const normalizedSlots = Array.isArray(availableSlots)
        ? availableSlots.map((slot) => String(slot || "").trim()).filter(Boolean)
        : [];
      await Staff.create({
        userId: user._id,
        staffCode: generatedCode,
        name: user.name,
        email: user.email,
        role: staffRole || "Beautician",
        availableSlots: normalizedSlots
      });
    }

    return res.status(201).json({
      message:
        user.role === "staff"
          ? "Beautician account created. Please wait for admin approval before login."
          : "User registered successfully",
      user: toUserPayload(user),
      token: generateToken(user._id)
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "Your account is temporarily blocked by admin" });
    }
    if (user.role === "staff" && user.staffApprovalStatus !== "approved") {
      return res.status(403).json({ message: "Your beautician account is pending admin approval" });
    }
    if (!user.password) {
      return res.status(400).json({
        message: `This account uses ${user.authProvider} login. Please use social sign-in.`
      });
    }

    let isPasswordValid = false;
    const hashedPattern = /^\$2[abxy]\$\d{2}\$[./A-Za-z0-9]{53}$/;
    if (hashedPattern.test(user.password || "")) {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      // Backward compatibility for manually seeded plain-text passwords.
      isPasswordValid = password === user.password;
      if (isPasswordValid) {
        user.password = await bcrypt.hash(password, 10);
        await user.save();
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.status(200).json({
      message: "Login successful",
      user: toUserPayload(user),
      token: generateToken(user._id)
    });
  } catch (error) {
    return next(error);
  }
};

const socialLogin = async (req, res, next) => {
  try {
    const { provider, idToken, accessToken, name, title, phone } = req.body;
    const normalizedProvider = String(provider || "")
      .trim()
      .toLowerCase();

    let verifiedProfile = null;
    if (normalizedProvider === "google") {
      if (!String(idToken || "").trim()) {
        return res.status(400).json({ message: "idToken is required for Google login" });
      }
      verifiedProfile = await verifyGoogleToken(String(idToken || "").trim());
    } else if (normalizedProvider === "facebook") {
      if (!String(accessToken || "").trim()) {
        return res.status(400).json({ message: "accessToken is required for Facebook login" });
      }
      verifiedProfile = await verifyFacebookAccessToken(String(accessToken || "").trim());
    } else {
      return res.status(400).json({ message: "Unsupported social auth provider" });
    }

    if (!verifiedProfile.providerId) {
      return res.status(400).json({ message: "Unable to identify social account" });
    }
    if (!verifiedProfile.email) {
      return res
        .status(400)
        .json({ message: "Social account email is required. Please grant email permission and retry." });
    }

    const providerField = normalizedProvider === "google" ? "googleId" : "facebookId";
    let user = await User.findOne({ [providerField]: verifiedProfile.providerId });

    if (!user) {
      user = await User.findOne({ email: verifiedProfile.email });
    }

    if (!user) {
      user = await User.create({
        name:
          String(name || "").trim() || verifiedProfile.name || verifiedProfile.email.split("@")[0] || "Customer",
        title: ["Mr", "Mrs", "Ms", "Dr"].includes(title) ? title : "Mr",
        email: verifiedProfile.email,
        authProvider: normalizedProvider,
        role: "customer",
        phone: String(phone || "").trim(),
        [providerField]: verifiedProfile.providerId,
        profileImage: verifiedProfile.picture || ""
      });
    } else {
      if (!user[providerField]) {
        user[providerField] = verifiedProfile.providerId;
      }
      if (user.authProvider === "local") {
        user.authProvider = normalizedProvider;
      }
      if (!user.profileImage && verifiedProfile.picture) {
        user.profileImage = verifiedProfile.picture;
      }
      await user.save();
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Your account is temporarily blocked by admin" });
    }
    if (user.role === "staff" && user.staffApprovalStatus !== "approved") {
      return res.status(403).json({ message: "Your beautician account is pending admin approval" });
    }

    return res.status(200).json({
      message: "Social login successful",
      user: toUserPayload(user),
      token: generateToken(user._id)
    });
  } catch (error) {
    return next(error);
  }
};

const getMe = async (req, res) => {
  res.status(200).json({ user: req.user });
};

const updateMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updates = {};
    if (typeof req.body.name === "string") {
      updates.name = req.body.name.trim();
    }
    if (typeof req.body.title === "string") {
      updates.title = req.body.title.trim();
    }
    if (typeof req.body.phone === "string") {
      updates.phone = req.body.phone.trim();
    }
    if (typeof req.body.email === "string") {
      const normalizedEmail = req.body.email.trim().toLowerCase();
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (existing) {
        return res.status(409).json({ message: "Email is already in use" });
      }
      updates.email = normalizedEmail;
    }

    if (req.file) {
      updates.profileImage = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    Object.assign(user, updates);
    await user.save();

    if (user.role === "staff") {
      const staffRecord = await Staff.findOne({ userId: user._id });
      if (staffRecord) {
        if (updates.name) {
          staffRecord.name = updates.name;
        }
        if (updates.email) {
          staffRecord.email = updates.email;
        }
        await staffRecord.save();
      }
    }

    return res.status(200).json({
      message: "Profile updated",
      user: toUserPayload(user)
    });
  } catch (error) {
    return next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.password) {
      return res.status(400).json({ message: "Password login is not enabled for this account" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.authProvider = "local";
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    return next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const normalizedEmail = String(req.body.email || "").trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Avoid account enumeration
    if (!user) {
      return res.status(200).json({ message: "If this email exists, reset instructions were generated." });
    }

    if (!user.password) {
      return res
        .status(400)
        .json({ message: `This account uses ${user.authProvider} sign-in and has no password to reset.` });
    }

    const resetCode = String(crypto.randomInt(100000, 1000000));
    const hashedToken = crypto.createHash("sha256").update(resetCode).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    return res.status(200).json({
      message: "Reset code generated. Use this 6-digit code to reset password.",
      // NOTE: In production send via email/SMS and do not return in response.
      resetToken: resetCode
    });
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const hashedToken = crypto.createHash("sha256").update(String(token || "")).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.authProvider = "local";
    user.resetPasswordToken = "";
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    return next(error);
  }
};

const updateMyAccountStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isActive = Boolean(isActive);
    await user.save();

    return res.status(200).json({ message: `Account ${user.isActive ? "activated" : "deactivated"}` });
  } catch (error) {
    return next(error);
  }
};

const updateUserAccountStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isActive = Boolean(isActive);
    await user.save();

    return res.status(200).json({ message: `User account ${user.isActive ? "activated" : "deactivated"}` });
  } catch (error) {
    return next(error);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password -resetPasswordToken -resetPasswordExpires").sort({ createdAt: -1 });
    return res.status(200).json({ data: users });
  } catch (error) {
    return next(error);
  }
};

const updateUserManagement = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hasRoleChange = req.body.role !== undefined;
    const targetRole = String(req.body.role || "").trim().toLowerCase();
    if (hasRoleChange) {
      if (!["customer", "staff", "admin"].includes(targetRole)) {
        return res.status(400).json({ message: "Role must be customer, staff or admin" });
      }
      if (user.role === "admin" && targetRole !== "admin") {
        return res.status(400).json({ message: "Admin role users cannot be changed to another role" });
      }
      user.role = targetRole;
      if (targetRole !== "staff") {
        user.staffApprovalStatus = "approved";
      } else if (!req.body.staffApprovalStatus && user.staffApprovalStatus !== "approved") {
        user.staffApprovalStatus = "pending";
      }
    }

    if (req.body.isActive !== undefined) {
      if (String(user._id) === String(req.user._id) && Boolean(req.body.isActive) === false) {
        return res.status(400).json({ message: "You cannot block your own admin account" });
      }
      user.isActive = Boolean(req.body.isActive);
    }

    if (req.body.staffApprovalStatus !== undefined) {
      const normalizedApproval = String(req.body.staffApprovalStatus).trim().toLowerCase();
      if (!["approved", "pending"].includes(normalizedApproval)) {
        return res.status(400).json({ message: "staffApprovalStatus must be approved or pending" });
      }
      if (user.role !== "staff") {
        return res.status(400).json({ message: "Only beautician accounts have approval status" });
      }
      user.staffApprovalStatus = normalizedApproval;
    }

    await user.save();

    if (user.role === "staff") {
      let staffRecord = await Staff.findOne({ userId: user._id });
      if (!staffRecord) {
        staffRecord = await Staff.create({
          userId: user._id,
          staffCode: await getNextStaffCode(),
          name: user.name,
          email: user.email,
          role: "Beautician",
          availableSlots: []
        });
      } else {
        let touched = false;
        if (staffRecord.name !== user.name) {
          staffRecord.name = user.name;
          touched = true;
        }
        if (staffRecord.email !== user.email) {
          staffRecord.email = user.email;
          touched = true;
        }
        if (touched) {
          await staffRecord.save();
        }
      }
    } else {
      await Staff.findOneAndDelete({ userId: user._id });
    }

    const safeUser = await User.findById(user._id).select("-password -resetPasswordToken -resetPasswordExpires");
    return res.status(200).json({ message: "User updated", data: safeUser });
  } catch (error) {
    return next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role === "admin") {
      return res.status(400).json({ message: "Admin users cannot be deleted" });
    }
    await Staff.findOneAndDelete({ userId: user._id });
    await User.findByIdAndDelete(user._id);
    return res.status(200).json({ message: "User deleted" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
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
};
