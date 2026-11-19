const { pool, withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const { calculatePurchaseTotal } = require('../utils/businessLogic');

// All-or-nothing: if any item fails, the whole purchase is rolled back.
exports.create = ({ supplier_id, items }) =>
  withTransaction(async (c) => {
    const [[supplier]] = await c.query('SELECT supplier_id FROM suppliers WHERE supplier_id = ?', [supplier_id]);
    if (!supplier) throw new AppError(404, `Supplier with ID ${supplier_id} does not exist`, 'SUPPLIER_NOT_FOUND');

    const total = calculatePurchaseTotal(items); // calculated automatically
    const [p] = await c.query('INSERT INTO purchases (supplier_id, total_amount) VALUES (?,?)', [supplier_id, total]);

    for (const [i, it] of items.entries()) {
      const [[fruit]] = await c.query('SELECT fruit_name, status FROM fruits WHERE fruit_id = ?', [it.fruit_id]);
      if (!fruit) throw new AppError(404, `Item ${i + 1}: fruit with ID ${it.fruit_id} does not exist. Whole purchase cancelled.`, 'FRUIT_NOT_FOUND');
      if (fruit.status !== 'ACTIVE') throw new AppError(400, `Item ${i + 1}: ${fruit.fruit_name} is inactive. Whole purchase cancelled.`, 'FRUIT_INACTIVE');

      await c.query('INSERT INTO purchase_details (purchase_id, fruit_id, quantity, unit_cost, packaging_size) VALUES (?,?,?,?,?)',
        [p.insertId, it.fruit_id, it.quantity, it.unit_cost, it.packaging_size]);
      await c.query(
        `INSERT INTO stock (fruit_id, packaging_size, available_quantity) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE available_quantity = available_quantity + VALUES(available_quantity)`,
        [it.fruit_id, it.packaging_size, it.quantity]);
      await c.query('INSERT INTO stock_movements (fruit_id, packaging_size, change_qty, reason, reference_id) VALUES (?,?,?,?,?)',
        [it.fruit_id, it.packaging_size, it.quantity, 'PURCHASE', p.insertId]);
    }
    return p.insertId;
  });

exports.findAll = async () =>
  (await pool.query(
    `SELECT p.*, s.business_name FROM purchases p JOIN suppliers s ON s.supplier_id = p.supplier_id
     ORDER BY p.purchase_date DESC, p.purchase_id DESC`))[0];

exports.findById = async (id) => {
  const [[purchase]] = await pool.query(
    `SELECT p.*, s.business_name, s.province FROM purchases p
     JOIN suppliers s ON s.supplier_id = p.supplier_id WHERE p.purchase_id = ?`, [id]);
  if (!purchase) return undefined;
  const [items] = await pool.query(
    `SELECT pd.purchase_detail_id, pd.fruit_id, f.fruit_name, pd.packaging_size, pd.quantity, pd.unit_cost,
            ROUND(pd.quantity * pd.unit_cost, 2) AS line_total
     FROM purchase_details pd JOIN fruits f ON f.fruit_id = pd.fruit_id WHERE pd.purchase_id = ?`, [id]);
  return { ...purchase, items };
};
