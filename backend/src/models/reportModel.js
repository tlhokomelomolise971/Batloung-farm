const { pool } = require('../config/db');

exports.topFruits = async () =>
  (await pool.query(
    `SELECT f.fruit_id, f.fruit_name, SUM(sd.quantity) AS boxes_sold
     FROM sales_details sd JOIN fruits f ON f.fruit_id = sd.fruit_id
     GROUP BY f.fruit_id, f.fruit_name ORDER BY boxes_sold DESC LIMIT 5`))[0];

exports.revenue = async (from, to) =>
  (await pool.query(
    `SELECT COALESCE(SUM(total_amount), 0) AS total_revenue, COUNT(*) AS number_of_sales
     FROM sales WHERE sale_date >= ? AND sale_date < DATE_ADD(?, INTERVAL 1 DAY)`, [from, to]))[0][0];

exports.topVendor = async () =>
  (await pool.query(
    `SELECT v.vendor_id, v.vendor_name, SUM(sd.quantity) AS total_boxes
     FROM sales s JOIN sales_details sd ON sd.sale_id = s.sale_id JOIN vendors v ON v.vendor_id = s.vendor_id
     GROUP BY v.vendor_id, v.vendor_name ORDER BY total_boxes DESC LIMIT 1`))[0][0];

exports.stockLevels = async () =>
  (await pool.query(
    `SELECT f.fruit_name, st.packaging_size, st.available_quantity
     FROM stock st JOIN fruits f ON f.fruit_id = st.fruit_id
     ORDER BY f.fruit_name, FIELD(st.packaging_size,'SMALL','MEDIUM','LARGE')`))[0];
