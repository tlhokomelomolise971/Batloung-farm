const router = require('express').Router();
const c = require('../controllers/vendorController');
const v = require('../middleware/validate');

router.post('/', v.body(v.vendorRules), c.create);
router.get('/', c.getAll);
router.get('/search', c.search);          // keep before /:id
router.get('/outstanding', c.outstanding);
router.get('/:id', v.id(), c.getOne);
router.get('/:id/balance', v.id(), c.balance);
router.put('/:id', v.id(), v.body(v.vendorRules, { partial: true }), c.update);
module.exports = router;
