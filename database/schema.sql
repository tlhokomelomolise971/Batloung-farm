-- Batloung Farm Distribution System - schema (MySQL 8.0.19+)
-- Run order: schema.sql -> sample_data.sql
CREATE DATABASE IF NOT EXISTS batloung_farm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE batloung_farm_db;

CREATE TABLE suppliers (
  supplier_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_name  VARCHAR(120) NOT NULL,
  contact_person VARCHAR(100) NOT NULL,
  phone          VARCHAR(20)  NOT NULL,
  province ENUM('Gauteng','Free State','KwaZulu-Natal','Western Cape',
                'Eastern Cape','Limpopo','Mpumalanga','North West') NOT NULL,
  address        VARCHAR(255) NULL,
  latitude       DECIMAL(10,7) NULL,
  longitude      DECIMAL(10,7) NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_supplier_business UNIQUE (business_name),
  CONSTRAINT uq_supplier_phone    UNIQUE (phone)
) ENGINE=InnoDB;

CREATE TABLE fruits (
  fruit_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fruit_name  VARCHAR(60) NOT NULL,
  description VARCHAR(255) NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT uq_fruit_name UNIQUE (fruit_name)
) ENGINE=InnoDB;

CREATE TABLE vendors (
  vendor_id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendor_name       VARCHAR(100) NOT NULL,
  phone_number      VARCHAR(20)  NOT NULL,
  location          VARCHAR(255) NOT NULL,
  latitude          DECIMAL(10,7) NULL,
  longitude         DECIMAL(10,7) NULL,
  registration_date DATE NOT NULL,
  CONSTRAINT uq_vendor_phone UNIQUE (phone_number)
) ENGINE=InnoDB;

CREATE TABLE purchases (
  purchase_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id   INT UNSIGNED NOT NULL,
  purchase_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT chk_purchase_total CHECK (total_amount >= 0),
  CONSTRAINT fk_purchase_supplier FOREIGN KEY (supplier_id)
    REFERENCES suppliers(supplier_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE purchase_details (
  purchase_detail_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_id    INT UNSIGNED NOT NULL,
  fruit_id       INT UNSIGNED NOT NULL,
  quantity       INT UNSIGNED NOT NULL,
  unit_cost      DECIMAL(10,2) NOT NULL,
  packaging_size ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  CONSTRAINT chk_pd_qty  CHECK (quantity > 0),
  CONSTRAINT chk_pd_cost CHECK (unit_cost > 0),
  CONSTRAINT fk_pd_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(purchase_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_pd_fruit FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE sales (
  sale_id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendor_id      INT UNSIGNED NOT NULL,
  sale_date      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_status ENUM('PAID','PARTIALLY_PAID','UNPAID') NOT NULL DEFAULT 'UNPAID',
  total_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT chk_sale_total CHECK (total_amount >= 0),
  CONSTRAINT fk_sale_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_sale_date (sale_date)
) ENGINE=InnoDB;

CREATE TABLE sales_details (
  sales_detail_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id        INT UNSIGNED NOT NULL,
  fruit_id       INT UNSIGNED NOT NULL,
  packaging_size ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  quantity       INT UNSIGNED NOT NULL,
  unit_price     DECIMAL(10,2) NOT NULL,
  CONSTRAINT chk_sd_qty   CHECK (quantity > 0),
  CONSTRAINT chk_sd_price CHECK (unit_price > 0),
  CONSTRAINT fk_sd_sale  FOREIGN KEY (sale_id)  REFERENCES sales(sale_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sd_fruit FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- One row per fruit AND packaging size => separate small/medium/large balances.
CREATE TABLE stock (
  stock_id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fruit_id           INT UNSIGNED NOT NULL,
  packaging_size     ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  available_quantity INT NOT NULL DEFAULT 0,
  reorder_level      INT NOT NULL DEFAULT 10,
  CONSTRAINT uq_stock_fruit_size UNIQUE (fruit_id, packaging_size),
  CONSTRAINT chk_stock_not_negative CHECK (available_quantity >= 0),
  CONSTRAINT chk_reorder CHECK (reorder_level >= 0),
  CONSTRAINT fk_stock_fruit FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- Extra tables (beyond the 8 required) for pricing, payments and audit
CREATE TABLE selling_prices (
  price_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fruit_id       INT UNSIGNED NOT NULL,
  packaging_size ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  price          DECIMAL(10,2) NOT NULL,
  CONSTRAINT uq_price_fruit_size UNIQUE (fruit_id, packaging_size),
  CONSTRAINT chk_price CHECK (price > 0),
  CONSTRAINT fk_price_fruit FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE payments (
  payment_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id        INT UNSIGNED NOT NULL,
  amount         DECIMAL(12,2) NOT NULL,
  payment_method ENUM('CASH','MOBILE_MONEY') NOT NULL,
  paid_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_payment_amount CHECK (amount > 0),
  CONSTRAINT fk_payment_sale FOREIGN KEY (sale_id) REFERENCES sales(sale_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE stock_movements (
  movement_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fruit_id       INT UNSIGNED NOT NULL,
  packaging_size ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  change_qty     INT NOT NULL,
  reason         ENUM('PURCHASE','SALE') NOT NULL,
  reference_id   INT UNSIGNED NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_move_fruit FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;
