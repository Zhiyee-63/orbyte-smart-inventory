const express = require("express");

const app = express();
const port = Number(process.env.PORT) || 3000;

app.get("/health", (_req, res) => {
  res.type("text").send("OK");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
