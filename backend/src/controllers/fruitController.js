const Fruit = require('../models/fruitModel');
const AppError = require('../utils/AppError');

const mustFind = async (id) => {
  const f = await Fruit.findById(id);
  if (!f) throw new AppError(404, `Fruit with ID ${id} not found`, 'FRUIT_NOT_FOUND');
  return f;
};

exports.create = async (req, res, next) => {
  try {
    const id = await Fruit.create(req.valid);
    res.status(201).json({ success: true, message: 'Fruit registered (stock rows created for all sizes)', data: await Fruit.findById(id) });
  } catch (e) { next(e); }
};
exports.getAll = async (req, res, next) => {
  try {
    const status = String(req.query.status || 'ACTIVE').toUpperCase();
    if (!['ACTIVE', 'INACTIVE', 'ALL'].includes(status)) throw new AppError(400, 'status must be ACTIVE, INACTIVE or ALL', 'VALIDATION_ERROR');
    res.status(200).json({ success: true, data: await Fruit.findAll(status) });
  } catch (e) { next(e); }
};
exports.getOne = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await mustFind(req.params.id) }); } catch (e) { next(e); }
};
exports.update = async (req, res, next) => {
  try {
    await mustFind(req.params.id);
    await Fruit.update(req.params.id, req.valid);
    res.status(200).json({ success: true, message: 'Fruit updated', data: await Fruit.findById(req.params.id) });
  } catch (e) { next(e); }
};
exports.setPrices = async (req, res, next) => {
  try {
    await mustFind(req.params.id);
    await Fruit.setPrices(req.params.id, req.valid.prices);
    res.status(200).json({ success: true, message: 'Selling prices saved', data: await Fruit.findById(req.params.id) });
  } catch (e) { next(e); }
};
