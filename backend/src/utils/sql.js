const { pool } = require('../config/db');

// Partial UPDATE using only whitelisted column names (names come from code, values are bound).
async function updateById(table, idColumn, id, data, allowed) {
  const keys = Object.keys(data).filter((k) => allowed.includes(k));
  if (!keys.length) return;
  const set = keys.map((k) => `${k} = ?`).join(', ');
  await pool.query(`UPDATE ${table} SET ${set} WHERE ${idColumn} = ?`, [...keys.map((k) => data[k]), id]);
}
module.exports = { updateById };
