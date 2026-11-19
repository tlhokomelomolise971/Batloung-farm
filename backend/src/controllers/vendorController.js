const Vendor = require('../models/vendorModel');
const AppError = require('../utils/AppError');

const mustFind = async (id) => {
  const v = await Vendor.findById(id);
  if (!v) throw new AppError(404, `Vendor with ID ${id} not found`, 'VENDOR_NOT_FOUND');
  return v;
};

exports.create = async (req, res, next) => {
  try {
    const id = await Vendor.create(req.valid);
    res.status(201).json({ success: true, message: 'Vendor registered', data: await Vendor.findById(id) });
  } catch (e) { next(e); }
};
exports.getAll = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await Vendor.findAll() }); } catch (e) { next(e); }
};
exports.search = async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) throw new AppError(400, 'Provide a search term, e.g. /api/vendors/search?q=Mpho or ?q=5812', 'VALIDATION_ERROR');
    const data = await Vendor.search(q);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
};
exports.getOne = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await mustFind(req.params.id) }); } catch (e) { next(e); }
};
exports.update = async (req, res, next) => {
  try {
    await mustFind(req.params.id);
    await Vendor.update(req.params.id, req.valid);
    res.status(200).json({ success: true, message: 'Vendor updated', data: await Vendor.findById(req.params.id) });
  } catch (e) { next(e); }
};
exports.outstanding = async (req, res, next) => {
  try {
    const data = await Vendor.outstanding();
    res.status(200).json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
};
exports.balance = async (req, res, next) => {
  try {
    await mustFind(req.params.id);
    const balance = await Vendor.balance(req.params.id);
    const unpaid_sales = await Vendor.unpaidSales(req.params.id);
    res.status(200).json({ success: true, data: { ...balance, unpaid_sales } });
  } catch (e) { next(e); }
};
