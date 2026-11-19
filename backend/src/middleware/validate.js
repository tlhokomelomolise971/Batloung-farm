const AppError = require('../utils/AppError');

const PROVINCES = ['Gauteng', 'Free State', 'KwaZulu-Natal', 'Western Cape', 'Eastern Cape', 'Limpopo', 'Mpumalanga', 'North West'];
const SIZES = ['SMALL', 'MEDIUM', 'LARGE'];
const STATUSES = ['ACTIVE', 'INACTIVE'];
const PAY_METHODS = ['CASH', 'MOBILE_MONEY', 'CREDIT'];
const PHONE = /^\+?[0-9 ]{7,15}$/;
const MAX_LARGE_PURCHASE_BOXES = 8;

const fail = (errors) => new AppError(400, 'Validation failed', 'VALIDATION_ERROR', errors);
const toPosInt = (v) => {
  if (typeof v !== 'number' && typeof v !== 'string') return null;
  const n = Number(v);
  return v !== '' && Number.isInteger(n) && n > 0 ? n : null;
};
const toPosNum = (v) => {
  if (typeof v !== 'number' && typeof v !== 'string') return null;
  const n = Number(v);
  return v !== '' && Number.isFinite(n) && n > 0 ? n : null;
};
const pickEnum = (values, v) => values.find((x) => x.toLowerCase() === String(v ?? '').trim().toLowerCase());

// ---- field-rule validator (for suppliers, fruits, vendors) ----
function checkField(name, rule, value, errors) {
  if (rule.type === 'coordinate' && (value === null || value === '')) return null;
  if (value === undefined || value === null || value === '') {
    if (rule.required) errors.push(`${name} is required`);
    return undefined;
  }
  if (rule.type === 'coordinate') {
    const n = Number(value);
    if (typeof value === 'boolean' || !Number.isFinite(n) || n < rule.min || n > rule.max) {
      errors.push(`${name} must be a number between ${rule.min} and ${rule.max}`);
      return undefined;
    }
    return n;
  }
  if (rule.type === 'enum') {
    const m = pickEnum(rule.values, value);
    if (!m) errors.push(`${name} must be one of: ${rule.values.join(', ')}`);
    return m;
  }
  if (typeof value !== 'string') { errors.push(`${name} must be text`); return undefined; }
  const s = value.trim();
  if (!s) { if (rule.required) errors.push(`${name} is required`); return undefined; }
  if (s.length > (rule.max || 255)) errors.push(`${name} is too long (max ${rule.max || 255})`);
  if (rule.type === 'phone' && !PHONE.test(s)) errors.push(`${name} must be a valid phone number (7-15 digits, optional +)`);
  return s;
}

const body = (rules, { partial = false } = {}) => (req, res, next) => {
  const errors = [];
  const clean = {};
  for (const [field, rule] of Object.entries(rules)) {
    const v = checkField(field, { ...rule, required: partial ? false : rule.required }, req.body?.[field], errors);
    if (v !== undefined) clean[field] = v;
  }
  const hasLatitude = Object.prototype.hasOwnProperty.call(req.body || {}, 'latitude');
  const hasLongitude = Object.prototype.hasOwnProperty.call(req.body || {}, 'longitude');
  if ((hasLatitude || hasLongitude) && !(hasLatitude && hasLongitude)) {
    errors.push('latitude and longitude must be provided together');
  }
  if (hasLatitude && hasLongitude && ((clean.latitude === null) !== (clean.longitude === null))) {
    errors.push('latitude and longitude must both be set or both be empty');
  }
  if (partial && !errors.length && !Object.keys(clean).length) errors.push('Provide at least one field to update');
  if (errors.length) return next(fail(errors));
  req.valid = clean;
  next();
};

const supplierRules = {
  business_name: { type: 'string', max: 120, required: true },
  contact_person: { type: 'string', max: 100, required: true },
  phone: { type: 'phone', max: 20, required: true },
  province: { type: 'enum', values: PROVINCES, required: true },
  address: { type: 'string', max: 255 },
  latitude: { type: 'coordinate', min: -90, max: 90 },
  longitude: { type: 'coordinate', min: -180, max: 180 },
};
const fruitRules = {
  fruit_name: { type: 'string', max: 60, required: true },
  description: { type: 'string', max: 255 },
  status: { type: 'enum', values: STATUSES },
};
const vendorRules = {
  vendor_name: { type: 'string', max: 100, required: true },
  phone_number: { type: 'phone', max: 20, required: true },
  location: { type: 'string', max: 255, required: true },
  latitude: { type: 'coordinate', min: -90, max: 90 },
  longitude: { type: 'coordinate', min: -180, max: 180 },
};

const id = (param = 'id') => (req, res, next) => {
  const n = toPosInt(req.params[param]);
  if (!n) return next(new AppError(400, `${param} must be a positive whole number`, 'INVALID_ID'));
  req.params[param] = n;
  next();
};

