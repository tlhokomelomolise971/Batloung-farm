const router = require('express').Router();
const c = require('../controllers/saleController');
const v = require('../middleware/validate');

router.post('/', v.saleBody, c.create);
router.get('/', c.getAll);
router.get('/:id', v.id(), c.getOne);
router.post('/:id/payments', v.id(), v.paymentBody, c.addPayment);
module.exports = router;
