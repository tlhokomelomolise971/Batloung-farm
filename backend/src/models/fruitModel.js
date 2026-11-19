const { pool, withTransaction } = require('../config/db');
const { updateById } = require('../utils/sql');
const { SIZES } = require('../middleware/validate');

// New fruit => also create its 3 stock rows (SMALL/MEDIUM/LARGE) at zero.
exports.create = ({ fruit_name, description, status }) =>
  withTransaction(async (c) => {
    const [r] = await c.query('INSERT INTO fruits (fruit_name, description, status) VALUES (?,?,?)',
      [fruit_name, description || null, status || 'ACTIVE']);
    await c.query('INSERT INTO stock (fruit_id, packaging_size, available_quantity) VALUES ?',
      [SIZES.map((s) => [r.insertId, s, 0])]);
    return r.insertId;
  });

async function attachPrices(fruits) {
  if (!fruits.length) return fruits;
  const [prices] = await pool.query('SELECT fruit_id, packaging_size, price FROM selling_prices WHERE fruit_id IN (?)',
    [fruits.map((f) => f.fruit_id)]);
  return fruits.map((f) => ({
    ...f,
    prices: Object.fromEntries(prices.filter((p) => p.fruit_id === f.fruit_id).map((p) => [p.packaging_size, p.price])),
  }));
}

exports.findAll = async (status) => {
  const [rows] = status === 'ALL'
    ? await pool.query('SELECT * FROM fruits ORDER BY fruit_name')
    : await pool.query('SELECT * FROM fruits WHERE status = ? ORDER BY fruit_name', [status]);
  return attachPrices(rows);
};
exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM fruits WHERE fruit_id = ?', [id]);
  return (await attachPrices(rows))[0];
};
exports.update = (id, data) => updateById('fruits', 'fruit_id', id, data, ['fruit_name', 'description', 'status']);

exports.setPrices = (fruitId, prices) =>
  withTransaction(async (c) => {
    for (const p of prices) {
      await c.query(
        'INSERT INTO selling_prices (fruit_id, packaging_size, price) VALUES (?,?,?) ON DUPLICATE KEY UPDATE price = VALUES(price)',
        [fruitId, p.packaging_size, p.price]);
    }
  });
