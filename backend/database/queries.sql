-- Orbyte Smart Inventory — SQL queries for server.js (reference, do not run as a script)
-- Demo business: "Kedai Runcit Pak Ali", a small family-run grocery shop in Melaka (all data is synthetic)
-- Database: MySQL 8 (hosted on Aiven)

-- =====================================================================
-- PART 3 — QUERIES FOR THE BACKEND (give these to the Backend Developer)
-- Use them with the "mysql2" package in Node.js:
--   const [rows] = await db.execute(SQL, [value1, value2]);
-- "?" = a value the backend fills in. NEVER glue user input into the SQL
-- string directly (that causes SQL injection).
-- =====================================================================

/* ---------- Q1. SCAN: find the product by barcode -----------------
   When: right after the cashier scans.
   Fills: ? = barcode
SELECT p.product_id, p.barcode, p.brand, p.category, p.status, s.supplier_id, s.whatsapp,
       s.lead_time_days,
       -- names below match the fields server.js expects in /api/draft-supplier-message
       p.name               AS productName,
       p.stock              AS currentStock,
       p.reorder_level      AS reorderLevel,
       p.reorder_quantity   AS reorderQuantity,
       p.unit               AS unit,
       s.name               AS supplierName,
       s.preferred_greeting AS preferredGreeting,
       s.language           AS language
FROM Products p
JOIN Suppliers s ON s.supplier_id = p.supplier_id
WHERE p.barcode = ?;
   If no row comes back -> show "Unknown barcode".
*/

/* ---------- Q2. SELL: subtract stock ------------------------------
   Fills: ? = quantity sold (usually 1), ? = barcode, ? = quantity again
UPDATE Products
SET stock = stock - ?
WHERE barcode = ? AND stock >= ?;
   If affectedRows = 0 -> not enough stock, do not continue.
*/

/* ---------- Q3. LOG THE SALE ------------------------------------
   Fills: ? = product_id, ? = quantity, ? = cashier name
INSERT INTO Activity_Logs (action_type, product_id, quantity, details, performed_by)
VALUES ('SALE', ?, ?, 'Item scanned at POS', ?);
*/

/* ---------- Q4. CHECK: is it low, and is there no draft yet? ------
   Fills: ? = product_id
   Returns needs_restock = 1 only when stock < reorder_level (same rule as server.js) AND
   there is no pending/approved order already (prevents spamming the AI).
SELECT p.stock, p.reorder_level,
       (p.stock < p.reorder_level
        AND NOT EXISTS (
            SELECT 1 FROM Restock_Orders r
            WHERE r.product_id = p.product_id
              AND r.status IN ('pending','approved')
        )) AS needs_restock
FROM Products p
WHERE p.product_id = ?;
*/

/* ---------- Q5. MARK AS LOW + LOG IT ------------------------------
   Fills: ? = product_id (both queries)
UPDATE Products SET status = 'low' WHERE product_id = ?;

INSERT INTO Activity_Logs (action_type, product_id, details)
VALUES ('LOW_STOCK', ?, 'Stock reached the minimum limit');
*/

/* ---------- Q6. SALES TREND for the AI (last 7 days) ---------------
   Fills: ? = product_id
   Send these numbers to Gemini in the prompt.
SELECT
    COALESCE(SUM(quantity), 0)                                   AS sold_last_7_days,
    ROUND(COALESCE(SUM(quantity), 0) / 7, 1)                     AS avg_per_day,
    ROUND(COALESCE(SUM(CASE WHEN DAYOFWEEK(created_at) IN (1,7)
                            THEN quantity END), 0)
          / GREATEST(1, COUNT(DISTINCT CASE WHEN DAYOFWEEK(created_at) IN (1,7)
                                            THEN DATE(created_at) END)), 1) AS avg_per_weekend_day
FROM Activity_Logs
WHERE action_type = 'SALE'
  AND product_id = ?
  AND created_at >= NOW() - INTERVAL 7 DAY;
*/

/* ---------- Q7. SAVE THE AI DRAFT + LOG IT -------------------------
   Fills: product_id, supplier_id, quantity, urgency, ai_reason, message_draft
INSERT INTO Restock_Orders (product_id, supplier_id, quantity, urgency, ai_reason, message_draft)
VALUES (?, ?, ?, ?, ?, ?);
   -> take insertId from the result, it is the new order_id

INSERT INTO Activity_Logs (action_type, product_id, order_id, quantity, details)
VALUES ('AI_DRAFT', ?, ?, ?, 'AI drafted a restock message, waiting for owner approval');
   Fills: product_id, order_id, quantity
*/

