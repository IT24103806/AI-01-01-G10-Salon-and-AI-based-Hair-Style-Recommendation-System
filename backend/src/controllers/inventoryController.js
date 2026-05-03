const Product = require("../models/Product");
const ProductOrder = require("../models/ProductOrder");
const { buildSimpleReceiptPdf } = require("../utils/pdfReceipt");

const PAYMENT_METHODS = ["cash", "card", "online"];
const ORDER_STATUSES = ["unpaid", "paid", "refunded"];
const PRODUCT_AUDIENCES = ["customer", "staff"];

const pad2 = (value) => String(value).padStart(2, "0");
const generateRef = (prefix) => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
};

const normalizeMethod = (value) => {
  const method = String(value || "").trim().toLowerCase();
  return PAYMENT_METHODS.includes(method) ? method : "online";
};

const normalizeStatus = (value) => {
  const status = String(value || "").trim().toLowerCase();
  return ORDER_STATUSES.includes(status) ? status : "unpaid";
};

const normalizeAudience = (value) => {
  const audience = String(value || "").trim().toLowerCase();
  return PRODUCT_AUDIENCES.includes(audience) ? audience : "customer";
};

const resolveProductAudience = (product) => {
  const audience = String(product?.audience || "").trim().toLowerCase();
  return audience === "staff" ? "staff" : "customer";
};

const listProducts = async (req, res, next) => {
  try {
    const requestedAudience = normalizeAudience(req.query.audience);
    let filter = { isActive: true };
    if (req.user.role === "admin") {
      filter = requestedAudience === "staff" ? { audience: "staff" } : { $or: [{ audience: "customer" }, { audience: { $exists: false } }] };
    } else if (req.user.role === "staff") {
      filter.audience = "staff";
    } else {
      filter.$or = [{ audience: "customer" }, { audience: { $exists: false } }];
    }
    const products = await Product.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ data: products });
  } catch (error) {
    return next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const productImage = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
      : "";
    const product = await Product.create({
      ...req.body,
      name: String(req.body.name || "").trim(),
      description: String(req.body.description || "").trim(),
      category: String(req.body.category || "").trim(),
      audience: normalizeAudience(req.body.audience),
      supplierName: String(req.body.supplierName || "").trim(),
      supplierPhone: String(req.body.supplierPhone || "").trim(),
      supplierEmail: String(req.body.supplierEmail || "").trim(),
      productImage
    });
    return res.status(201).json({ message: "Product created", data: product });
  } catch (error) {
    return next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.name != null) updates.name = String(updates.name).trim();
    if (updates.description != null) updates.description = String(updates.description).trim();
    if (updates.category != null) updates.category = String(updates.category).trim();
    if (updates.audience != null) updates.audience = normalizeAudience(updates.audience);
    if (updates.supplierName != null) updates.supplierName = String(updates.supplierName).trim();
    if (updates.supplierPhone != null) updates.supplierPhone = String(updates.supplierPhone).trim();
    if (updates.supplierEmail != null) updates.supplierEmail = String(updates.supplierEmail).trim();
    if (req.file) {
      updates.productImage = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.status(200).json({ message: "Product updated", data: product });
  } catch (error) {
    return next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    return next(error);
  }
};

const trackProductUsage = async (req, res, next) => {
  try {
    const qty = Number(req.body.quantity || 0);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ message: "quantity must be a positive number" });
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    product.usageCount += qty;
    await product.save();
    return res.status(200).json({ message: "Product usage updated", data: product });
  } catch (error) {
    return next(error);
  }
};

