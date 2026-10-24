# Orbyte Smart Reorder Assistant — Frontend 🛒💻

This directory contains the React & Vite frontend for the **Orbyte Smart Reorder Assistant**, built for the SDC Hackathon 2026 (Domain 2: Orbyte Smart SME Challenge).

---

## ✨ Features
- **Point of Sale (POS) Input:** Manual barcode entry or quick sales recording.
- **Hardware & Camera Barcode Scanning:** Integrated with `html5-qrcode` supporting EAN-13, UPC, and camera scanning for zero-training operation.
- **Bulk POS Sales CSV Import:** Upload daily sales CSV files to update inventory in bulk.
- **Real-Time Live Stock Dashboard:** Displays current inventory levels, alert thresholds, suppliers, and live stock status (`⚠️ Low Stock` vs `✅ Good`).
- **Low Stock AI Draft Modal:** Automatically pops up when stock hits or drops below the reorder level, showing the AI-generated Bahasa Melayu WhatsApp draft.
- **Interactive Owner Controls:** Allows shop owner (*Pak Abu*) to adjust restock quantities, edit the draft message, and approve orders directly to WhatsApp.
- **Activity & Audit Log Table:** Tracks all restock approvals, timestamps, suppliers, and approver names.

---

## 🛠️ Tech Stack
- **Framework:** React 18 / Vite
- **Styling:** CSS3 / Responsive Layouts
- **Barcode Scanner:** `html5-qrcode`
- **Communication:** Fetch API connected to Express backend

---

## 🚀 Getting Started & Local Development

### 1. Install Dependencies
Make sure you are inside the `frontend/` directory, then run:
```bash
npm install
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
