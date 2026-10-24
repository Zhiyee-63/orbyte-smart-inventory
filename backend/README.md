# Orbyte Smart Reorder Assistant: Backend 

> The Node.js and Express API behind Orbyte Smart Reorder Assistant. It deducts stock in MySQL, applies a deterministic reorder rule, and asks Google Gemini to draft Bahasa Melayu WhatsApp restock messages. A human always approves before anything is sent.

## Overview

The backend is a single Express service split into three files: `server.js` (routes and business rules), `mysql.js` (database pool), and `gemini.js` (AI message drafting).

### What it does

- **Deducts stock** when an item is scanned or a POS sales CSV is imported, and writes every sale to `Activity_Logs`.
- **Flags low stock** with one deterministic rule: `stock < reorder_level`. The same rule is used by the scan, import, inventory, and AI endpoints.
- **Drafts supplier messages** with Google Gemini, but only when stock is below the reorder level.
- **Records owner approval**, marks the product as `restock_ordered`, and returns a pre-filled `wa.me` WhatsApp link for the frontend to open.

### Design highlights

- **Rule first, AI second:** Gemini is never called unless the reorder rule passes (otherwise the endpoint returns `409 reorder_not_required`), which avoids wasted tokens and false alerts.
- **Human in the loop:** the AI only returns a draft with `requiresHumanApproval: true`. Nothing is sent to a supplier by the backend. The owner approves through `/api/approve`.
- **All-or-nothing CSV import:** sales are imported in a single MySQL transaction with row locks (`FOR UPDATE`), so a failure changes no stock.
- **Model fallback:** if one Gemini model fails, the next one in the list is tried.
- **Safe startup:** the MySQL pool is created lazily, so the server starts even before secrets are added and reports missing configuration clearly.
- **Guardrailed prompt:** the Gemini system instruction (in Bahasa Melayu) forbids invented prices, delivery dates, or discounts, keeps messages to about 25 to 50 words, and requires a complete message with greeting, stock info, quantity, and closing.

### Tech Stack

| Layer         | Technology                              |
| ------------- | --------------------------------------- |
| Runtime       | Node.js                                 |
| Framework     | Express.js, `cors`                      |
| Database      | MySQL 8 (Aiven Cloud) via `mysql2`      |
| AI / Compute  | Google Gemini API (`@google/genai`)     |
| Hosting / Dev | Replit Cloud                            |

---

## Project Structure

```
backend/
├── database/
│   ├── schema.sql     # Creates the 4 tables (Suppliers, Products, Restock_Orders, Activity_Logs)
│   ├── seed.sql       # Loads the 22 synthetic Malaysian grocery products
│   └── queries.sql    # Reference SQL queries
├── server.js          # Express app, routes, reorder rule
├── mysql.js           # Lazy MySQL connection pool with env validation
├── gemini.js          # Gemini client, system prompt, model fallback
├── package.json
├── package-lock.json
└── README.md
```

---

## Setup & Installation

### Prerequisites

- Node.js 18 or later (only needed to run locally; Replit already provides it)
- A MySQL 8 database (the project uses Aiven) with `database/schema.sql` followed by `database/seed.sql` already loaded
- A Google Gemini API key

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment variables

On Replit, add these in **Secrets**. For local use, export them in your shell. Never commit real values.

| Variable                | Required | Description                                                                 |
| ----------------------- | -------- | --------------------------------------------------------------------------- |
| `MYSQL_HOST`            | Yes      | MySQL host address                                                          |
| `MYSQL_PORT`            | Yes      | Port of the **database**. The code defaults to `3306`, but Aiven gives a custom port, so you must set it |
| `MYSQL_USER`            | Yes      | MySQL username                                                              |
| `MYSQL_PASSWORD`        | Yes      | MySQL password                                                              |
| `MYSQL_DATABASE`        | Yes      | Database name                                                               |
| `MYSQL_CA_CERT`         | Recommended | Aiven CA certificate (full PEM text, including the `BEGIN` and `END` lines) used to verify the SSL connection to MySQL |
| `GEMINI_API_KEY`        | Yes      | Google Gemini API key                                                       |
| `SESSION_SECRET`        | If sessions are used | Long random string used to sign login sessions                  |
| `PORT`                  | No       | Port this Express server listens on (default `3000`)                        |

