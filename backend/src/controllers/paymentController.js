const Payment = require("../models/Payment");
const Appointment = require("../models/Appointment");
const Service = require("../models/Service");
const User = require("../models/User");
const ProductOrder = require("../models/ProductOrder");
const Staff = require("../models/Staff");
const { buildSimpleReceiptPdf } = require("../utils/pdfReceipt");

const PAYMENT_METHODS = ["cash", "card", "online"];
const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"];

const toCanonicalStatus = (status) => {
  const value = String(status || "").trim().toLowerCase();
  if (value === "pending") return "unpaid";
  if (value === "failed") return "unpaid";
  if (PAYMENT_STATUSES.includes(value)) return value;
  return "unpaid";
};

const pad2 = (value) => String(value).padStart(2, "0");

const formatDateKey = (dateInput) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const formatMonthKey = (dateInput) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
};

const generateRef = (prefix) => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
};

const buildInvoiceData = ({ appointment, service, customer, amount }) => {
  const lineTotal = Number(amount || 0);
  const lineItem = {
    label: service?.name || "Salon Service",
    qty: 1,
    unitPrice: lineTotal,
    total: lineTotal
  };
  return {
    issuedAt: new Date(),
    customerName: customer?.name || "",
    customerEmail: customer?.email || "",
    serviceName: service?.name || "",
    appointmentDate: appointment?.date || "",
    appointmentTime: appointment?.time || "",
    lineItems: [lineItem],
    subtotal: lineTotal,
    discount: 0,
    tax: 0,
    total: lineTotal
  };
};

const ensurePaymentAccess = (req, appointment) => {
  if (req.user.role === "admin") return true;
  return String(appointment.userId) === String(req.user._id);
};

const createPayment = async (req, res, next) => {
  try {
    const { appointmentId, amount, method } = req.body;
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!ensurePaymentAccess(req, appointment)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const existing = await Payment.findOne({ appointmentId });
    if (existing) {
      return res.status(409).json({ message: "Payment already exists for this appointment" });
    }

    const service = await Service.findById(appointment.serviceId).select("name price");
    const customer = await User.findById(appointment.userId).select("name email");
    const selectedMethod = PAYMENT_METHODS.includes(String(method || "").toLowerCase())
      ? String(method).toLowerCase()
      : "cash";
    const computedAmount = Number(amount ?? service?.price ?? 0);
    if (!Number.isFinite(computedAmount) || computedAmount < 0) {
      return res.status(400).json({ message: "Amount must be a non-negative number" });
    }

    const transactionId = generateRef("TXN");
    const invoiceNumber = generateRef("INV");
    const invoice = buildInvoiceData({
      appointment,
      service,
      customer,
      amount: computedAmount
    });

    const payment = await Payment.create({
      appointmentId,
      amount: computedAmount,
      method: selectedMethod,
      status: "unpaid",
      transactionId,
      invoiceNumber,
      currency: "LKR",
      invoice,
      transactions: [
        {
          transactionId,
          method: selectedMethod,
          amount: computedAmount,
          status: "unpaid",
          note: "Payment initiated"
        }
      ]
    });

    const populated = await Payment.findById(payment._id).populate({
      path: "appointmentId",
      populate: [{ path: "userId", select: "name email" }, { path: "serviceId", select: "name price" }]
    });
    return res.status(201).json({ message: "Payment created", data: populated });
  } catch (error) {
    return next(error);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find()
      .populate({
        path: "appointmentId",
        populate: [
          { path: "userId", select: "name email" },
          { path: "serviceId", select: "name price" },
          { path: "staffId", select: "name role staffCode userId" }
        ]
      })
      .sort({ createdAt: -1 });

    const normalized = payments.map((payment) => ({
      ...payment.toObject(),
      status: toCanonicalStatus(payment.status)
    }));

    if (req.user.role === "admin") {
      return res.status(200).json({ data: normalized });
    }

    const filtered = normalized.filter((payment) => {
      if (!payment.appointmentId) return false;
      if (req.user.role === "staff") {
        const staffOwnerId = payment.appointmentId?.staffId?.userId?._id || payment.appointmentId?.staffId?.userId;
        if (!staffOwnerId) return false;
        return String(staffOwnerId) === String(req.user._id);
      }
      if (!payment.appointmentId.userId) return false;
      return String(payment.appointmentId.userId._id) === String(req.user._id);
    });
    return res.status(200).json({ data: filtered });
  } catch (error) {
    return next(error);
  }
};

