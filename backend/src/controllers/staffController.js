const Staff = require("../models/Staff");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { getNextStaffCode } = require("../utils/staffCode");

const normalizeSlots = (value) =>
  Array.isArray(value) ? value.map((slot) => String(slot || "").trim()).filter(Boolean) : [];

const createStaff = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    delete payload.staffCode;
    if (payload.email) payload.email = String(payload.email).trim().toLowerCase();
    payload.availableSlots = normalizeSlots(payload.availableSlots);
    const rawPassword = String(payload.password || "");
    delete payload.password;

    const existingUser = await User.findOne({ email: payload.email });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already used by another account" });
    }
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const user = await User.create({
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      authProvider: "local",
      role: "staff"
    });

    payload.staffCode = await getNextStaffCode();
    payload.userId = user._id;
    let staff = null;
    try {
      staff = await Staff.create(payload);
    } catch (error) {
      await User.findByIdAndDelete(user._id);
      throw error;
    }
    return res.status(201).json({ message: "Beautician created", data: staff });
  } catch (error) {
    return next(error);
  }
};

const getStaff = async (req, res, next) => {
  try {
    const list = await Staff.find().populate("userId", "name email profileImage");
    return res.status(200).json({ data: list });
  } catch (error) {
    return next(error);
  }
};

const getStaffById = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id).populate("userId", "name email profileImage");
    if (!staff) {
      return res.status(404).json({ message: "Beautician not found" });
    }
    return res.status(200).json({ data: staff });
  } catch (error) {
    return next(error);
  }
};

const updateStaff = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    delete payload.staffCode;
    if (payload.email) payload.email = String(payload.email).trim().toLowerCase();
    if (payload.availableSlots !== undefined) {
      payload.availableSlots = normalizeSlots(payload.availableSlots);
    }
    const rawPassword = String(payload.password || "");
    delete payload.password;

    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ message: "Beautician not found" });
    }

    if (payload.email) {
      const owner = await User.findOne({ email: payload.email, _id: { $ne: staff.userId } });
      if (owner) {
        return res.status(409).json({ message: "Email is already used by another account" });
      }
    }

    Object.assign(staff, payload);

    if (staff.userId) {
      const user = await User.findById(staff.userId);
      if (user) {
        if (payload.name) user.name = payload.name;
        if (payload.email) user.email = payload.email;
        user.role = "staff";
        if (rawPassword) {
          user.password = await bcrypt.hash(rawPassword, 10);
          user.authProvider = "local";
        }
        await user.save();
      }
    } else if (rawPassword) {
      const user = await User.create({
        name: payload.name || staff.name,
        email: payload.email || staff.email,
        password: await bcrypt.hash(rawPassword, 10),
        authProvider: "local",
        role: "staff"
      });
      staff.userId = user._id;
    }

    const updated = await staff.save();
    return res.status(200).json({ message: "Beautician updated", data: updated });
  } catch (error) {
    return next(error);
  }
};

const deleteStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    if (!staff) {
      return res.status(404).json({ message: "Beautician not found" });
    }
    return res.status(200).json({ message: "Beautician deleted" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createStaff,
  getStaff,
  getStaffById,
  updateStaff,
  deleteStaff
};
