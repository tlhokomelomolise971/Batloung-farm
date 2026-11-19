const { pool } = require('../config/db');

const BASE = `SELECT st.stock_id, st.fruit_id, f.fruit_name, st.packaging_size, st.available_quantity,
                     st.reorder_level, (st.available_quantity <= st.reorder_level) AS is_low
              FROM stock st JOIN fruits f ON f.fruit_id = st.fruit_id`;
const ORDER = " ORDER BY f.fruit_name, FIELD(st.packaging_size,'SMALL','MEDIUM','LARGE')";

const clean = (rows) => rows.map((r) => ({ ...r, is_low: Boolean(r.is_low) }));

exports.all = async (fruitId) => {
  const [rows] = fruitId
    ? await pool.query(`${BASE} WHERE st.fruit_id = ?${ORDER}`, [fruitId])
    : await pool.query(BASE + ORDER);
  return clean(rows);
};
exports.low = async (threshold) => {
  // threshold given => use it for all rows; otherwise each row's own reorder_level
  const [rows] = threshold !== undefined
    ? await pool.query(`${BASE} WHERE st.available_quantity <= ?${ORDER}`, [threshold])
    : await pool.query(`${BASE} WHERE st.available_quantity <= st.reorder_level${ORDER}`);
  return clean(rows);
};
exports.movements = async (limit = 50) =>
  (await pool.query(
    `SELECT m.*, f.fruit_name FROM stock_movements m JOIN fruits f ON f.fruit_id = m.fruit_id
     ORDER BY m.movement_id DESC LIMIT ?`, [limit]))[0];
