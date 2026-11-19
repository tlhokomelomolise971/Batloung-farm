# Batloung Farm Distribution System (API)

Express + MySQL backend for Batloung Farm, Maseru. Prices are in LSL per box.

## Setup
1. MySQL 8.0.19+ running.
2. `mysql -u root -p < database/schema.sql` then `mysql -u root -p < database/sample_data.sql`
3. Open a terminal in the `backend` folder: `cd backend`
4. `npm install`
5. Edit `backend/.env` (copy of `.env.example`) with your DB password.
6. `npm start` -> http://localhost:3000/health

## Run the frontend (React + Vite)
1. Keep the backend running (`npm start` in `backend`).
2. To enable the place picker, enable Google Maps JavaScript API and Places API (New) in Google Cloud and enable billing for the project. Enable Geocoding API as well if you want to drop pins by clicking the map. Create a browser key whose HTTP referrer restrictions include your local development URL (for example, `http://localhost:5173/*`) and production domain, then set `VITE_GOOGLE_MAPS_API_KEY` in `frontend/.env`.
3. If this is an existing database, run `mysql -u root -p < database/migrations/20261118_add_google_maps_locations.sql` once.
4. In a second terminal: `cd frontend`, `npm install`, `npm run dev`
5. Open http://localhost:5173. Without a Google Maps key, vendor/supplier locations can still be entered manually.

Pages: Dashboard, Sales, Purchases, Stock, Fruits & prices, Vendors, Suppliers, Reports.
Entry files: `frontend/src/main.jsx` and `frontend/src/App.jsx`.

## Folders
`backend` (Node.js API) | `frontend` (React web app) | `database` (SQL scripts)

Inside `backend`: `src/config` DB pool + transactions | `src/routes` | `src/controllers` | `src/models` SQL queries | `src/middleware` validation + errors | `src/utils` business rules

## Endpoints (all under /api)
| Area | Endpoints |
|---|---|
| Suppliers | POST /suppliers, GET /suppliers, GET/PUT/DELETE /suppliers/:id |
| Fruits | POST /fruits, GET /fruits, GET/PUT /fruits/:id, PUT /fruits/:id/prices |
| Stock | GET /stock (?fruit_id=), GET /stock/low (?threshold=), GET /stock/movements |
| Vendors | POST /vendors, GET /vendors, GET /vendors/search?q=, GET /vendors/outstanding, GET/PUT /vendors/:id, GET /vendors/:id/balance |
| Purchases | POST /purchases, GET /purchases, GET /purchases/:id |
| Sales | POST /sales, GET /sales, GET /sales/:id, POST /sales/:id/payments |
| Reports | GET /reports/top-fruits, /reports/revenue?from=&to=, /reports/top-vendor, /reports/stock-levels |

## Try it
Purchase (total is calculated by the server):
```
curl -X POST localhost:3000/api/purchases -H "Content-Type: application/json" -d '{"supplier_id":1,"items":[{"fruit_id":1,"packaging_size":"LARGE","quantity":20,"unit_cost":120},{"fruit_id":5,"packaging_size":"SMALL","quantity":10,"unit_cost":100}]}'
```
Sale, paid 500 by mobile money (rest is credit -> PARTIALLY_PAID):
```
curl -X POST localhost:3000/api/sales -H "Content-Type: application/json" -d '{"vendor_id":2,"items":[{"fruit_id":1,"packaging_size":"LARGE","quantity":4},{"fruit_id":3,"packaging_size":"SMALL","quantity":5}],"payment":{"method":"MOBILE_MONEY","amount":500}}'
```
Pay later: `POST /api/sales/3/payments` with `{"method":"CASH","amount":1000}`

## Rollback demo (rejects whole sale)
Grapes LARGE has only 6 boxes. Item 1 is valid, item 2 asks for 10:
```
curl -X POST localhost:3000/api/sales -H "Content-Type: application/json" -d '{"vendor_id":1,"items":[{"fruit_id":1,"packaging_size":"SMALL","quantity":2},{"fruit_id":5,"packaging_size":"LARGE","quantity":10}]}'
```
Returns `400 INSUFFICIENT_STOCK` ("requested 10, available 6"). Check `GET /api/stock` and `GET /api/sales`: nothing changed.
Purchase version: put a non-existing `fruit_id` (e.g. 999) as the 2nd item -> `404`, and item 1 is not saved.
SQL version: `database/transactions_demo.sql`.

## Design notes
- `stock` has one row per fruit AND packaging size (UNIQUE fruit_id + packaging_size, CHECK >= 0).
- Extra tables: `selling_prices` (price per fruit+size), `payments` (cash / mobile money), `stock_movements` (audit trail). Unpaid balance = credit.
- Stock is reduced with `UPDATE ... WHERE available_quantity >= ?`, so two sales at once cannot make stock negative.
- If MySQL is down the server stays up and returns `503 DATABASE_UNAVAILABLE`.
