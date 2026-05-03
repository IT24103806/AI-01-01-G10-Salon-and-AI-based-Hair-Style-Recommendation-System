const Service = require("../models/Service");

const getImageUrl = (req, file) => {
  if (!file) return "";
  return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
};

const createService = async (req, res, next) => {
  try {
    const imageUrl = getImageUrl(req, req.file);
    const service = await Service.create({
      ...req.body,
      image: imageUrl || req.body.image || ""
    });
    return res.status(201).json({ message: "Service created", data: service });
  } catch (error) {
    return next(error);
  }
};

const getServices = async (req, res, next) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    return res.status(200).json({ data: services });
  } catch (error) {
    return next(error);
  }
};

const getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    return res.status(200).json({ data: service });
  } catch (error) {
    return next(error);
  }
};

const updateService = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (req.file) {
      updates.image = getImageUrl(req, req.file);
    }
    const service = await Service.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    return res.status(200).json({ message: "Service updated", data: service });
  } catch (error) {
    return next(error);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    return res.status(200).json({ message: "Service deleted" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService
};