const markPaymentStatus = async (req, res, next) => {
  try {
    const { status, method, note } = req.body;
    const nextStatus = toCanonicalStatus(status);
    if (!PAYMENT_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const appointment = await Appointment.findById(payment.appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const isOwner = String(appointment.userId) === String(req.user._id);
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (nextStatus === "refunded" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can mark a payment as refunded" });
    }

    const currentStatus = toCanonicalStatus(payment.status);
    const previousMethod = payment.method;
    const nextMethod = PAYMENT_METHODS.includes(String(method || "").toLowerCase())
      ? String(method).toLowerCase()
      : payment.method;

    payment.status = nextStatus;
    payment.method = nextMethod;
    if (nextStatus === "paid") {
      payment.paidAt = new Date();
      payment.refundedAt = null;
    } else if (nextStatus === "refunded") {
      payment.refundedAt = new Date();
    }

    if (currentStatus !== nextStatus || nextMethod !== previousMethod) {
      const transactionId = generateRef(nextStatus === "refunded" ? "RFND" : "TXN");
      payment.transactionId = transactionId;
      payment.transactions.push({
        transactionId,
        method: nextMethod,
        amount: payment.amount,
        status: nextStatus,
        note: String(note || "").trim()
      });
    }

    if (nextStatus === "paid" && appointment.status === "pending") {
      appointment.status = "approved";
      await appointment.save();
    }

    await payment.save();
    const populated = await Payment.findById(payment._id).populate({
      path: "appointmentId",
      populate: [{ path: "userId", select: "name email" }, { path: "serviceId", select: "name price" }]
    });

    return res.status(200).json({
      message: "Payment status updated",
      data: { ...populated.toObject(), status: toCanonicalStatus(populated.status) }
    });
  } catch (error) {
    return next(error);
  }
};

const getPaymentByAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId).populate([
      { path: "userId", select: "name email" },
      { path: "serviceId", select: "name price" }
    ]);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!ensurePaymentAccess(req, appointment)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const payment = await Payment.findOne({ appointmentId: req.params.appointmentId });
    if (!payment) {
      const service = appointment.serviceId;
      const amount = Number(service?.price || 0);
      return res.status(200).json({
        data: {
          appointmentId: appointment._id,
          amount,
          status: "unpaid",
          method: "cash",
          currency: "LKR",
          invoice: buildInvoiceData({
            appointment,
            service,
            customer: appointment.userId,
            amount
          }),
          transactions: []
        }
      });
    }

    return res.status(200).json({
      data: {
        ...payment.toObject(),
        status: toCanonicalStatus(payment.status)
      }
    });
  } catch (error) {
    return next(error);
  }
};

