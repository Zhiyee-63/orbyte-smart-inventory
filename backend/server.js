const express = require("express");
const { getMysqlPool } = require("./mysql");
const { generateSupplierMessage } = require("./gemini");
const cors = require("cors");

const app = express();
app.use(cors());
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.type("text").send("OK");
});

app.get("/health/db", async (_req, res) => {
  try {
    await getMysqlPool().query("SELECT 1");
    return res.json({ status: "ok" });
  } catch (error) {
    if (error.code === "MYSQL_CONFIGURATION_MISSING") {
      return res.status(503).json({
        status: "unavailable",
        error: "mysql_not_configured",
        missing: error.missing,
      });
    }

    if (error.code === "MYSQL_CONFIGURATION_INVALID") {
      return res.status(503).json({
        status: "unavailable",
        error: "mysql_configuration_invalid",
      });
    }

    console.error("MySQL health check failed:", error.code || error.name);
    return res.status(503).json({
      status: "unavailable",
      error: "mysql_connection_failed",
    });
  }
});

// Low when stock is below each product's own reorder level (same rule as the AI endpoint)
const stockStatus = (stock, reorderLevel) =>
  stock < reorderLevel ? "Low" : "OK";

app.post("/api/scan", async (req, res) => {
  const barcode =
    typeof req.body?.barcode === "string" ? req.body.barcode.trim() : "";
  if (!barcode) return res.status(400).json({ error: "barcode_required" });

  try {
    const pool = getMysqlPool();
    const [result] = await pool.query(
      "UPDATE Products SET stock = stock - 1 WHERE barcode = ? AND stock > 0",
      [barcode],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "not_found_or_out_of_stock" });
    }
    const [[row]] = await pool.query(
      "SELECT product_id, stock, reorder_level FROM Products WHERE barcode = ?",
      [barcode],
    );

    // record the sale in the log (so the AI can see sales trends)
    await pool.query(
      "INSERT INTO Activity_Logs (action_type, product_id, quantity, details, performed_by) VALUES ('SALE', ?, 1, 'Item scanned at POS', 'cashier')",
      [row.product_id],
    );

    const status = stockStatus(row.stock, row.reorder_level);
    return res.json({
      barcode,
      stock: row.stock,
      status,
      alert: status === "Low",
    });
  } catch (error) {
    console.error("SCAN ERROR:", error);
    return res.status(500).json({ error: "scan_failed" });
  }
});

app.post("/api/import-sales", async (req, res) => {
  const sales = req.body?.sales;
  if (!Array.isArray(sales) || sales.length === 0) {
    return res.status(400).json({ error: "sales_required" });
  }
  if (sales.length > 5000) {
    return res.status(400).json({ error: "too_many_rows" });
  }

  const pool = getMysqlPool();
  const conn = await pool.getConnection();

  let updated = 0;
  const unknown = [];
  const lowStock = [];
  const shortfall = [];

  try {
    // all-or-nothing: if anything fails, no stock is changed
    await conn.beginTransaction();

    for (const entry of sales) {
      const barcode =
        typeof entry?.barcode === "string" ? entry.barcode.trim() : "";
      const quantity = Number(entry?.quantity);
      if (!barcode || !Number.isInteger(quantity) || quantity <= 0) continue;

      const [rows] = await conn.query(
        "SELECT product_id, name, stock, reorder_level FROM Products WHERE barcode = ? FOR UPDATE",
        [barcode],
      );
      if (rows.length === 0) {
        unknown.push(barcode);
        continue;
      }

      const product = rows[0];
      const newStock = Math.max(0, product.stock - quantity);
      if (quantity > product.stock) shortfall.push(product.name);

      await conn.query("UPDATE Products SET stock = ? WHERE product_id = ?", [
        newStock,
        product.product_id,
      ]);

      await conn.query(
        "INSERT INTO Activity_Logs (action_type, product_id, quantity, details, performed_by) VALUES ('SALE', ?, ?, 'Imported from POS sales CSV', 'pos_import')",
        [product.product_id, quantity],
      );

      updated++;
      if (stockStatus(newStock, product.reorder_level) === "Low") {
        lowStock.push(product.name);
      }
    }

    await conn.commit();
    return res.json({ updated, unknown, lowStock, shortfall });
  } catch (error) {
    await conn.rollback().catch(() => {});
    console.error("IMPORT SALES ERROR:", error);
    return res.status(500).json({ error: "import_failed" });
  } finally {
    conn.release();
  }
});

app.get("/api/inventory", async (_req, res) => {
  try {
    const [rows] = await getMysqlPool().query(
      `SELECT p.barcode, p.name, p.brand, p.category, p.unit, p.stock,
              p.reorder_level, p.reorder_quantity,
              s.name AS supplier, s.preferred_greeting, s.language
       FROM Products p
       JOIN Suppliers s ON s.supplier_id = p.supplier_id
       ORDER BY p.name`,
    );
    return res.json(
      rows.map((r) => ({
        ...r,
        status: stockStatus(r.stock, r.reorder_level),
      })),
    );
  } catch (error) {
    console.error("Inventory failed:", error.code || error.name);
    return res.status(500).json({ error: "inventory_failed" });
  }
});