### 3. Run the server

```bash
node server.js
```

The server listens on `0.0.0.0:3000` by default. On Replit, use the **Backend API** workflow and do not start a second copy in the terminal, because both would compete for the same port.

---

## API Reference

| Method | Route                          | Purpose                                              |
| ------ | ------------------------------ | ---------------------------------------------------- |
| `GET`  | `/health`                      | Server check, returns plain text `OK`                |
| `GET`  | `/health/db`                   | Database check (`SELECT 1`)                          |
| `POST` | `/api/scan`                    | Deduct 1 unit for a scanned barcode                  |
| `POST` | `/api/import-sales`            | Bulk deduct stock from POS sales rows                |
| `GET`  | `/api/inventory`               | List all products with supplier info and stock status |
| `POST` | `/api/draft-supplier-message`  | Generate a Bahasa Melayu WhatsApp draft with Gemini  |
| `POST` | `/api/approve`                 | Record owner approval and return the WhatsApp link   |

### `GET /health/db`

| Result | Response |
|---|---|
| Connected | `200 {"status":"ok"}` |
| Variables missing | `503 {"status":"unavailable","error":"mysql_not_configured","missing":[...]}` |
| Invalid `MYSQL_PORT` | `503 {"error":"mysql_configuration_invalid"}` |
| Connection failed | `503 {"error":"mysql_connection_failed"}` |

### `POST /api/scan`

Request:
```json
{ "barcode": "9556001234567" }
```
Success (`200`):
```json
{ "barcode": "9556001234567", "stock": 4, "status": "Low", "alert": true }
```
Subtracts 1 from stock (only if stock is above 0) and logs a `SALE` in `Activity_Logs`. `status` is `"Low"` when `stock < reorder_level`, otherwise `"OK"`.

Errors: `400 barcode_required`, `404 not_found_or_out_of_stock`, `500 scan_failed`.

### `POST /api/import-sales`

Request (maximum 5000 rows):
```json
{ "sales": [ { "barcode": "9556001234567", "quantity": 3 } ] }
```
Success (`200`):
```json
{ "updated": 1, "unknown": [], "lowStock": ["Beras Jasmine 10kg"], "shortfall": [] }
```
- `unknown`: barcodes not found in the database.
- `lowStock`: products that fell below their reorder level.
- `shortfall`: products where the sold quantity was more than the stock on hand (stock is set to 0, not negative).
- Rows with a missing barcode or a non-positive integer quantity are skipped.

Errors: `400 sales_required`, `400 too_many_rows`, `500 import_failed` (the transaction is rolled back).

### `GET /api/inventory`

Returns an array of products, each with `barcode`, `name`, `brand`, `category`, `unit`, `stock`, `reorder_level`, `reorder_quantity`, `supplier`, `preferred_greeting`, `language`, and a computed `status` (`"Low"` or `"OK"`).

Error: `500 inventory_failed`.

### `POST /api/draft-supplier-message`

Request:
```json
{
  "businessName": "Kedai Runcit Pak Abu",
  "productName": "Beras Jasmine 10kg",
  "currentStock": 2,
  "reorderLevel": 5,
  "reorderQuantity": 10,
  "unit": "kampit",
  "supplierName": "Ahmad",
  "preferredGreeting": "boss",
  "language": "ms-MY"
}
```
Success (`200`):
```json
{ "status": "draft", "message": "Salam boss, beras Jasmine 10kg ...", "requiresHumanApproval": true }
```
Required: `productName`, `supplierName`, `unit` (non-empty strings), and numeric `currentStock`, `reorderLevel`, `reorderQuantity` (`reorderQuantity` must be above 0).

Errors: `400 invalid_or_missing_inventory_data`, `409 reorder_not_required` (stock is not below the reorder level), `503 gemini_not_configured`, `502 draft_generation_failed`.

