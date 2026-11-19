const mysql = require('mysql2/promise');
require('dotenv').config();

const state = { connected: false, lastError: null };

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  connectTimeout: 10000,
  decimalNumbers: true, // DECIMAL columns come back as numbers
  enableKeepAlive: true,
  // Cloud databases (TiDB Cloud, etc.) need an encrypted connection: set DB_SSL=true
  ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  dateStrings: true,
});

// Check the DB; never throws, so the app keeps running if MySQL is down.
async function checkConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.ping();
    state.connected = true;
    state.lastError = null;
  } catch (err) {
    state.connected = false;
    state.lastError = err.code || err.message;
  } finally {
    if (conn) conn.release();
  }
  return state.connected;
}

// Retry on start-up. Server is already listening while this runs.
async function connectWithRetry() {
  const attempts = Number(process.env.DB_RETRY_ATTEMPTS) || 5;
  const delay = Number(process.env.DB_RETRY_DELAY_MS) || 3000;
  for (let i = 1; i <= attempts; i++) {
    if (await checkConnection()) {
      console.log('MySQL connected.');
      return true;
    }
    console.error(`MySQL connection failed (${state.lastError}). Attempt ${i}/${attempts}`);
    if (i < attempts) await new Promise((r) => setTimeout(r, delay));
  }
  console.error('Could not reach MySQL. API stays up; DB requests will return 503 until it is available.');
  return false;
}

// Run work inside BEGIN ... COMMIT, or ROLLBACK if anything throws.
async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.query('BEGIN');
    const result = await work(conn);
    await conn.query('COMMIT');
    return result;
  } catch (err) {
    try { await conn.query('ROLLBACK'); } catch (_) { /* connection may be gone */ }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, withTransaction, connectWithRetry, checkConnection, getStatus: () => ({ ...state }) };