const createOrder = async (req, res, next) => {
  try {
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (!rawItems.length) {
      return res.status(400).json({ message: "At least one product item is required" });
    }

    const method = normalizeMethod(req.body.method);
    const productIds = rawItems.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true });
    const productsMap = new Map(products.map((item) => [String(item._id), item]));
    const roleAudience = req.user.role === "staff" ? "staff" : "customer";
    const items = [];
    let subtotal = 0;

    for (const row of rawItems) {
      const product = productsMap.get(String(row.productId));
      const quantity = Number(row.quantity || 0);
      if (!product) {
        return res.status(404).json({ message: "One or more products are unavailable" });
      }
      if (req.user.role !== "admin" && resolveProductAudience(product) !== roleAudience) {
        return res.status(403).json({ message: "You can only order products from your inventory section" });
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ message: "Quantity must be greater than zero" });
      }
      if (product.stockQty < quantity) {
        return res.status(400).json({ message: `${product.name} has insufficient stock` });
      }
      const unitPrice = Number(product.price || 0);
      const total = unitPrice * quantity;
      subtotal += total;
      items.push({
        productId: product._id,
        name: product.name,
        quantity,
        unitPrice,
        total
      });
    }

    const total = subtotal;
    const transactionId = generateRef("PTXN");
    const invoiceNumber = generateRef("PINV");
    const deliveryAddress = String(req.body.deliveryAddress || "").trim();
    const order = await ProductOrder.create({
      customerId: req.user._id,
      items,
      subtotal,
      total,
      method,
      status: "unpaid",
      transactionId,
      invoiceNumber,
      currency: "LKR",
      audience: roleAudience,
      note: String(req.body.note || "").trim(),
      deliveryAddress,
      transactions: [
        {
          transactionId,
          status: "unpaid",
          method,
          amount: total,
          note: "Order created"
        }
      ]
    });

    const populated = await ProductOrder.findById(order._id)
      .populate("customerId", "name email")
      .populate("items.productId", "name category");

    return res.status(201).json({ message: "Product order created", data: populated });
  } catch (error) {
    return next(error);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const orders = await ProductOrder.find({ customerId: req.user._id })
      .populate("items.productId", "name category")
      .sort({ createdAt: -1 });
    return res.status(200).json({ data: orders });
  } catch (error) {
    return next(error);
  }
};

const getAllOrders = async (req, res, next) => {
  try {
    const orders = await ProductOrder.find()
      .populate("customerId", "name email")
      .populate("items.productId", "name category")
      .sort({ createdAt: -1 });
    return res.status(200).json({ data: orders });
  } catch (error) {
    return next(error);
  }
};

const markOrderStatus = async (req, res, next) => {
  try {
    const order = await ProductOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const isOwner = String(order.customerId) === String(req.user._id);
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const nextStatus = normalizeStatus(req.body.status);
    if (nextStatus === "refunded" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can mark orders as refunded" });
    }

    const previousStatus = normalizeStatus(order.status);
    const method = normalizeMethod(req.body.method || order.method);

    const requiresStockDeduction = previousStatus !== "paid" && nextStatus === "paid";
    const requiresStockRestore = previousStatus === "paid" && nextStatus !== "paid";

    if (requiresStockDeduction || requiresStockRestore) {
      for (const row of order.items) {
        const product = await Product.findById(row.productId);
        if (!product) continue;
        if (requiresStockDeduction && product.stockQty < row.quantity) {
          return res.status(400).json({ message: `${row.name} has insufficient stock for this order` });
        }
      }

      for (const row of order.items) {
        const product = await Product.findById(row.productId);
        if (!product) continue;
        if (requiresStockDeduction) {
          product.stockQty -= row.quantity;
          product.usageCount += row.quantity;
        } else if (requiresStockRestore) {
          product.stockQty += row.quantity;
          product.usageCount = Math.max(0, Number(product.usageCount || 0) - row.quantity);
        }
        await product.save();
      }
    }

    order.status = nextStatus;
    order.method = method;
    if (nextStatus === "paid") {
      order.paidAt = new Date();
      order.refundedAt = null;
    } else if (nextStatus === "refunded") {
      order.refundedAt = new Date();
    }

    const transactionId = generateRef(nextStatus === "refunded" ? "PRFD" : "PTXN");
    order.transactionId = transactionId;
    order.transactions.push({
      transactionId,
      status: nextStatus,
      method,
      amount: order.total,
      note: String(req.body.note || `Order marked as ${nextStatus}`).trim()
    });

    await order.save();
    const populated = await ProductOrder.findById(order._id)
      .populate("customerId", "name email")
      .populate("items.productId", "name category");

    return res.status(200).json({ message: "Order status updated", data: populated });
  } catch (error) {
    return next(error);
  }
};

