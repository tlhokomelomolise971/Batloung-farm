const Sale = require('../models/saleModel');
const AppError = require('../utils/AppError');
const { pickEnum } = require('../middleware/validate');

exports.create = async (req, res, next) => {
  try {
    const id = await Sale.create(req.valid);
    res.status(201).json({ success: true, message: 'Sale recorded and stock reduced', data: await Sale.findById(id) });
  } catch (e) { next(e); }
};
exports.getAll = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.vendor_id !== undefined) {
      const v = Number(req.query.vendor_id);
      if (!Number.isInteger(v) || v <= 0) throw new AppError(400, 'vendor_id must be a positive whole number', 'VALIDATION_ERROR');
      filters.vendor_id = v;
    }
    if (req.query.payment_status !== undefined) {
      const s = pickEnum(['PAID', 'PARTIALLY_PAID', 'UNPAID'], req.query.payment_status);
      if (!s) throw new AppError(400, 'payment_status must be PAID, PARTIALLY_PAID or UNPAID', 'VALIDATION_ERROR');
      filters.payment_status = s;
    }
    res.status(200).json({ success: true, data: await Sale.findAll(filters) });
  } catch (e) { next(e); }
};
exports.getOne = async (req, res, next) => {
  try {
    const s = await Sale.findById(req.params.id);
    if (!s) throw new AppError(404, `Sale with ID ${req.params.id} not found`, 'SALE_NOT_FOUND');
    res.status(200).json({ success: true, data: s });
  } catch (e) { next(e); }
};
exports.addPayment = async (req, res, next) => {
  try {
    await Sale.addPayment(req.params.id, req.valid);
    res.status(201).json({ success: true, message: 'Payment recorded', data: await Sale.findById(req.params.id) });
  } catch (e) { next(e); }
};
