const { pool, withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const {
  calculateSaleTotal, determinePaymentStatus, outstandingBalance, mergeItems, round2,
} = require('../utils/businessLogic');

// Record a sale. EVERYTHING happens in one transaction:
// if any line is invalid or out of stock -> ROLLBACK (no sale, no stock change).
exports.create = ({ vendor_id, items, payment }) =>
  withTransaction(async (c) => {
    const [[vendor]] = await c.query('SELECT vendor_id FROM vendors WHERE vendor_id = ?', [vendor_id]);
    if (!vendor) throw new AppError(404, `Vendor with ID ${vendor_id} is not registered`, 'VENDOR_NOT_FOUND');

    // 1. Look up fruit + price for every line (prices come from the price list, not the client)
    const lines = [];
    for (const it of mergeItems(items)) {
      const [[fruit]] = await c.query('SELECT fruit_name, status FROM fruits WHERE fruit_id = ?', [it.fruit_id]);
      if (!fruit) throw new AppError(404, `Fruit with ID ${it.fruit_id} does not exist`, 'FRUIT_NOT_FOUND');
      if (fruit.status !== 'ACTIVE') throw new AppError(400, `${fruit.fruit_name} is inactive and cannot be sold`, 'FRUIT_INACTIVE');
      const [[price]] = await c.query('SELECT price FROM selling_prices WHERE fruit_id = ? AND packaging_size = ?',
        [it.fruit_id, it.packaging_size]);
      if (!price) throw new AppError(400, `No selling price set for ${fruit.fruit_name} (${it.packaging_size})`, 'PRICE_NOT_SET');
      lines.push({ ...it, fruit_name: fruit.fruit_name, unit_price: price.price });
    }

    // 2. Total + payment status calculated automatically
    const total = calculateSaleTotal(lines);
    const method = payment?.method || 'CREDIT';
    const paid = method === 'CREDIT' ? 0 : (payment.amount ?? total);
    if (paid > total) throw new AppError(400, `Payment (${paid}) is more than the sale total (${total})`, 'OVERPAYMENT');

    const [s] = await c.query('INSERT INTO sales (vendor_id, payment_status, total_amount) VALUES (?,?,?)',
      [vendor_id, determinePaymentStatus(total, paid), total]);

    // 3. Reduce stock line by line. The WHERE available_quantity >= ? makes the check + update atomic.
    for (const l of lines) {
      const [u] = await c.query(
        `UPDATE stock SET available_quantity = available_quantity - ?
         WHERE fruit_id = ? AND packaging_size = ? AND available_quantity >= ?`,
        [l.quantity, l.fruit_id, l.packaging_size, l.quantity]);
      if (u.affectedRows === 0) {
        const [[st]] = await c.query('SELECT available_quantity FROM stock WHERE fruit_id = ? AND packaging_size = ?',
          [l.fruit_id, l.packaging_size]);
        const available = st ? st.available_quantity : 0;
        throw new AppError(400,
          `Insufficient stock for ${l.fruit_name} (${l.packaging_size}): requested ${l.quantity}, available ${available}. Sale rejected.`,
          'INSUFFICIENT_STOCK',
          { fruit_id: l.fruit_id, packaging_size: l.packaging_size, requested: l.quantity, available });
      }
      await c.query('INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price) VALUES (?,?,?,?,?)',
        [s.insertId, l.fruit_id, l.packaging_size, l.quantity, l.unit_price]);
      await c.query('INSERT INTO stock_movements (fruit_id, packaging_size, change_qty, reason, reference_id) VALUES (?,?,?,?,?)',
        [l.fruit_id, l.packaging_size, -l.quantity, 'SALE', s.insertId]);
    }

    if (paid > 0) {
      await c.query('INSERT INTO payments (sale_id, amount, payment_method) VALUES (?,?,?)', [s.insertId, paid, method]);
    }
    return s.insertId;
  });

exports.findAll = async ({ vendor_id, payment_status } = {}) => {
  const where = [];
  const params = [];
  if (vendor_id) { where.push('s.vendor_id = ?'); params.push(vendor_id); }
  if (payment_status) { where.push('s.payment_status = ?'); params.push(payment_status); }
  const [rows] = await pool.query(
    `SELECT s.*, v.vendor_name,
            COALESCE((SELECT SUM(amount) FROM payments WHERE sale_id = s.sale_id), 0) AS amount_paid
     FROM sales s JOIN vendors v ON v.vendor_id = s.vendor_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY s.sale_date DESC, s.sale_id DESC`, params);
  return rows.map((r) => ({ ...r, outstanding_balance: outstandingBalance(r.total_amount, r.amount_paid) }));
};

exports.findById = async (id) => {
  const [[sale]] = await pool.query(
    `SELECT s.*, v.vendor_name, v.phone_number FROM sales s
     JOIN vendors v ON v.vendor_id = s.vendor_id WHERE s.sale_id = ?`, [id]);
  if (!sale) return undefined;
  const [items] = await pool.query(
    `SELECT sd.sales_detail_id, sd.fruit_id, f.fruit_name, sd.packaging_size, sd.quantity, sd.unit_price,
            ROUND(sd.quantity * sd.unit_price, 2) AS line_total
     FROM sales_details sd JOIN fruits f ON f.fruit_id = sd.fruit_id WHERE sd.sale_id = ?`, [id]);
  const [payments] = await pool.query(
    'SELECT payment_id, amount, payment_method, paid_at FROM payments WHERE sale_id = ? ORDER BY payment_id', [id]);
  const amount_paid = round2(payments.reduce((a, p) => a + Number(p.amount), 0));
  return { ...sale, items, payments, amount_paid, outstanding_balance: outstandingBalance(sale.total_amount, amount_paid) };
};

// Pay off part (or all) of a sale later - cash or mobile money
exports.addPayment = (saleId, { amount, method }) =>
  withTransaction(async (c) => {
    const [[sale]] = await c.query('SELECT sale_id, total_amount FROM sales WHERE sale_id = ? FOR UPDATE', [saleId]);
    if (!sale) throw new AppError(404, `Sale with ID ${saleId} does not exist`, 'SALE_NOT_FOUND');
    const [[sum]] = await c.query('SELECT COALESCE(SUM(amount),0) AS paid FROM payments WHERE sale_id = ?', [saleId]);
    const outstanding = outstandingBalance(sale.total_amount, sum.paid);
    if (outstanding <= 0) throw new AppError(400, 'This sale is already fully paid', 'ALREADY_PAID');
    if (amount > outstanding) throw new AppError(400, `Payment (${amount}) is more than the outstanding balance (${outstanding})`, 'OVERPAYMENT');

    await c.query('INSERT INTO payments (sale_id, amount, payment_method) VALUES (?,?,?)', [saleId, amount, method]);
    const newPaid = round2(Number(sum.paid) + amount);
    await c.query('UPDATE sales SET payment_status = ? WHERE sale_id = ?',
      [determinePaymentStatus(sale.total_amount, newPaid), saleId]);
  });