const getRevenueSummary = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can view accounting summary" });
    }

    const [payments, productOrders] = await Promise.all([
      Payment.find().select("amount status createdAt paidAt refundedAt transactions"),
      ProductOrder.find().select("total status createdAt paidAt refundedAt transactions")
    ]);
    const summary = {
      totalSources: {
        appointmentPayments: payments.length,
        productOrders: productOrders.length
      },
      totalPayments: payments.length,
      unpaidCount: 0,
      paidCount: 0,
      refundedCount: 0,
      unpaidAmount: 0,
      paidAmount: 0,
      refundedAmount: 0,
      netRevenue: 0,
      totalTransactions: 0,
      productSales: {
        unpaidCount: 0,
        paidCount: 0,
        refundedCount: 0,
        unpaidAmount: 0,
        paidAmount: 0,
        refundedAmount: 0,
        netRevenue: 0,
        totalTransactions: 0
      }
    };

    payments.forEach((payment) => {
      const status = toCanonicalStatus(payment.status);
      const amount = Number(payment.amount || 0);
      if (status === "paid") {
        summary.paidCount += 1;
        summary.paidAmount += amount;
      } else if (status === "refunded") {
        summary.refundedCount += 1;
        summary.refundedAmount += amount;
      } else {
        summary.unpaidCount += 1;
        summary.unpaidAmount += amount;
      }
      summary.totalTransactions += Array.isArray(payment.transactions) ? payment.transactions.length : 0;
    });

    productOrders.forEach((order) => {
      const status = toCanonicalStatus(order.status);
      const amount = Number(order.total || 0);
      if (status === "paid") {
        summary.productSales.paidCount += 1;
        summary.productSales.paidAmount += amount;
      } else if (status === "refunded") {
        summary.productSales.refundedCount += 1;
        summary.productSales.refundedAmount += amount;
      } else {
        summary.productSales.unpaidCount += 1;
        summary.productSales.unpaidAmount += amount;
      }
      summary.productSales.totalTransactions += Array.isArray(order.transactions) ? order.transactions.length : 0;
    });

    summary.productSales.netRevenue = summary.productSales.paidAmount - summary.productSales.refundedAmount;
    summary.unpaidCount += summary.productSales.unpaidCount;
    summary.paidCount += summary.productSales.paidCount;
    summary.refundedCount += summary.productSales.refundedCount;
    summary.unpaidAmount += summary.productSales.unpaidAmount;
    summary.paidAmount += summary.productSales.paidAmount;
    summary.refundedAmount += summary.productSales.refundedAmount;
    summary.totalTransactions += summary.productSales.totalTransactions;
    summary.netRevenue = summary.paidAmount - summary.refundedAmount;
    return res.status(200).json({ data: summary });
  } catch (error) {
    return next(error);
  }
};

const getDailyReport = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can view transaction reports" });
    }
    const monthKey = String(req.query.month || formatMonthKey(new Date()));
    const monthMatcher = /^\d{4}-\d{2}$/;
    if (!monthMatcher.test(monthKey)) {
      return res.status(400).json({ message: "month must be in YYYY-MM format" });
    }

    const [year, month] = monthKey.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const [payments, productOrders] = await Promise.all([
      Payment.find({
        updatedAt: { $gte: start, $lte: end }
      }).select("amount status updatedAt transactions"),
      ProductOrder.find({
        updatedAt: { $gte: start, $lte: end }
      }).select("total status updatedAt transactions")
    ]);

    const map = new Map();
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = `${year}-${pad2(month)}-${pad2(day)}`;
      map.set(key, { date: key, transactions: 0, paidAmount: 0, refundedAmount: 0, netRevenue: 0 });
    }

    payments.forEach((payment) => {
      if (Array.isArray(payment.transactions) && payment.transactions.length) {
        payment.transactions.forEach((tx) => {
          const dayKey = formatDateKey(tx.createdAt || payment.updatedAt);
          if (!dayKey.startsWith(monthKey) || !map.has(dayKey)) return;
          const row = map.get(dayKey);
          row.transactions += 1;
          if (tx.status === "paid") row.paidAmount += Number(tx.amount || 0);
          if (tx.status === "refunded") row.refundedAmount += Number(tx.amount || 0);
          row.netRevenue = row.paidAmount - row.refundedAmount;
          map.set(dayKey, row);
        });
      } else {
        const dayKey = formatDateKey(payment.updatedAt);
        if (!dayKey.startsWith(monthKey) || !map.has(dayKey)) return;
        const status = toCanonicalStatus(payment.status);
        const amount = Number(payment.amount || 0);
        const row = map.get(dayKey);
        row.transactions += 1;
        if (status === "paid") row.paidAmount += amount;
        if (status === "refunded") row.refundedAmount += amount;
        row.netRevenue = row.paidAmount - row.refundedAmount;
        map.set(dayKey, row);
      }
    });

    productOrders.forEach((order) => {
      if (Array.isArray(order.transactions) && order.transactions.length) {
        order.transactions.forEach((tx) => {
          const dayKey = formatDateKey(tx.createdAt || order.updatedAt);
          if (!dayKey.startsWith(monthKey) || !map.has(dayKey)) return;
          const row = map.get(dayKey);
          row.transactions += 1;
          if (tx.status === "paid") row.paidAmount += Number(tx.amount || 0);
          if (tx.status === "refunded") row.refundedAmount += Number(tx.amount || 0);
          row.netRevenue = row.paidAmount - row.refundedAmount;
          map.set(dayKey, row);
        });
      } else {
        const dayKey = formatDateKey(order.updatedAt);
        if (!dayKey.startsWith(monthKey) || !map.has(dayKey)) return;
        const status = toCanonicalStatus(order.status);
        const amount = Number(order.total || 0);
        const row = map.get(dayKey);
        row.transactions += 1;
        if (status === "paid") row.paidAmount += amount;
        if (status === "refunded") row.refundedAmount += amount;
        row.netRevenue = row.paidAmount - row.refundedAmount;
        map.set(dayKey, row);
      }
    });

    return res.status(200).json({ data: Array.from(map.values()) });
  } catch (error) {
    return next(error);
  }
};

