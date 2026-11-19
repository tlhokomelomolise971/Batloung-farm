const router = require('express').Router();
const c = require('../controllers/fruitController');
const v = require('../middleware/validate');

router.post('/', v.body(v.fruitRules), c.create);
router.get('/', c.getAll);
router.get('/:id', v.id(), c.getOne);
router.put('/:id', v.id(), v.body(v.fruitRules, { partial: true }), c.update);
router.put('/:id/prices', v.id(), v.pricesBody, c.setPrices);
module.exports = router;
