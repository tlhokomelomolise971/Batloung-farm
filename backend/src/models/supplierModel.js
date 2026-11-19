const { pool } = require('../config/db');
const { updateById } = require('../utils/sql');

exports.create = async (s) => {
  const [r] = await pool.query(
    'INSERT INTO suppliers (business_name, contact_person, phone, province, address, latitude, longitude) VALUES (?,?,?,?,?,?,?)',
    [s.business_name, s.contact_person, s.phone, s.province, s.address || null, s.latitude ?? null, s.longitude ?? null]);
  return r.insertId;
};
exports.findAll = async () => (await pool.query('SELECT * FROM suppliers ORDER BY business_name'))[0];
exports.findById = async (id) => (await pool.query('SELECT * FROM suppliers WHERE supplier_id = ?', [id]))[0][0];
exports.update = (id, data) =>
  updateById('suppliers', 'supplier_id', id, data,
    ['business_name', 'contact_person', 'phone', 'province', 'address', 'latitude', 'longitude']);
exports.countPurchases = async (id) =>
  (await pool.query('SELECT COUNT(*) AS n FROM purchases WHERE supplier_id = ?', [id]))[0][0].n;
exports.remove = async (id) => { await pool.query('DELETE FROM suppliers WHERE supplier_id = ?', [id]); };
