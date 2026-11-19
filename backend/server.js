require('dotenv').config();
const express = require('express');
const { pool, connectWithRetry, checkConnection, getStatus } = require('./src/config/db');
const routes = require('./src/routes');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');

const app = express();
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => res.json({ name: 'Batloung Farm Distribution API', health: '/health', api: '/api' }));
app.get('/health', async (req, res) => {
  const up = await checkConnection();
  res.status(up ? 200 : 503).json({ status: up ? 'ok' : 'degraded', database: up ? 'connected' : `unavailable (${getStatus().lastError})` });
});
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

// The process must not die because of a DB problem.
process.on('unhandledRejection', (r) => console.error('Unhandled rejection:', r));
process.on('uncaughtException', (e) => console.error('Uncaught exception:', e));

const PORT = Number(process.env.PORT) || 3000;
const server = app.listen(PORT, () => {
  console.log(`Batloung Farm API running on port ${PORT}`);
  connectWithRetry(); // runs in background; server is already up
});

const shutdown = async () => {
  server.close();
  try { await pool.end(); } catch (_) { /* ignore */ }
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
