USE batloung_farm_db;

INSERT INTO suppliers (supplier_id, business_name, contact_person, phone, province, address) VALUES
(1,'Cape Orchard Fruits','Johan van Wyk','+27215550101','Western Cape','Elgin Valley, Grabouw'),
(2,'Limpopo Tropical Farms','Tshepo Mokoena','+27155550102','Limpopo','Tzaneen Road, Letsitele'),
(3,'Zulu Coast Produce','Sipho Dlamini','+27315550103','KwaZulu-Natal','Umhlanga Rise, Durban'),
(4,'Lowveld Citrus Co-op','Anele Nkosi','+27135550104','Mpumalanga','Nelspruit Agri Park'),
(5,'Free State Fresh','Pieter Botha','+27515550105','Free State','Ficksburg Cherry Route'),
(6,'Joburg Fresh Market Agents','Naledi Khumalo','+27115550106','Gauteng','City Deep Market, Johannesburg'),
(7,'Kouga Fruit Growers','Zandile Mbeki','+27425550107','Eastern Cape','Patensie Valley'),
(8,'Rustenburg Orchards','Kagiso Molefe','+27145550108','North West','Rustenburg Farm Road');

INSERT INTO fruits (fruit_id, fruit_name, description, status) VALUES
(1,'Apples','Crisp red apples (Royal Gala)','ACTIVE'),
(2,'Bananas','Sweet Cavendish bananas','ACTIVE'),
(3,'Oranges','Juicy Valencia oranges','ACTIVE'),
(4,'Mangoes','Tommy Atkins mangoes','ACTIVE'),
(5,'Grapes','Seedless table grapes','ACTIVE');

INSERT INTO vendors (vendor_id, vendor_name, phone_number, location, registration_date) VALUES
(1,'Mpho Stand - Maseru Central','+26658123401','Maseru Central','2026-01-15'),
(2,'Mamello Street Fruits','+26658123402','Maputsoe','2026-02-03'),
(3,'Thabo Fresh Corner','+26662123403','Teyateyaneng','2026-03-10'),
(4,'Lerato Market Stall','+26658123404','Mafeteng','2026-04-22'),
(5,'Palesa Fruit Vendors','+26662123405','Hlotse','2026-06-01');

-- Selling price per box (LSL): different for small / medium / large
INSERT INTO selling_prices (fruit_id, packaging_size, price) VALUES
(1,'SMALL',80),(1,'MEDIUM',115),(1,'LARGE',160),
(2,'SMALL',55),(2,'MEDIUM',75),(2,'LARGE',100),
(3,'SMALL',60),(3,'MEDIUM',90),(3,'LARGE',120),
(4,'SMALL',95),(4,'MEDIUM',135),(4,'LARGE',185),
(5,'SMALL',130),(5,'MEDIUM',200),(5,'LARGE',260);

INSERT INTO purchases (purchase_id, supplier_id, purchase_date, total_amount) VALUES
(1,1,'2026-10-01 08:30:00',14000.00),
(2,2,'2026-10-03 09:00:00',12200.00),
(3,4,'2026-10-05 07:45:00',12825.00),
(4,3,'2026-10-08 10:15:00', 5000.00);

INSERT INTO purchase_details (purchase_id, fruit_id, quantity, unit_cost, packaging_size) VALUES
(1,1,40,60,'SMALL'),(1,1,50,85,'MEDIUM'),(1,1,30,120,'LARGE'),(1,5,25,150,'MEDIUM'),
(2,4,30,70,'SMALL'),(2,4,40,100,'MEDIUM'),(2,4,20,140,'LARGE'),(2,2,60,55,'MEDIUM'),
(3,3,50,45,'SMALL'),(3,3,60,65,'MEDIUM'),(3,3,40,90,'LARGE'),(3,2,30,40,'SMALL'),(3,2,25,75,'LARGE'),
(4,5,20,100,'SMALL'),(4,5,15,200,'LARGE');

INSERT INTO sales (sale_id, vendor_id, sale_date, payment_status, total_amount) VALUES
(1,1,'2026-10-10 11:00:00','PAID',1860.00),
(2,2,'2026-10-11 12:20:00','PARTIALLY_PAID',2450.00),
(3,3,'2026-10-12 09:40:00','UNPAID',3200.00),
(4,1,'2026-10-14 14:05:00','PARTIALLY_PAID',4980.00),
(5,4,'2026-10-15 10:30:00','PAID',5215.00);

INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price) VALUES
(1,1,'LARGE',6,160),(1,3,'MEDIUM',10,90),
(2,2,'MEDIUM',20,75),(2,4,'SMALL',10,95),
(3,5,'MEDIUM',10,200),(3,1,'SMALL',15,80),
(4,3,'SMALL',35,60),(4,4,'LARGE',12,185),(4,2,'SMALL',12,55),
(5,1,'MEDIUM',25,115),(5,5,'LARGE',9,260);

INSERT INTO payments (sale_id, amount, payment_method, paid_at) VALUES
(1,1860,'CASH','2026-10-10 11:05:00'),
(2,1000,'MOBILE_MONEY','2026-10-11 12:25:00'),
(4,3000,'CASH','2026-10-14 14:10:00'),
(5,5215,'MOBILE_MONEY','2026-10-15 10:35:00');

-- Stock = purchases - sales, separate per packaging size
INSERT INTO stock (fruit_id, packaging_size, available_quantity, reorder_level) VALUES
(1,'SMALL',25,10),(1,'MEDIUM',25,10),(1,'LARGE',24,10),
(2,'SMALL',18,10),(2,'MEDIUM',40,10),(2,'LARGE',25,10),
(3,'SMALL',15,10),(3,'MEDIUM',50,10),(3,'LARGE',40,10),
(4,'SMALL',20,10),(4,'MEDIUM',40,10),(4,'LARGE', 8,10),
(5,'SMALL',20,10),(5,'MEDIUM',15,15),(5,'LARGE', 6,10);
