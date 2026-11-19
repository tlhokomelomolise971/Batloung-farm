const Purchase = require('../models/purchaseModel');
const AppError = require('../utils/AppError');

exports.create = async (req, res, next) => {
  try {
    const id = await Purchase.create(req.valid);
    res.status(201).json({ success: true, message: 'Purchase recorded and stock increased', data: await Purchase.findById(id) });
  } catch (e) { next(e); }
};
exports.getAll = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await Purchase.findAll() }); } catch (e) { next(e); }
};
exports.getOne = async (req, res, next) => {
  try {
    const p = await Purchase.findById(req.params.id);
    if (!p) throw new AppError(404, `Purchase with ID ${req.params.id} not found`, 'PURCHASE_NOT_FOUND');
    res.status(200).json({ success: true, data: p });
  } catch (e) { next(e); }
};