### `POST /api/approve`

Request (`message` is the owner-approved draft and is optional):
```json
{ "barcode": "9556001234567", "approved_by": "Pak Abu", "message": "Salam boss, ..." }
```
Success (`200`):
```json
{ "status": "ok", "message": "Approved and logged. ...", "whatsapp_link": "https://wa.me/60123456789?text=..." }
```
On success the backend logs an `APPROVED` entry in `Activity_Logs` and sets the product status to `restock_ordered`. If no `message` is sent, a short default Bahasa Melayu message is used. The supplier phone comes from `Suppliers.whatsapp`, falling back to `SUPPLIER_PHONE_NUMBER`, and non-digits are stripped.

Errors: `400 barcode_and_approved_by_required`, `404 product_not_found`, `409 reorder_not_required`, `409 already_ordered`, `422 supplier_phone_missing`, `500 approve_failed`.

---

## How the Backend Fits the Orbyte Journey

1. **Trigger:** the frontend calls `/api/scan` or `/api/import-sales`.
2. **Connected Data:** MySQL stock is deducted and the sale is logged.
3. **Decision Logic:** `stock < reorder_level` marks the product `Low`.
4. **Value-Added AI:** the frontend calls `/api/draft-supplier-message` and Gemini drafts the message.
5. **Human Approval and Audit Log:** the owner edits and approves, `/api/approve` logs it, updates the status, and returns the `wa.me` link.

---

## Gemini Integration (`gemini.js`)

- Uses the `@google/genai` SDK with a lazily created client. A missing `GEMINI_API_KEY` raises `GEMINI_API_KEY_MISSING`.
- Models are tried in this order until one succeeds: `gemini-3.1-flash-lite`, `gemini-3.5-flash`, `gemini-3.8-flash`.
- The inventory JSON is sent as the prompt, and the Bahasa Melayu system instruction controls tone, accuracy, and format.
- Output is plain WhatsApp text only (no markdown, titles, or quotation marks), capped at 1024 output tokens.

## Database Access (`mysql.js`)

- Validates the required `MYSQL_*` variables on first use and throws `MYSQL_CONFIGURATION_MISSING` or `MYSQL_CONFIGURATION_INVALID`, which `/health/db` turns into clear 503 responses.
- Creates one shared pool (up to 10 connections) with SSL enabled for Aiven, using `MYSQL_CA_CERT` for certificate verification.

---

## Security Notes

- Credentials are read only from environment variables.
- `/api/draft-supplier-message`, `/api/approve`, and the other routes currently have **no authentication**, and CORS is open to all origins. Add an API key or login check, rate limiting, and an origin allow-list before public use, or anyone with the URL can use your Gemini quota or approve orders.
- The MySQL connection uses SSL. Set `MYSQL_CA_CERT` to Aiven's CA certificate so the database server's certificate is verified, instead of disabling certificate checks.
- `SESSION_SECRET` must be a long random value kept only in Secrets. Changing it signs out existing sessions.
- Rotate the Gemini key and database password if they are ever exposed.

## Troubleshooting

| Problem                                  | Likely cause                                      | Fix                                                   |
| ---------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| Workflow keeps stopping                  | A second copy of `server.js` is holding port 3000 | Stop the extra terminal process and use the workflow  |
| `/health/db` returns `mysql_not_configured` | Secrets missing or server not restarted        | Add the secrets, then restart the backend             |
| `/api/draft-supplier-message` returns 503 | `GEMINI_API_KEY` missing                         | Add the secret and restart                            |
| Same endpoint returns 502                | All Gemini models failed                          | Check the server logs for each model's error          |
| `/api/approve` returns 422               | Supplier has no WhatsApp number                   | Fill `Suppliers.whatsapp` or set `SUPPLIER_PHONE_NUMBER` |
| Database connection refused              | Wrong host, port, or Aiven allowed IPs            | Check credentials and the Aiven firewall settings     |

## License

See the root `LICENSE` file. Main dependencies: Express (MIT), cors (MIT), mysql2 (MIT), @google/genai (Apache-2.0).