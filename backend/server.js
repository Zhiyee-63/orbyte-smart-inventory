const express = require("express");
const { getMysqlPool } = require("./mysql");
const { generateSupplierMessage } = require("./gemini");
const twilio = require("twilio");
const cors = require("cors");

const app = express();
app.use(cors());
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
    return res.status(500).json({ error: error.message });
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

    // 1. Fetch product details from MySQL
    const [rows] = await pool.query(
      "SELECT product_id, name FROM Products WHERE barcode = ?",
      [barcode],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "product_not_found" });
    }

    const productId = rows[0].product_id;
    const productName = rows[0].name;

    // kapso for whatsapp
    try {
      const messageText =
        typeof req.body?.message === "string" && req.body.message.trim()
          ? req.body.message.trim()
          : `Approval logged! Product ${productName} (barcode: ${barcode}) was approved by ${approvedBy}. Please process the restock.`;

      const response = await fetch(
        `https://api.kapso.ai/meta/whatsapp/v24.0/${process.env.KAPSO_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": process.env.KAPSO_API_KEY,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: String(process.env.SUPPLIER_PHONE_NUMBER).replace(/\D/g, ""),
            type: "text",
            text: { body: messageText },
          }),
        },
      );
      if (!response.ok) {
        throw new Error(`Kapso ${response.status}: ${await response.text()}`);
      }
    } catch (err) {
      console.log("WhatsApp send skipped/failed:", err.message);
    }

    // 3. Log activity in database
    await pool.query(
      "INSERT INTO Activity_Logs (action_type, product_id, details, performed_by) VALUES ('APPROVED', ?, 'Owner approved the restock order', ?)",
      [productId, approvedBy],
    );

    // 4. Update status in database
    await pool.query(
      "UPDATE Products SET status = 'restock_ordered' WHERE product_id = ?",
      [productId],
    );

    return res.json({
      status: "ok",
      message: "Approved, logged, and supplier notification attempted",
    });
  } catch (error) {
    console.error("APPROVE ERROR:", error);
    return res.status(500).json({ error: error.message });
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

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