/* ---------- Q8. OWNER'S INBOX: drafts waiting for approval ---------
SELECT r.order_id, r.quantity, r.urgency, r.ai_reason, r.message_draft, r.created_at,
       p.name AS product_name, p.stock, p.unit,
       s.name AS supplier_name, s.whatsapp
FROM Restock_Orders r
JOIN Products  p ON p.product_id  = r.product_id
JOIN Suppliers s ON s.supplier_id = r.supplier_id
WHERE r.status = 'pending'
ORDER BY FIELD(r.urgency, 'high', 'medium', 'low'), r.created_at;
*/

/* ---------- Q9. APPROVE & SEND (run all 3 together) ----------------
   The owner may have edited the message, so save the final text.
   Fills: ? = final message, ? = owner name, ? = order_id
UPDATE Restock_Orders
SET status = 'approved', message_draft = ?, approved_by = ?, approved_at = NOW()
WHERE order_id = ? AND status = 'pending';

   Fills: ? = product_id
UPDATE Products SET status = 'restock_ordered' WHERE product_id = ?;

   Fills: ? = product_id, ? = order_id, ? = quantity, ? = owner name
INSERT INTO Activity_Logs (action_type, product_id, order_id, quantity, details, performed_by)
VALUES ('APPROVED', ?, ?, ?, 'Owner approved and sent the WhatsApp order', ?);
   After this, the backend opens: https://wa.me/<whatsapp>?text=<message>
*/

/* ---------- Q10. REJECT a draft -----------------------------------
   Fills: ? = owner name, ? = order_id
UPDATE Restock_Orders
SET status = 'rejected', approved_by = ?, approved_at = NOW()
WHERE order_id = ? AND status = 'pending';

   Fills: ? = product_id, ? = order_id, ? = owner name
INSERT INTO Activity_Logs (action_type, product_id, order_id, details, performed_by)
VALUES ('REJECTED', ?, ?, 'Owner rejected the AI draft', ?);
*/

/* ---------- Q11. GOODS ARRIVED: add stock back ---------------------
   Fills: ? = order_id
UPDATE Restock_Orders SET status = 'received' WHERE order_id = ? AND status = 'approved';

   Fills: ? = quantity, ? = product_id
UPDATE Products SET stock = stock + ?, status = 'normal' WHERE product_id = ?;

   Fills: ? = product_id, ? = order_id, ? = quantity, ? = owner name
INSERT INTO Activity_Logs (action_type, product_id, order_id, quantity, details, performed_by)
VALUES ('RESTOCK_RECEIVED', ?, ?, ?, 'Goods arrived, stock increased', ?);
*/

/* ---------- Q12. DASHBOARD: all products ----------------------------
SELECT p.product_id, p.barcode, p.name, p.brand, p.category, p.unit, p.stock, p.reorder_level, p.status,
       s.name AS supplier_name
FROM Products p
JOIN Suppliers s ON s.supplier_id = p.supplier_id
ORDER BY FIELD(p.status, 'low', 'restock_ordered', 'normal'), p.name;
*/

/* ---------- Q13. AUDIT LOG page (latest 50, without plain sales) ---
SELECT l.created_at, l.action_type, p.name AS product_name, l.quantity,
       l.details, l.performed_by
FROM Activity_Logs l
LEFT JOIN Products p ON p.product_id = l.product_id
WHERE l.action_type <> 'SALE'
ORDER BY l.created_at DESC
LIMIT 50;
*/

/* ---------- Q14. SETTINGS: owner changes limit or supplier ----------
   Fills: ? = reorder_level, ? = reorder_quantity, ? = supplier_id, ? = product_id
UPDATE Products SET reorder_level = ?, reorder_quantity = ?, supplier_id = ? WHERE product_id = ?;

   Fills: ? = name, ? = contact_person, ? = whatsapp, ? = language, ? = preferred_greeting, ? = lead_time_days, ? = supplier_id
UPDATE Suppliers
SET name = ?, contact_person = ?, whatsapp = ?, language = ?, preferred_greeting = ?, lead_time_days = ?
WHERE supplier_id = ?;
*/
