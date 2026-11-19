const router = require('express').Router();
router.use('/suppliers', require('./supplierRoutes'));
router.use('/fruits', require('./fruitRoutes'));
router.use('/stock', require('./stockRoutes'));
router.use('/vendors', require('./vendorRoutes'));
router.use('/purchases', require('./purchaseRoutes'));
router.use('/sales', require('./saleRoutes'));
router.use('/reports', require('./reportRoutes'));
module.exports = router;
