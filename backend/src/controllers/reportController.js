const Report = require('../models/reportModel');

exports.topFruits = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await Report.topFruits() }); } catch (e) { next(e); }
};
exports.revenue = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    res.status(200).json({ success: true, data: { from, to, ...(await Report.revenue(from, to)) } });
  } catch (e) { next(e); }
};
exports.topVendor = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: (await Report.topVendor()) || null }); } catch (e) { next(e); }
};
exports.stockLevels = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await Report.stockLevels() }); } catch (e) { next(e); }
};
