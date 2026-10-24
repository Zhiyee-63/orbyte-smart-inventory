# Orbyte Smart Reorder Assistant 🛒🤖

> A zero-training, human-in-the-loop inventory monitoring and automated WhatsApp restock drafting assistant for Malaysian micro-retailers (*kedai runcit*).

---

## Team Information

| Field                 | Details                                             |
| ---------------------- | ------------------------------------------- |
| **Team Name**          | Pentagrammers                        |
| **Team Domain**        | Domain 2 *(Orbyte Smart SME Challenge)*     |
| **SDG Track (1–17)**   | SDG 8 — Decent Work and Economic Growth     |
| **Team Leader**        | Zhiyi Cha *(or your team leader name)*      |
| **University**         | Universiti Teknikal Malaysia Melaka (UTeM)  |
| **Number of Members**  | 5                                  |

## Links

| Resource          | Link                                           |
| ----------------- | ---------------------------------------------- |
| GitHub Repository | https://github.com/Zhiyee-63/orbyte-smart-inventory |
| Live Demo         | https://e18001d8-ab3c-4883-9464-81086cc8e9f0-00-95b61jke4hrr.sisko.replit.dev |
| RunPod Endpoint   | *N/A (Utilized Google Gemini API via Replit Cloud)* |
| Slide Deck        | *[Insert Google Drive / PDF Link]*             |
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
