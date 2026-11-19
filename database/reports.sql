USE batloung_farm_db;

-- 1. Five most frequently sold fruits (boxes sold)
SELECT f.fruit_id, f.fruit_name, SUM(sd.quantity) AS boxes_sold
FROM sales_details sd JOIN fruits f ON f.fruit_id = sd.fruit_id
GROUP BY f.fruit_id, f.fruit_name
ORDER BY boxes_sold DESC
LIMIT 5;

-- 2. Total sales revenue in a date range (inclusive)
SELECT COALESCE(SUM(total_amount),0) AS total_revenue, COUNT(*) AS number_of_sales
FROM sales
WHERE sale_date >= '2026-10-01' AND sale_date < DATE_ADD('2026-10-31', INTERVAL 1 DAY);

-- 3. Vendor who bought the most boxes
SELECT v.vendor_id, v.vendor_name, SUM(sd.quantity) AS total_boxes
FROM sales s
JOIN sales_details sd ON sd.sale_id = s.sale_id
JOIN vendors v ON v.vendor_id = s.vendor_id
GROUP BY v.vendor_id, v.vendor_name
ORDER BY total_boxes DESC
LIMIT 1;

-- 4. Current stock per fruit and packaging size
SELECT f.fruit_name, st.packaging_size, st.available_quantity, st.reorder_level
FROM stock st JOIN fruits f ON f.fruit_id = st.fruit_id
ORDER BY f.fruit_name, FIELD(st.packaging_size,'SMALL','MEDIUM','LARGE');

-- Bonus: outstanding balance per vendor
SELECT v.vendor_id, v.vendor_name,
       COALESCE(b.billed,0) AS total_billed, COALESCE(p.paid,0) AS total_paid,
       COALESCE(b.billed,0) - COALESCE(p.paid,0) AS outstanding_balance
FROM vendors v
LEFT JOIN (SELECT vendor_id, SUM(total_amount) billed FROM sales GROUP BY vendor_id) b ON b.vendor_id = v.vendor_id
LEFT JOIN (SELECT s.vendor_id, SUM(pm.amount) paid FROM payments pm JOIN sales s ON s.sale_id = pm.sale_id GROUP BY s.vendor_id) p ON p.vendor_id = v.vendor_id
ORDER BY outstanding_balance DESC;