app.post("/api/approve", async (req, res) => {
  const barcode =
    typeof req.body?.barcode === "string" ? req.body.barcode.trim() : "";
  const approvedBy =
    typeof req.body?.approved_by === "string"
      ? req.body.approved_by.trim()
      : "";

  if (!barcode || !approvedBy) {
    return res.status(400).json({ error: "barcode_and_approved_by_required" });
  }

  try {
    const pool = getMysqlPool();

    const [rows] = await pool.query(
      `SELECT p.product_id, p.name, p.stock, p.reorder_level, p.status,
              p.reorder_quantity, p.unit,
              s.whatsapp AS supplier_phone
       FROM Products p
       JOIN Suppliers s ON s.supplier_id = p.supplier_id
       WHERE p.barcode = ?`,
      [barcode],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "product_not_found" });
    }

    const product = rows[0];
    if (product.stock >= product.reorder_level) {
      return res.status(409).json({ error: "reorder_not_required" });
    }
    if (product.status === "restock_ordered") {
      return res.status(409).json({ error: "already_ordered" });
    }

    // digits only, with country code, e.g. 60123456789
    const supplierPhone = String(
      product.supplier_phone || process.env.SUPPLIER_PHONE_NUMBER || "",
    ).replace(/\D/g, "");
    if (!supplierPhone) {
      return res.status(422).json({ error: "supplier_phone_missing" });
    }

    // the owner-approved draft from the frontend, or a simple fallback
    const messageText =
      typeof req.body?.message === "string" && req.body.message.trim()
        ? req.body.message.trim()
        : `Salam boss, stok ${product.name} kat kedai dah nak habis. Boleh hantar ${product.reorder_quantity} ${product.unit} lagi tak? Terima kasih ya.`;

    const whatsappLink = `https://wa.me/${supplierPhone}?text=${encodeURIComponent(messageText)}`;

    await pool.query(
      "INSERT INTO Activity_Logs (action_type, product_id, details, performed_by) VALUES ('APPROVED', ?, 'Owner approved the restock order', ?)",
      [product.product_id, approvedBy],
    );
    await pool.query(
      "UPDATE Products SET status = 'restock_ordered' WHERE product_id = ?",
      [product.product_id],
    );

    return res.json({
      status: "ok",
      message: "Approved and logged. Open WhatsApp to send it to the supplier.",
      whatsapp_link: whatsappLink,
    });
  } catch (error) {
    console.error("APPROVE ERROR:", error);
    return res.status(500).json({ error: "approve_failed" });
  }
});
app.post("/api/draft-supplier-message", async (req, res) => {
  const {
    businessName,
    productName,
    currentStock,
    reorderLevel,
    reorderQuantity,
    unit,
    supplierName,
    preferredGreeting,
    language,
  } = req.body || {};

  // validate the fields needed for an accurate draft
  if (
    typeof productName !== "string" ||
    !productName.trim() ||
    typeof supplierName !== "string" ||
    !supplierName.trim() ||
    typeof unit !== "string" ||
    !unit.trim() ||
    !Number.isFinite(currentStock) ||
    !Number.isFinite(reorderLevel) ||
    !Number.isFinite(reorderQuantity) ||
    currentStock < 0 ||
    reorderLevel < 0 ||
    reorderQuantity <= 0
  ) {
    return res.status(400).json({
      error: "invalid_or_missing_inventory_data",
    });
  }

  if (currentStock >= reorderLevel) {
    return res.status(409).json({
      error: "reorder_not_required",
      message: "Stock is not below the reorder threshold.",
    });
  }

  const inventoryData = {
    businessName: typeof businessName === "string" ? businessName : "",
    productName: productName.trim(),
    currentStock,
    reorderLevel,
    reorderQuantity,
    unit: unit.trim(),
    supplierName: supplierName.trim(),
    preferredGreeting:
      typeof preferredGreeting === "string" ? preferredGreeting : "",
    language:
      typeof language === "string" && language.trim()
        ? language.trim()
        : "English",
  };

  try {
    const result = await generateSupplierMessage(inventoryData);

    return res.json({
      status: "draft",
      message: result.text,
      requiresHumanApproval: true,
    });
  } catch (error) {
    if (error.code === "GEMINI_API_KEY_MISSING") {
      return res.status(503).json({
        error: "gemini_not_configured",
      });
    }

    console.error("Supplier message generation failed:", error);

    return res.status(502).json({
      error: "draft_generation_failed",
    });
  }
});

app.listen(port, "0.0.0.0", (error) => {
  if (error) {
    console.error(
      `Server failed to listen on port ${port}:`,
      error.code || error.message,
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Server listening on port ${port}`);
});
