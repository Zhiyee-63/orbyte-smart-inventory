const express = require("express");
const { getMysqlPool } = require("./mysql");
const { generateSupplierMessage } = require("./gemini");

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "16kb" }));

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

const LOW_STOCK_THRESHOLD = 5;
const stockStatus = (stock) => (stock <= LOW_STOCK_THRESHOLD ? "Low" : "OK");

app.post("/api/scan", async (req, res) => {
  const barcode =
    typeof req.body?.barcode === "string" ? req.body.barcode.trim() : "";
  if (!barcode) return res.status(400).json({ error: "barcode_required" });

  try {
    const pool = getMysqlPool();
    const [result] = await pool.query(
      "UPDATE products SET stock = stock - 1 WHERE barcode = ? AND stock > 0",
      [barcode],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "not_found_or_out_of_stock" });
    }
    const [[row]] = await pool.query(
      "SELECT stock FROM products WHERE barcode = ?",
      [barcode],
    );
    const status = stockStatus(row.stock);
    return res.json({
      barcode,
      stock: row.stock,
      status,
      alert: status === "Low",
    });
  } catch (error) {
    console.error("Scan failed:", error.code || error.name);
    return res.status(500).json({ error: "scan_failed" });
  }
});

app.get("/api/inventory", async (_req, res) => {
  try {
    const [rows] = await getMysqlPool().query(
      "SELECT barcode, name, stock FROM products ORDER BY name",
    );
    return res.json(rows.map((r) => ({ ...r, status: stockStatus(r.stock) })));
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
      "SELECT name FROM products WHERE barcode = ?",
      [barcode],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "product_not_found" });

    // send Whatsapp message
    await pool.query(
      "INSERT INTO activity_log (barcode, action, approved_by) VALUES (?, 'approved', ?)",
      [barcode, approvedBy],
    );
    return res.json({
      status: "ok",
      message: "Approved and logged (WhatsApp not connected yet)",
    });
  } catch (error) {
    console.error("Approve failed:", error.code || error.name);
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

    console.error(
      "Supplier message generation failed:",
      error.code || error.name,
    );

    return res.status(502).json({
      error: "draft_generation_failed",
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