const getMonthlyReport = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can view transaction reports" });
    }
    const year = Number(req.query.year || new Date().getFullYear());
    if (!Number.isInteger(year) || year < 2000 || year > 3000) {
      return res.status(400).json({ message: "year must be a valid 4-digit year" });
    }

    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);
    const [payments, productOrders] = await Promise.all([
      Payment.find({
        updatedAt: { $gte: start, $lte: end }
      }).select("amount status updatedAt transactions"),
      ProductOrder.find({
        updatedAt: { $gte: start, $lte: end }
      }).select("total status updatedAt transactions")
    ]);

    const map = new Map();
    for (let month = 1; month <= 12; month += 1) {
      const key = `${year}-${pad2(month)}`;
      map.set(key, { month: key, transactions: 0, paidAmount: 0, refundedAmount: 0, netRevenue: 0 });
    }

    payments.forEach((payment) => {
      if (Array.isArray(payment.transactions) && payment.transactions.length) {
        payment.transactions.forEach((tx) => {
          const monthKey = formatMonthKey(tx.createdAt || payment.updatedAt);
          if (!monthKey.startsWith(String(year)) || !map.has(monthKey)) return;
          const row = map.get(monthKey);
          row.transactions += 1;
          if (tx.status === "paid") row.paidAmount += Number(tx.amount || 0);
          if (tx.status === "refunded") row.refundedAmount += Number(tx.amount || 0);
          row.netRevenue = row.paidAmount - row.refundedAmount;
          map.set(monthKey, row);
        });
      } else {
        const monthKey = formatMonthKey(payment.updatedAt);
        if (!monthKey.startsWith(String(year)) || !map.has(monthKey)) return;
        const status = toCanonicalStatus(payment.status);
        const amount = Number(payment.amount || 0);
        const row = map.get(monthKey);
        row.transactions += 1;
        if (status === "paid") row.paidAmount += amount;
        if (status === "refunded") row.refundedAmount += amount;
        row.netRevenue = row.paidAmount - row.refundedAmount;
        map.set(monthKey, row);
      }
    });

    productOrders.forEach((order) => {
      if (Array.isArray(order.transactions) && order.transactions.length) {
        order.transactions.forEach((tx) => {
          const monthEntryKey = formatMonthKey(tx.createdAt || order.updatedAt);
          if (!monthEntryKey.startsWith(String(year)) || !map.has(monthEntryKey)) return;
          const row = map.get(monthEntryKey);
          row.transactions += 1;
          if (tx.status === "paid") row.paidAmount += Number(tx.amount || 0);
          if (tx.status === "refunded") row.refundedAmount += Number(tx.amount || 0);
          row.netRevenue = row.paidAmount - row.refundedAmount;
          map.set(monthEntryKey, row);
        });
      } else {
        const monthEntryKey = formatMonthKey(order.updatedAt);
        if (!monthEntryKey.startsWith(String(year)) || !map.has(monthEntryKey)) return;
        const status = toCanonicalStatus(order.status);
        const amount = Number(order.total || 0);
        const row = map.get(monthEntryKey);
        row.transactions += 1;
        if (status === "paid") row.paidAmount += amount;
        if (status === "refunded") row.refundedAmount += amount;
        row.netRevenue = row.paidAmount - row.refundedAmount;
        map.set(monthEntryKey, row);
      }
    });

    return res.status(200).json({ data: Array.from(map.values()) });
  } catch (error) {
    return next(error);
  }
};

