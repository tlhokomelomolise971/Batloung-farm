const router = require('express').Router();
const c = require('../controllers/reportController');
const v = require('../middleware/validate');

router.get('/top-fruits', c.topFruits);
router.get('/revenue', v.dateRange, c.revenue);   // ?from=2026-10-01&to=2026-10-31
router.get('/top-vendor', c.topVendor);
router.get('/stock-levels', c.stockLevels);
module.exports = router;
