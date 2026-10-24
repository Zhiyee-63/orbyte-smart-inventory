# Orbyte Smart Reorder Assistant 🛒🤖

> A zero-training, human-in-the-loop inventory monitoring and automated WhatsApp restock drafting assistant for Malaysian micro-retailers (*kedai runcit*).

---

## Team Information

| Field                 | Details                                             |
| ---------------------- | ------------------------------------------- |
| **Team Name**          | Pentagrammers                        |
| **Team Domain**        | Domain 2     |
| **SDG Track (1–17)**   | SDG 8 — Decent Work and Economic Growth     |
| **Team Leader**        | Cha Zhi Yi     |
| **University**         | Universiti Teknikal Malaysia Melaka (UTeM)  |
| **Number of Members**  | 5                                  |

## Links

| Resource          | Link                                           |
| ----------------- | ---------------------------------------------- |
| GitHub Repository | https://github.com/Zhiyee-63/orbyte-smart-inventory |
| Live Demo         | https://e18001d8-ab3c-4883-9464-81086cc8e9f0-00-95b61jke4hrr.sisko.replit.dev |
| Slide Deck        | https://drive.google.com/file/d/1-7fuNUfnfG1_vIWEsT6uNC2K3SuZ4k3u/view?usp=sharing            |
| Demo Video        | *[Insert YouTube Link]*                        |

---

## Overview

### Problem

Traditional Malaysian micro-retailers (*kedai runcit* like Kedai Runcit Pak Abu) rely on manual stock counting, memory, and late-night messaging to follow up with multiple suppliers. When essential stock runs low, owners spend 30 to 45 minutes every evening manually checking shelves, looking up contacts, and typing repetitive WhatsApp orders. This manual busywork leads to costly stockouts on high-demand weekends, administrative burnout, and human counting errors.

### Solution

The **Orbyte Smart Reorder Assistant** bridges Point of Sale activity directly to supplier replenishment. Cashiers record sales using barcode scanning (camera or USB) or POS CSV imports, which updates real-time inventory in MySQL. When stock drops below the reorder threshold, **Google Gemini AI** automatically generates a polite, localized Bahasa Melayu WhatsApp restock message tailored to the supplier. The shop owner (*Pak Abu*) stays in full control through a human-approval modal before messages are sent and logged.

### Key Features

- **Multi-Modal POS Input:** Supports zero-training barcode scanning via USB scanners, mobile/webcam cameras (`html5-qrcode`), manual entry, or bulk daily POS sales CSV imports.
- **Rule-Driven AI Triggers:** Deterministic SQL stock validation ensures AI is invoked only when necessary, preventing unnecessary token usage or false alerts.
- **Localized Bahasa Melayu AI Drafts:** Leverages Google Gemini (`gemini-2.5-flash`) to construct natural supplier restock messages incorporating correct product units and supplier greeting styles.
- **Human-in-the-Loop Control:** Owners can review alerts, adjust restock quantities for weekend rushes, and edit message drafts before final approval.
- **Immutable Audit Trail:** Automatically logs all approvals, timestamps, suppliers, and approver names into an Activity & Audit Log.

### Tech Stack

| Layer         | Technology                  |
| ------------- | ---------------------------- |
| Frontend      | React 18, Vite, `html5-qrcode` |
| Backend       | Node.js, Express.js         |
| Database      | MySQL 8 (Aiven Cloud)        |
| AI / Compute  | Google Gemini API (`@google/genai`) |
| Hosting / Dev | Replit Cloud                |

---

## Project Structure

├── docs/                     # Screenshots, architecture diagrams, Replit proof
├── backend/
│   ├── database/             # schema.sql, seed.sql, queries.sql
│   ├── gemini.js             # Google Gemini API integration & system instructions
│   ├── mysql.js              # Aiven MySQL 8 connection pool
│   ├── server.js             # Express REST API endpoints (/api/scan, /api/approve, etc.)
│   └── package.json          # Backend dependencies
├── frontend/
│   ├── src/                  # React components (App.jsx, CameraTest.jsx, App.css)
│   ├── index.html            # HTML entry point
│   ├── vite.config.js        # Vite & proxy configuration
│   └── package.json          # Frontend dependencies
├── submission/               # Required submission documents (.pdf)
├── .env.example              # Example environment variables
├── .gitignore
├── .replit                   # Replit run configuration
├── LICENSE                   # Apache License 2.0
└── README.md
```

### Architecture

```
User (POS / Camera Scan) ──► Replit (Express REST API) ──► MySQL 8 (Aiven DB)
│
└──► Google Gemini API (Bahasa Melayu Draft)
│
└──► Human Approval Modal (Pak Abu)
│
└──► WhatsApp / Activity Audit Log
```

---
## How to Run

### Option 1 — Run on Replit (Recommended)

1. Open the Replit workspace or import this repository.
2. Open the **Secrets** tab (🔒) and add your environment variables:
   - `PORT=3000`
   - `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
   - `GEMINI_API_KEY`
   - `KAPSO_API_KEY`, `KAPSO_PHONE_NUMBER_ID`, `SUPPLIER_PHONE_NUMBER`
3. Run `schema.sql` and `seed.sql` on your MySQL instance.
4. Start the backend (`cd backend && node server.js`) and frontend (`cd frontend && npm run dev`).

### Option 2 — Run Locally

```bash
# 1. Clone the repository
git clone [https://github.com/Zhiyee-63/orbyte-smart-inventory.git](https://github.com/Zhiyee-63/orbyte-smart-inventory.git)
cd orbyte-smart-inventory

# 2. Setup Backend
cd backend
npm install
cp ../.env.example .env       # Fill in your Aiven MySQL & Gemini API keys
node server.js                # Runs on port 3000

# 3. Setup Frontend (in a new terminal)
cd frontend
npm install
npm run dev                   # Runs on http://localhost:5173

### Run Tests

```bash
python -m unittest discover tests
```

---
