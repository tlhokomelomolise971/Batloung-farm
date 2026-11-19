const router = require('express').Router();
const c = require('../controllers/stockController');

router.get('/', c.getAll);              // ?fruit_id=1 optional
router.get('/low', c.getLow);           // ?threshold=12 optional
router.get('/movements', c.getMovements);
module.exports = router;
