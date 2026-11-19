const router = require('express').Router();
const c = require('../controllers/purchaseController');
const v = require('../middleware/validate');

router.post('/', v.purchaseBody, c.create);
router.get('/', c.getAll);
router.get('/:id', v.id(), c.getOne);
module.exports = router;
