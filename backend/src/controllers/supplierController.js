const Supplier = require('../models/supplierModel');
const AppError = require('../utils/AppError');

const mustFind = async (id) => {
  const s = await Supplier.findById(id);
  if (!s) throw new AppError(404, `Supplier with ID ${id} not found`, 'SUPPLIER_NOT_FOUND');
  return s;
};

exports.create = async (req, res, next) => {
  try {
    const id = await Supplier.create(req.valid);
    res.status(201).json({ success: true, message: 'Supplier registered', data: await Supplier.findById(id) });
  } catch (e) { next(e); }
};
exports.getAll = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await Supplier.findAll() }); } catch (e) { next(e); }
};
exports.getOne = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await mustFind(req.params.id) }); } catch (e) { next(e); }
};
exports.update = async (req, res, next) => {
  try {
    await mustFind(req.params.id);
    await Supplier.update(req.params.id, req.valid);
    res.status(200).json({ success: true, message: 'Supplier updated', data: await Supplier.findById(req.params.id) });
  } catch (e) { next(e); }
};
exports.remove = async (req, res, next) => {
  try {
    await mustFind(req.params.id);
    const n = await Supplier.countPurchases(req.params.id);
    if (n > 0) {
      throw new AppError(409, `Supplier has ${n} purchase record(s) and cannot be deleted`, 'SUPPLIER_HAS_PURCHASES');
    }
    await Supplier.remove(req.params.id);
    res.status(200).json({ success: true, message: 'Supplier deleted' });
  } catch (e) { next(e); }
};