// ---- items (purchase & sale lines) ----
function parseItems(items, errors, kind) {
  if (!Array.isArray(items) || !items.length) { errors.push('items must be a non-empty array'); return []; }
  if (items.length > 100) { errors.push('items cannot have more than 100 lines'); return []; }
  const largePurchaseTotals = new Map();
  return items.map((it, i) => {
    const p = `items[${i}]`;
    const fruit_id = toPosInt(it?.fruit_id);
    const packaging_size = pickEnum(SIZES, it?.packaging_size);
    const quantity = toPosInt(it?.quantity);
    if (!fruit_id) errors.push(`${p}.fruit_id must be a positive whole number`);
    if (!packaging_size) errors.push(`${p}.packaging_size must be SMALL, MEDIUM or LARGE`);
    if (!quantity) errors.push(`${p}.quantity must be a positive whole number`);
    if (kind === 'purchase' && packaging_size === 'LARGE' && fruit_id && quantity) {
      const key = String(fruit_id);
      const total = (largePurchaseTotals.get(key) || 0) + quantity;
      largePurchaseTotals.set(key, total);
      if (total > MAX_LARGE_PURCHASE_BOXES) {
        errors.push(`${p}.quantity makes the LARGE-size total for this fruit exceed ${MAX_LARGE_PURCHASE_BOXES} boxes`);
      }
    }
    const line = { fruit_id, packaging_size, quantity };
    if (kind === 'purchase') {
      line.unit_cost = toPosNum(it?.unit_cost);
      if (!line.unit_cost) errors.push(`${p}.unit_cost must be a number greater than 0`);
    }
    return line;
  });
}

const purchaseBody = (req, res, next) => {
  const errors = [];
  const supplier_id = toPosInt(req.body?.supplier_id);
  if (!supplier_id) errors.push('supplier_id must be a positive whole number');
  const items = parseItems(req.body?.items, errors, 'purchase');
  if (errors.length) return next(fail(errors));
  req.valid = { supplier_id, items };
  next();
};

const saleBody = (req, res, next) => {
  const errors = [];
  const vendor_id = toPosInt(req.body?.vendor_id);
  if (!vendor_id) errors.push('vendor_id must be a positive whole number');
  const items = parseItems(req.body?.items, errors, 'sale');
  let payment = null;
  const p = req.body?.payment;
  if (p !== undefined && p !== null) {
    const method = pickEnum(PAY_METHODS, p.method);
    if (!method) errors.push(`payment.method must be one of: ${PAY_METHODS.join(', ')}`);
    payment = { method };
    if (p.amount !== undefined && method !== 'CREDIT') {
      const amt = Number(p.amount);
      if (typeof p.amount === 'boolean' || p.amount === '' || !Number.isFinite(amt) || amt <= 0) errors.push('payment.amount must be a number greater than 0');
      else payment.amount = amt;
    }
  }
  if (errors.length) return next(fail(errors));
  req.valid = { vendor_id, items, payment };
  next();
};

const paymentBody = (req, res, next) => {
  const errors = [];
  const method = pickEnum(['CASH', 'MOBILE_MONEY'], req.body?.method);
  const amount = toPosNum(req.body?.amount);
  if (!method) errors.push('method must be CASH or MOBILE_MONEY');
  if (!amount) errors.push('amount must be a number greater than 0');
  if (errors.length) return next(fail(errors));
  req.valid = { method, amount };
  next();
};

const pricesBody = (req, res, next) => {
  const errors = [];
  const list = req.body?.prices;
  if (!Array.isArray(list) || !list.length) return next(fail(['prices must be a non-empty array of {packaging_size, price}']));
  const prices = list.map((p, i) => {
    const packaging_size = pickEnum(SIZES, p?.packaging_size);
    const price = toPosNum(p?.price);
    if (!packaging_size) errors.push(`prices[${i}].packaging_size must be SMALL, MEDIUM or LARGE`);
    if (!price) errors.push(`prices[${i}].price must be a number greater than 0`);
    return { packaging_size, price };
  });
  if (errors.length) return next(fail(errors));
  req.valid = { prices };
  next();
};

const dateRange = (req, res, next) => {
  const errors = [];
  const ok = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && !Number.isNaN(Date.parse(d));
  const { from, to } = req.query;
  if (!ok(from)) errors.push('from must be a valid date (YYYY-MM-DD)');
  if (!ok(to)) errors.push('to must be a valid date (YYYY-MM-DD)');
  if (!errors.length && from > to) errors.push('from cannot be later than to');
  if (errors.length) return next(fail(errors));
  next();
};

module.exports = {
  SIZES, body, id, supplierRules, fruitRules, vendorRules,
  purchaseBody, saleBody, paymentBody, pricesBody, dateRange, pickEnum,
};