const getInventoryReport = async (req, res, next) => {
  try {
    const requestedAudience = normalizeAudience(req.query.audience);
    const productFilter = requestedAudience === "staff" ? { audience: "staff" } : { $or: [{ audience: "customer" }, { audience: { $exists: false } }] };
    const orderFilter = requestedAudience === "staff" ? { audience: "staff" } : { $or: [{ audience: "customer" }, { audience: { $exists: false } }] };
    const products = await Product.find(productFilter).sort({ createdAt: -1 });
    const orders = await ProductOrder.find(orderFilter).select("status total transactions");

    const lowStockProducts = products.filter((item) => Number(item.stockQty || 0) <= Number(item.reorderLevel || 0));
    const summary = {
      totalProducts: products.length,
      activeProducts: products.filter((item) => item.isActive).length,
      lowStockCount: lowStockProducts.length,
      totalStockUnits: products.reduce((sum, item) => sum + Number(item.stockQty || 0), 0),
      totalStockValue: products.reduce((sum, item) => sum + Number(item.stockQty || 0) * Number(item.price || 0), 0)
    };

    const orderSummary = {
      unpaidCount: 0,
      paidCount: 0,
      refundedCount: 0,
      unpaidAmount: 0,
      paidAmount: 0,
      refundedAmount: 0,
      netRevenue: 0,
      totalTransactions: 0
    };

    orders.forEach((order) => {
      const status = normalizeStatus(order.status);
      const total = Number(order.total || 0);
      orderSummary.totalTransactions += Array.isArray(order.transactions) ? order.transactions.length : 0;
      if (status === "paid") {
        orderSummary.paidCount += 1;
        orderSummary.paidAmount += total;
      } else if (status === "refunded") {
        orderSummary.refundedCount += 1;
        orderSummary.refundedAmount += total;
      } else {
        orderSummary.unpaidCount += 1;
        orderSummary.unpaidAmount += total;
      }
    });
    orderSummary.netRevenue = orderSummary.paidAmount - orderSummary.refundedAmount;

    const topUsedProducts = [...products]
      .sort((a, b) => Number(b.usageCount || 0) - Number(a.usageCount || 0))
      .slice(0, 5)
      .map((item) => ({
        _id: item._id,
        name: item.name,
        usageCount: item.usageCount
      }));

    return res.status(200).json({
      data: {
        summary,
        lowStockProducts,
        topUsedProducts,
        orderSummary
      }
    });
  } catch (error) {
    return next(error);
  }
};

const getOrderReceipt = async (req, res, next) => {
  try {
    const order = await ProductOrder.findById(req.params.id)
      .populate("customerId", "name email phone")
      .populate("items.productId", "name category");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const status = normalizeStatus(order.status);
    if (status !== "paid" && status !== "refunded") {
      return res.status(400).json({ message: "Receipt is available only after payment is completed" });
    }

    const isOwner = String(order.customerId?._id || order.customerId) === String(req.user._id);
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const tx = Array.isArray(order.transactions) && order.transactions.length
      ? order.transactions[order.transactions.length - 1]
      : null;
    const paidAt = order.paidAt || tx?.createdAt || order.updatedAt || order.createdAt;
    const invoicePayload = {
      invoiceNo: order.invoiceNumber || "N/A",
      date: new Date(paidAt).toLocaleDateString(),
      paymentMethod: String(order.method || tx?.method || "online").toUpperCase(),
      status: String(status).toUpperCase(),
      customerName: order.customerId?.name || "N/A",
      customerEmail: order.customerId?.email || "N/A",
      customerPhone: order.customerId?.phone || "N/A",
      items: (order.items || []).map((item, index) => ({
        no: index + 1,
        product: item?.name || item?.productId?.name || "Product",
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        total: Number(item.total || 0)
      })),
      subtotal: Number(order.subtotal || 0),
      discount: 0,
      tax: 0,
      total: Number(order.total || 0),
      currency: order.currency || "LKR",
      notes: `Delivery Address: ${order.deliveryAddress || "N/A"}`
    };

    const safeInvoice = String(order.invoiceNumber || order._id).replace(/[^a-zA-Z0-9-_]/g, "");
    const pdfBuffer = await buildSimpleReceiptPdf(invoicePayload);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"order-receipt-${safeInvoice}.pdf\"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
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
};
