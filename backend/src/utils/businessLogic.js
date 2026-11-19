// Pure business-rule functions (no database access) - easy to test.
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const calculateLineTotal = (quantity, price) => round2(quantity * price);

// Sale total = sum of (boxes x price of that packaging size)
const calculateSaleTotal = (items) =>
  round2(items.reduce((sum, i) => sum + calculateLineTotal(i.quantity, i.unit_price), 0));

const calculatePurchaseTotal = (items) =>
  round2(items.reduce((sum, i) => sum + calculateLineTotal(i.quantity, i.unit_cost), 0));

const determinePaymentStatus = (total, paid) =>
  paid <= 0 ? 'UNPAID' : paid >= total ? 'PAID' : 'PARTIALLY_PAID';

const outstandingBalance = (total, paid) => Math.max(0, round2(total - paid));

// Combine repeated fruit+size lines into one (e.g. 5 + 5 large apples = 10)
function mergeItems(items) {
  const map = new Map();
  for (const it of items) {
    const key = `${it.fruit_id}|${it.packaging_size}`;
    if (map.has(key)) map.get(key).quantity += it.quantity;
    else map.set(key, { ...it });
  }
  return [...map.values()];
}

module.exports = {
  round2, calculateLineTotal, calculateSaleTotal, calculatePurchaseTotal,
  determinePaymentStatus, outstandingBalance, mergeItems,
};
