const Stock = require('../models/stockModel');
const Fruit = require('../models/fruitModel');
const AppError = require('../utils/AppError');

exports.getAll = async (req, res, next) => {
  try {
    let fruitId;
    if (req.query.fruit_id !== undefined) {
      fruitId = Number(req.query.fruit_id);
      if (!Number.isInteger(fruitId) || fruitId <= 0) throw new AppError(400, 'fruit_id must be a positive whole number', 'VALIDATION_ERROR');
      if (!(await Fruit.findById(fruitId))) throw new AppError(404, `Fruit with ID ${fruitId} not found`, 'FRUIT_NOT_FOUND');
    }
    res.status(200).json({ success: true, data: await Stock.all(fruitId) });
  } catch (e) { next(e); }
};
exports.getLow = async (req, res, next) => {
  try {
    let threshold;
    if (req.query.threshold !== undefined) {
      threshold = Number(req.query.threshold);
      if (!Number.isInteger(threshold) || threshold < 0) throw new AppError(400, 'threshold must be a whole number, 0 or more', 'VALIDATION_ERROR');
    }
    const data = await Stock.low(threshold);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
};
exports.getMovements = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 500);
    res.status(200).json({ success: true, data: await Stock.movements(limit) });
  } catch (e) { next(e); }
};
