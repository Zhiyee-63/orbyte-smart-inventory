# Orbyte Smart Reorder Assistant 🛒🤖
**SDC Hackathon 2026 — Domain 2: Orbyte Smart SME Challenge (Less Busywork, Better Business)**

## 📌 Project Summary
**Orbyte Smart Reorder Assistant** is a human-in-the-loop inventory monitoring and automated supplier restock drafting system built for Malaysian micro-retailers (*kedai runcit* such as *Kedai Runcit Pak Abu*). 

Instead of spending 30–45 minutes every night counting stock and typing repetitive WhatsApp orders to suppliers, cashiers simply scan items at the Point of Sale (via USB scanner, mobile/webcam camera, or CSV import). When an item drops below its reorder threshold in MySQL, **Google Gemini AI** automatically drafts a natural, polite **Bahasa Melayu Malaysia** WhatsApp restock order tailored to that supplier. The shop owner stays in full control—reviewing, adjusting quantities, and approving the message with one click before it opens in WhatsApp and logs to an immutable Audit Trail.

---

## 🎥 Product Demo & Links
- **YouTube Product Demo Video:** [Insert YouTube Link Here]
- **Live Replit Backend URL:** `[https://e18001d8-ab3c-4883-9464-81086cc8e9f0-00-95b61jke4hrr.sisko.replit.dev]`
- **Health Check Endpoint:** `https://e18001d8-ab3c-4883-9464-81086cc8e9f0-00-95b61jke4hrr.sisko.replit.dev/health`
- **Pitch Deck Slides:** See `/docs/Pitch_Deck.pdf`
- **Preliminary Proposal PDF:** See `/docs/SDC2026_TeamName_Preliminary.pdf`

---

## 🔄 The 5-Step Automated Journey (Orbyte Ecosystem Fit)
1. **Trigger:** Cashier scans a barcode via Camera (`html5-qrcode`), USB scanner, manual input, or uploads a POS sales `.csv`.
2. **Connected Data:** Express.js backend on **Replit** deducts stock in **Aiven MySQL 8** and retrieves the product's reorder level, unit, and supplier preferences.
3. **Decision Logic & Value-Added AI:** Deterministic rule checks `stock < reorder_level`. Only when low stock is detected does **Google Gemini (`@google/genai`)** draft a contextual Bahasa Melayu WhatsApp message.
4. **Human Approval (People Stay in Control):** Owner (*Pak Abu*) reviews the popup modal, adjusts restock quantity, edits the message if needed, and clicks **Approve & Send Order**.
5. **Visible Outcome & Audit Log:** Pre-filled WhatsApp chat launches via `wa.me`, product status updates to `restock_ordered`, and the approval is logged in `Activity_Logs`.

---

## 🛠️ Tech Stack & Declaration
| Layer | Technology | License |
| :--- | :--- | :--- |
| **Frontend** | React, Vite, `html5-qrcode` | MIT / Apache-2.0 |
| **Backend & Cloud** | Node.js, Express.js, hosted on **Replit** | MIT |
| **Database** | MySQL 8 hosted on **Aiven** (`mysql2`) | MIT |
| **GenAI** | Google Gemini API (`@google/genai` SDK) | Apache-2.0 |
| **RunPod Utilization** | N/A (Utilized cloud-hosted Google Gemini API via Replit) | N/A |

---

## 🚀 Setup & Installation
### 1. Database Setup (MySQL 8)
Run `schema.sql` followed by `seed.sql` on your MySQL instance to create the 4 tables (`Suppliers`, `Products`, `Restock_Orders`, `Activity_Logs`) and load the 22 synthetic Malaysian grocery products.

### 2. Backend Setup (Replit / Local)
```bash
cd backend
npm install
# Configure environment variables:
# MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, GEMINI_API_KEY
node server.js
