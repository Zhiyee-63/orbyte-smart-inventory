const express = require("express");
const { getMysqlPool } = require("./mysql");
const { generateText } = require("./gemini");

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

app.post("/api/gemini", async (req, res) => {
  const prompt = req.body?.prompt;

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "prompt_required" });
  }

  if (prompt.length > 10_000) {
    return res.status(413).json({ error: "prompt_too_large" });
  }

  try {
    const result = await generateText(prompt.trim());
    return res.json(result);
  } catch (error) {
    if (error.code === "GEMINI_API_KEY_MISSING") {
      return res.status(503).json({
        error: "gemini_not_configured",
        missing: ["GEMINI_API_KEY"],
      });
    }

    console.error("Gemini request failed:", error.code || error.name);
    return res.status(502).json({ error: "gemini_request_failed" });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
