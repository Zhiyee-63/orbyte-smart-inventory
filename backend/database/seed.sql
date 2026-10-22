-- Orbyte Smart Inventory — demo data (run 2nd, after schema.sql)
-- Demo business: "Kedai Runcit Pak Ali", a small family-run grocery shop in Melaka
-- Supplier names, contact people, phone numbers and barcodes are made up.
-- Running this file again needs schema.sql first (schema.sql resets all tables).

-- =====================================================================
-- SUPPLIERS (who the shop buys from) — all WhatsApp messages in Bahasa Melayu
-- =====================================================================
INSERT INTO Suppliers (name, contact_person, whatsapp, language, preferred_greeting, lead_time_days) VALUES
('Hup Seng Distributors',   'Encik Wong',  '60120000001', 'Malay', 'Hai Encik Wong',              2),  -- 1: minuman
('Roti Segar Delivery',     'Puan Aminah', '60120000002', 'Malay', 'Assalamualaikum Puan Aminah', 1),  -- 2: roti (harian)
('Pemborong Ah Seng',       'Ah Seng',     '60120000003', 'Malay', 'Hai Tauke Ah Seng',           3),  -- 3: barang kering & dapur
('Ladang Telur Sri Melaka', 'Encik Rahim', '60120000004', 'Malay', 'Assalamualaikum Encik Rahim', 1),  -- 4: telur (harian)
('Syarikat Pemborong Ali',  'Encik Ali',   '60120000005', 'Malay', 'Assalamualaikum Encik Ali',   2);  -- 5: barangan rumah & diri