const getPaymentReceipt = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate({
        path: "appointmentId",
        populate: [
          { path: "userId", select: "name email phone" },
          { path: "serviceId", select: "name price duration" },
          { path: "staffId", select: "name role userId" }
        ]
      });

    if (!payment || !payment.appointmentId) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const status = toCanonicalStatus(payment.status);
    if (status !== "paid" && status !== "refunded") {
      return res.status(400).json({ message: "Receipt is available only after payment is completed" });
    }

    const appointment = payment.appointmentId;
    const customerId = appointment?.userId?._id || appointment?.userId;
    const staffRecordId = appointment?.staffId?._id || appointment?.staffId;
    let staffOwnerUserId = appointment?.staffId?.userId || null;

    if (!staffOwnerUserId && staffRecordId) {
      const staffRecord = await Staff.findById(staffRecordId).select("userId");
      staffOwnerUserId = staffRecord?.userId || null;
    }

    const canAccess =
      req.user.role === "admin" ||
      String(customerId) === String(req.user._id) ||
      String(staffOwnerUserId || "") === String(req.user._id);

    if (!canAccess) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const tx = Array.isArray(payment.transactions) && payment.transactions.length
      ? payment.transactions[payment.transactions.length - 1]
      : null;
    const customerName = appointment?.userId?.name || payment?.invoice?.customerName || "N/A";
    const customerEmail = appointment?.userId?.email || payment?.invoice?.customerEmail || "N/A";
    const serviceName = appointment?.serviceId?.name || payment?.invoice?.serviceName || "Salon Service";
    const staffName = appointment?.staffId?.name || "N/A";
    const paidAt = payment.paidAt || tx?.createdAt || payment.updatedAt || payment.createdAt;
    const invoicePayload = {
      invoiceNo: payment.invoiceNumber || "N/A",
      date: new Date(paidAt).toLocaleDateString(),
      paymentMethod: String(payment.method || tx?.method || "online").toUpperCase(),
      status: String(status).toUpperCase(),
      customerName,
      customerEmail,
      customerPhone: appointment?.userId?.phone || "N/A",
      items: [
        {
          no: 1,
          product: serviceName,
          quantity: 1,
          unitPrice: Number(payment.amount || 0),
          total: Number(payment.amount || 0)
        }
      ],
      subtotal: Number(payment.amount || 0),
      discount: 0,
      tax: 0,
      total: Number(payment.amount || 0),
      currency: payment.currency || "LKR",
      notes: `Appointment: ${appointment?.date || "N/A"} ${appointment?.time || ""}`.trim()
    };

    const safeInvoice = String(payment.invoiceNumber || payment._id).replace(/[^a-zA-Z0-9-_]/g, "");
    const pdfBuffer = await buildSimpleReceiptPdf(invoicePayload);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"payment-receipt-${safeInvoice}.pdf\"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createPayment,
  getPayments,
  markPaymentStatus,
  getPaymentByAppointment,
  getRevenueSummary,
  getDailyReport,
  getMonthlyReport,
  getPaymentReceipt
};
