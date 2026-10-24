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
| Demo Video        | https://youtu.be/xlp8Vu2SR0k                        |

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

```
.
├── .agents/memory
├── backend/
│   └── database/
         └── queries.sql
         └── schema.sql
         └── seed.sql
   └── README.md
   └── gemini.js
   └── mysql.js
   └── package-lock.json
   └── package.json
   └── server.js
├── frontend/
    ├── public/
          └── favicon.svg
          └── icon.svg
     ├── src/
         └── assets/
               └── hero.png
               └── react.svg
               └── vite.svg
         └── App.css
         └── App.jsx
         └── CameraTest.jsx
         └── index.css
         └── main.jsx
      ├── .gitignore
      ├── README.md
      ├── eslint.config.js
      ├── index.html
      ├── package-lock.json
      ├── package.json
      ├── vite.config.js
├── submission/              # Required submission documents
│   ├── SDC2026_Pentagrammers_Preliminary.pdf      # Preliminary submission
│   ├── SDC2026_Pentagrammers_TechDeclaration.pdf  # Technology declaration
│   ├── SDC2026_Pentagrammers_Replit_POU.pdf       # Replit proof of use
│   └── SDC2026_Pentagrammers_SlideDeck.pdf      
├── .env.example
├── .gitignore
├── .replit                  # Replit run configuration
├── LICENSE
├── README.md
└── package-lock.json
```

### Architecture

```
User(POS/Camera Scan) ──► Replit (Express REST API) ──► MySQL 8 (AivenDB)
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

1. Open the Replit (https://replit.com/@dakhines34/AdmiredClosedMainframe) workspace or import this repository.
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
git clone https://github.com/Zhiyee-63/orbyte-smart-inventory.git
cd orbyte-smart-inventory

# 2. Set up Database
# Execute backend/database/schema.sql followed by backend/database/seed.sql on your MySQL 8 instance.

# 3. Run Backend
cd backend
npm install
cp .env.example .env          # Fill in your Aiven MySQL and Gemini API keys
node server.js

# 4. Run Frontend (in a separate terminal)
cd ../frontend
npm install
npm run dev

# 5. Open http://localhost:5173 in your browser.

### Run Tests

```bash
python -m unittest discover tests
```

---

## How We Use Replit *(Required)*

Development: Built and tested collaboratively in Replit with live database connectivity to Aiven MySQL.

Hosting: The backend REST API is hosted on Replit, providing a stable .replit.dev endpoint for the React frontend.

Secrets: API credentials (Gemini API key, MySQL passwords) are securely stored using Replit Secrets.

📄 Proof of use: [`submission/SDC2026_TeamName_Replit_POU.pdf`](submission/SDC2026_TeamName_Replit_POU.pdf)

## How We Use RunPod *(Required)*

Workload Status: N/A — Our project utilizes the cloud-hosted Google Gemini API (@google/genai SDK, gemini-2.5-flash) directly via Replit rather than self-hosted GPU containers on RunPod.

📄 Proof of use: [`submission/SDC2026_TeamName_Replit_POU.pdf`]

---

## Challenges & Learnings

Challenge: Managing browser security policies and network firewalls between local React development (localhost:5173) and cloud-hosted Replit backend endpoints.

Solution: Configured CORS and Vite proxy rules to ensure seamless communication, alongside enabling public networking preview mode in Replit.

Learning: Balancing deterministic rules (SQL stock math) with generative AI (Bahasa Melayu supplier messaging) ensures both operational accuracy and natural communication without relying on AI for critical database updates.

## Future Improvements

[ ] Automatic delivery receipt scanning via camera OCR to add received stock back into MySQL.

[ ] Multi-supplier price comparison analytics to suggest the most cost-effective restock option.

[ ] Integration into the broader Orbyte multi-tenant SME platform ecosystem.

## Team

| Name        | Role                | GitHub                                   |
| ----------- | ------------------- | ---------------------------------------- |
| Cha Zhi Yi | Team Lead / Frontend | [@Zhiyee-63](https://github.com/Zhiyee-63) |
| DAKHINESWARAN A/L R MANIMARAN  | Backend | [DAKHINESWARAN](https://github.com/DAKHINESWARAN) |
| LOOK ZHI HIN | AI    | [zhihin-ui](https://github.com/zhihin-ui) |
| KIRANI NAURA WIJAYA  | Database   | [kirani16](https://github.com/kirani16) |
| Yew Zhi Xuan | Pitch Deck | [zyew609](https://github.com/zyew609) |

---

## Submission Checklist

- [ ✓ ] Team name, domain (Domain 1 / Domain 2) and SDG track filled in
- [ ✓ ] Slide deck link added
- [ ✓ ] Demo video link added
- [ ] Replit used, with proof of use in `submission/`
- [ ] RunPod used, with proof of use in `submission/`
- [ ] Preliminary submission completed (`SDC2026_TeamName_Preliminary.pdf`)
- [ ] Technology declaration completed (`SDC2026_TeamName_TechDeclaration.pdf`)
- [ ✓ ] Submission files renamed with your team name (replace `TeamName`)
- [ ✓ ] "How to Run" steps verified
- [ ✓ ] No API keys or secrets committed to the repository

## License

This project is licensed under the [Apache License 2.0](LICENSE).
