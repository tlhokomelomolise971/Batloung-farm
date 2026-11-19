const router = require('express').Router();
const c = require('../controllers/supplierController');
const v = require('../middleware/validate');

router.post('/', v.body(v.supplierRules), c.create);
router.get('/', c.getAll);
router.get('/:id', v.id(), c.getOne);
router.put('/:id', v.id(), v.body(v.supplierRules, { partial: true }), c.update);
router.delete('/:id', v.id(), c.remove);
module.exports = router;
