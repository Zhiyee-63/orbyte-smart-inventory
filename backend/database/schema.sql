-- Orbyte Smart Inventory — schema (run 1st)
-- Demo business: "Kedai Runcit Pak Abu", a small family-run grocery shop in Melaka (all data is synthetic)
-- Database: MySQL 8 (hosted on Aiven)

-- =====================================================================
-- PART 1 — CREATE THE TABLES
-- =====================================================================

-- Start clean (safe to re-run during development)
DROP TABLE IF EXISTS Activity_Logs;
DROP TABLE IF EXISTS Restock_Orders;
DROP TABLE IF EXISTS Products;
DROP TABLE IF EXISTS Suppliers;

-- 1) Suppliers: who we buy from
CREATE TABLE Suppliers (
    supplier_id     INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    contact_person  VARCHAR(100),
    whatsapp        VARCHAR(20)  NOT NULL,      -- international format, no "+": 60123456789
    language        VARCHAR(20)  NOT NULL DEFAULT 'Malay',   -- language for the WhatsApp message (team decision: Malay for all)
    preferred_greeting VARCHAR(100),                       -- e.g. 'Salam Encik Ahmad'
    lead_time_days  INT NOT NULL DEFAULT 2,     -- days until goods arrive after ordering
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2) Products: what we sell / use, and how much is left
CREATE TABLE Products (
    product_id      INT AUTO_INCREMENT PRIMARY KEY,
    barcode         VARCHAR(20)  NOT NULL UNIQUE,   -- the product's "ID card"
    name            VARCHAR(100) NOT NULL,
    brand           VARCHAR(50),                    -- e.g. Nestle, Gardenia, Lifebuoy
    category        VARCHAR(50),                    -- e.g. Minuman, Barangan Dapur, Penjagaan Diri
    unit            VARCHAR(20)  NOT NULL DEFAULT 'pcs',
    stock           INT NOT NULL DEFAULT 0,
    reorder_level   INT NOT NULL DEFAULT 5,         -- owner-defined limit: reorder when stock < this
    reorder_quantity INT NOT NULL DEFAULT 20,       -- how many to order
    supplier_id     INT NOT NULL,
    status          ENUM('normal','low','restock_ordered') NOT NULL DEFAULT 'normal',
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_stock_not_negative CHECK (stock >= 0),
    FOREIGN KEY (supplier_id) REFERENCES Suppliers(supplier_id)
);

-- 3) Restock_Orders: AI drafts waiting for the owner's approval
--    (needed so the draft message can wait until the owner clicks "Approve & Send")
CREATE TABLE Restock_Orders (
    order_id        INT AUTO_INCREMENT PRIMARY KEY,
    product_id      INT NOT NULL,
    supplier_id     INT NOT NULL,
    quantity        INT NOT NULL,
    urgency         ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
    ai_reason       VARCHAR(255),          -- why the AI suggests this
    message_draft   TEXT NOT NULL,         -- WhatsApp message written by the AI
    status          ENUM('pending','approved','rejected','received') NOT NULL DEFAULT 'pending',
    approved_by     VARCHAR(100),
    approved_at     DATETIME,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id)  REFERENCES Products(product_id),
    FOREIGN KEY (supplier_id) REFERENCES Suppliers(supplier_id)
);

-- 4) Activity_Logs: the diary of everything that happened (audit log)
CREATE TABLE Activity_Logs (
    log_id          INT AUTO_INCREMENT PRIMARY KEY,
    action_type     ENUM('SALE','LOW_STOCK','AI_DRAFT','APPROVED','REJECTED','RESTOCK_RECEIVED') NOT NULL,
    product_id      INT,
    order_id        INT,
    quantity        INT,
    details         VARCHAR(255),
    performed_by    VARCHAR(100) NOT NULL DEFAULT 'system',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES Products(product_id),
    FOREIGN KEY (order_id)   REFERENCES Restock_Orders(order_id),
    INDEX idx_logs_product_time (product_id, action_type, created_at)
);


