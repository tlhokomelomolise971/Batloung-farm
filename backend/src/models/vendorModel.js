const { pool } = require('../config/db');
const { updateById } = require('../utils/sql');

exports.create = async (v) => {
  const [r] = await pool.query(
    'INSERT INTO vendors (vendor_name, phone_number, location, latitude, longitude, registration_date) VALUES (?,?,?,?,?,CURDATE())',
    [v.vendor_name, v.phone_number, v.location, v.latitude ?? null, v.longitude ?? null]);
  return r.insertId;
};
exports.findAll = async () => (await pool.query('SELECT * FROM vendors ORDER BY vendor_name'))[0];
exports.findById = async (id) => (await pool.query('SELECT * FROM vendors WHERE vendor_id = ?', [id]))[0][0];
exports.search = async (q) => {
  const like = `%${q}%`;
  return (await pool.query('SELECT * FROM vendors WHERE vendor_name LIKE ? OR phone_number LIKE ? ORDER BY vendor_name', [like, like]))[0];
};
exports.update = (id, data) => updateById('vendors', 'vendor_id', id, data,
  ['vendor_name', 'phone_number', 'location', 'latitude', 'longitude']);

// billed - paid = outstanding, per vendor
const BALANCE_SQL = `
  SELECT v.vendor_id, v.vendor_name, v.phone_number,
         COALESCE(b.billed, 0) AS total_billed,
         COALESCE(p.paid, 0)   AS total_paid,
         COALESCE(b.billed, 0) - COALESCE(p.paid, 0) AS outstanding_balance
  FROM vendors v
  LEFT JOIN (SELECT vendor_id, SUM(total_amount) AS billed FROM sales GROUP BY vendor_id) b ON b.vendor_id = v.vendor_id
  LEFT JOIN (SELECT s.vendor_id, SUM(pm.amount) AS paid FROM payments pm
             JOIN sales s ON s.sale_id = pm.sale_id GROUP BY s.vendor_id) p ON p.vendor_id = v.vendor_id`;

exports.balance = async (id) => (await pool.query(`${BALANCE_SQL} WHERE v.vendor_id = ?`, [id]))[0][0];
exports.outstanding = async () =>
  (await pool.query(`SELECT * FROM (${BALANCE_SQL}) t WHERE t.outstanding_balance > 0 ORDER BY t.outstanding_balance DESC`))[0];
exports.unpaidSales = async (id) =>
  (await pool.query(
    `SELECT s.sale_id, s.sale_date, s.total_amount, s.payment_status,
            s.total_amount - COALESCE(SUM(pm.amount),0) AS outstanding
     FROM sales s LEFT JOIN payments pm ON pm.sale_id = s.sale_id
     WHERE s.vendor_id = ? GROUP BY s.sale_id, s.sale_date, s.total_amount, s.payment_status HAVING outstanding > 0 ORDER BY s.sale_date`, [id]))[0];