-- =====================================================================
-- PRODUCTS (each barcode = the product's "ID card")
-- Demo setup:
--   * Roti Putih Gardenia and Maggi Kari are already LOW -> AI drafts can be shown right away
--   * Milo is exactly at its limit -> scan it ONCE during the live demo to trigger the AI
-- =====================================================================
INSERT INTO Products (barcode, name, brand, category, unit, stock, reorder_level, reorder_quantity, supplier_id, status) VALUES
-- Minuman
('9550000000011', 'Milo Tin (1kg)',                      'Nestle',        'Minuman',          'tin',    5,  5,  12, 1, 'normal'),  -- 1  demo trigger
('9550000000028', '100Plus Original (325ml)',            'F&N',           'Minuman',          'tin',    30, 24, 48, 1, 'normal'),  -- 2
('9550000000035', 'Air Mineral Spritzer (1.5L)',         'Spritzer',      'Minuman',          'botol',  26, 12, 24, 1, 'normal'),  -- 3
-- Makanan harian
('9550000000042', 'Roti Putih Gardenia Original (400g)', 'Gardenia',      'Roti',             'buku',   4,  6,  15, 2, 'low'),     -- 4  already low
('9550000000059', 'Telur Ayam Gred A (30 biji)',         'Ladang Sri Melaka', 'Telur',        'papan',  7,  4,  10, 4, 'normal'),  -- 5
('9550000000066', 'Maggi Kari (5 peket)',                'Maggi',         'Makanan Segera',   'peket',  6,  8,  24, 3, 'low'),     -- 6  already low
-- Barangan dapur
('9550000000073', 'Beras Jasmine Wangi (10kg)',          'Jasmine',       'Barangan Dapur',   'beg',    9,  4,  10, 3, 'normal'),  -- 7
('9550000000080', 'Minyak Masak Cap Buruh (5kg)',        'Buruh',         'Barangan Dapur',   'botol',  8,  4,  10, 3, 'normal'),  -- 8
('9550000000097', 'Gula Prai Kasar (1kg)',               'Prai',          'Barangan Dapur',   'peket',  15, 8,  20, 3, 'normal'),  -- 9
('9550000000103', 'Susu Pekat Manis F&N (500g)',         'F&N',           'Barangan Dapur',   'tin',    18, 8,  24, 3, 'normal'),  -- 10
-- Barangan rumah
('9550000000110', 'Serbuk Pencuci Breeze (2kg)',         'Breeze',        'Barangan Rumah',   'beg',    10, 4,  10, 5, 'normal'),  -- 11
('9550000000127', 'Tisu Muka Premier (4 kotak)',         'Premier',       'Barangan Rumah',   'peket',  11, 5,  12, 5, 'normal'),  -- 12
-- 10 new daily-life products
('9550000000134', 'Sabun Mandi Lifebuoy Total 10 (4 x 100g)', 'Lifebuoy', 'Penjagaan Diri',   'peket',  12, 5,  12, 5, 'normal'),  -- 13
('9550000000141', 'Syampu Sunsilk Hitam Berkilau (320ml)',    'Sunsilk',  'Penjagaan Diri',   'botol',  8,  4,  10, 5, 'normal'),  -- 14
('9550000000158', 'Ubat Gigi Colgate Maximum Cavity Protection (175g)', 'Colgate', 'Penjagaan Diri', 'tiub', 14, 6, 12, 5, 'normal'),  -- 15
('9550000000165', 'Cecair Pencuci Pinggan Sunlight Lemon (900ml)', 'Sunlight', 'Barangan Rumah', 'botol', 10, 5, 12, 5, 'normal'),  -- 16
('9550000000172', 'Pelembut Fabrik Downy Sunrise Fresh (1.4L)', 'Downy',  'Barangan Rumah',   'peket',  7,  4,  8,  5, 'normal'),  -- 17
('9550000000189', 'Lampin Pakai Buang Drypers Wee Wee Dry (M, 30 keping)', 'Drypers', 'Bayi', 'peket',  6,  3,  6,  5, 'normal'),  -- 18
('9550000000196', 'Kopi Putih OLDTOWN 3 dalam 1 (15 sachet)', 'OLDTOWN',  'Minuman',          'peket',  9,  4,  10, 1, 'normal'),  -- 19
('9550000000202', 'Teh Uncang BOH Cameronian Gold (100 uncang)', 'BOH',   'Minuman',          'kotak',  8,  4,  10, 1, 'normal'),  -- 20
('9550000000219', 'Kicap Manis Kipas Udang (345ml)',     'Kipas Udang',   'Barangan Dapur',   'botol',  10, 4,  12, 3, 'normal'),  -- 21
('9550000000226', 'Biskut Hup Seng Cream Crackers (428g)', 'Hup Seng',    'Biskut',           'tin',    9,  4,  10, 3, 'normal');  -- 22

-- =====================================================================
-- SALES HISTORY: 14 days, so the AI can see the pattern.
-- Daily-need items (bread, eggs, drinks, noodles) sell more; weekends sell a bit more.
-- =====================================================================
INSERT INTO Activity_Logs (action_type, product_id, quantity, details, performed_by, created_at)
WITH RECURSIVE days AS (
    SELECT 1 AS d
    UNION ALL
    SELECT d + 1 FROM days WHERE d < 14
)
SELECT
    'SALE',
    p.product_id,
    CASE p.product_id
        WHEN 2  THEN 6   -- 100Plus
        WHEN 3  THEN 4   -- Air mineral
        WHEN 4  THEN 5   -- Roti
        WHEN 5  THEN 2   -- Telur
        WHEN 6  THEN 3   -- Maggi
        WHEN 9  THEN 2   -- Gula
        WHEN 10 THEN 2   -- Susu pekat
        WHEN 13 THEN 2   -- Sabun mandi
        WHEN 15 THEN 2   -- Ubat gigi
        WHEN 21 THEN 2   -- Kicap
        ELSE 1           -- everything else
    END
    + ((days.d * p.product_id) % 3)                                          -- small daily variation
    + IF(DAYOFWEEK(CURDATE() - INTERVAL days.d DAY) IN (1, 7), 2, 0),        -- weekend boost
    'Jualan harian (data sintetik)',
    'cashier',
    (CURDATE() - INTERVAL days.d DAY) + INTERVAL 18 HOUR
FROM days
CROSS JOIN Products p;

-- =====================================================================
-- ONE FINISHED EXAMPLE of the full journey, so the audit log is not empty
-- (eggs ran low last week -> AI drafted -> owner approved -> eggs arrived)
-- =====================================================================
INSERT INTO Restock_Orders (product_id, supplier_id, quantity, urgency, ai_reason, message_draft,
                            status, approved_by, approved_at, created_at)
VALUES (5, 4, 10, 'high',
        'Telur cepat habis pada hujung minggu dan stok hanya cukup untuk 1 hari.',
        'Assalamualaikum Encik Rahim, ini Kedai Runcit Pak Ali. Boleh hantar 10 papan Telur Ayam Gred A esok pagi? Terima kasih.',
        'received', 'Pak Ali', NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 5 DAY);

INSERT INTO Activity_Logs (action_type, product_id, order_id, quantity, details, performed_by, created_at) VALUES
('LOW_STOCK',        5, NULL, NULL, 'Stok Telur Ayam mencapai paras minimum',            'system',  NOW() - INTERVAL 5 DAY - INTERVAL 2 MINUTE),
('AI_DRAFT',         5, 1,    10,   'AI menyediakan draf mesej untuk Ladang Telur Sri Melaka', 'system', NOW() - INTERVAL 5 DAY - INTERVAL 1 MINUTE),
('APPROVED',         5, 1,    10,   'Pemilik meluluskan dan menghantar pesanan WhatsApp', 'Pak Ali', NOW() - INTERVAL 5 DAY),
('RESTOCK_RECEIVED', 5, 1,    10,   'Barang sampai, stok bertambah 10',                  'Pak Ali', NOW() - INTERVAL 4 DAY);
