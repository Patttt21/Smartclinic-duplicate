# Smart Clinic — Outpatient Management & Clinical Assistant

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase_PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel Ready](https://img.shields.io/badge/Deployment-Vercel_Serverless-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![Google Gemini API](https://img.shields.io/badge/Google_Gemini-3.8_Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Compliance](https://img.shields.io/badge/Compliance-HIPAA_Ready_Audit-0d9488)](#security-and-compliance)

A modern, production-ready, full-stack **Smart Clinic Management Web Application** engineered with integrated artificial intelligence capabilities and cloud persistence. Smart Clinic unites clinical workflows, electronic medical records (EMR), outpatient scheduling, diagnostic pathology, digital pharmacy inventory, billing reconciliation, and automated clinical documentation into a unified, secure platform.

---

## Project Leadership & Governance

| Attribute | Profile & Credentials |
|---|---|
| **Project Manager** | **Mr. Lloyd Christopher F. Dacles**, MIS, CCIP, CLYSSB, CITSMP, DBMP, CPAA, ITPO, CDSA |
| **System Governance** | Health Informatics, Clinical Operations Management & Data Architecture |
| **Certifications** | Master in Information Systems (MIS)<br>Certified Cyber Incident Planner (CCIP)<br>Certified Lean Six Sigma Black Belt (CLYSSB)<br>Certified Information Technology Service Management Professional (CITSMP)<br>Database Management Professional (DBMP)<br>Certified Public Auditing Associate (CPAA)<br>Information Technology Project Officer (ITPO)<br>Certified Data Science Associate (CDSA) |
| **Architectural Scope** | Role-Based Access Control, AI Clinical Decision Support, Electronic Medical Records, Quality & Six Sigma Process Integration, Supabase Cloud Persistence, and Vercel Serverless Architecture |

---

## 1. Key System Modules

Smart Clinic is architected around 7 distinct operational roles and modular clinical micro-workflows:

### 🧑‍⚕️ 1. Doctor Consultation Suite
- **Electronic Medical Records (EMR):** Comprehensive longitudinal patient histories, chronic conditions, and past encounters.
- **Structured SOAP Documentation:** Assisted and manual authoring of Subjective, Objective, Assessment, and Plan documentation.
- **ICD-10 Diagnostic Coding:** Multi-diagnostic coding with primary and secondary designation.
- **Digital Prescriptions:** Complete e-prescribing with dosage, frequency, route, duration, and patient instructions.
- **Diagnostic Lab Ordering:** Laboratory panel ordering (CBC, CMP, Lipid Profile, Urinalysis, Thyroid, HbA1c).
- **Medical Sick Leave Certificates:** Direct certificate generator with date ranges and clinical recommendations.

### 🩺 2. Triage & Nursing Workflow
- **Vital Signs Entry:** Blood pressure (systolic/diastolic), heart rate, respiratory rate, temperature, oxygen saturation (SpO2), height, weight, and automated BMI calculations.
- **Waiting Room Management:** Triaging routine vs. urgent presentations.

### 📋 3. Reception & Queue Management
- **Patient Registration:** Fast intake form with emergency contact, demographics, blood group, and insurance policy recording.
- **Appointment Scheduling:** Calendar and timeline views with doctor availability slots and appointment status progression (*Scheduled → Confirmed → Checked In → In Consultation → Completed → Cancelled → No Show*).
- **Live Waiting Queue:** Public queue display with ticket numbers (e.g., A-101, B-201), room allocations, and patient call broadcasts.

### 🧪 4. Diagnostic Pathology & Laboratory
- **Sample Tracking Workflow:** Complete custody lifecycle (*Requested → Sample Collected → Processing → Result Available → Reviewed*).
- **Result Parameter Entry:** Parameter entry with automated abnormal flag tagging (*Normal, High, Low, Critical*) evaluated against standardized reference intervals.
- **Printable Pathology Reports:** High-fidelity certified reports ready for printing or PDF export.

### 💊 5. Pharmacy Formulary & Stock Management
- **Catalog Management:** Tracks brand name, generic name, category, batch/lot number, expiration dates, supplier, stock-on-hand, reorder thresholds, and unit prices.
- **Real-Time Stock Alerts:** Automated warnings for low stock levels and formulations expiring within 30 days.
- **Dispensing Integration:** Directly connected to physician prescriptions with automated stock deductions.
- **Inventory Adjustments:** Audited Stock-In / Stock-Out tracking.

### 💳 6. Billing, Invoices & Payments
- **Automated Billing Statements:** Itemized charges for consultations, laboratory panels, medications, and procedures.
- **Discount & Insurance Tracking:** Adjustable percentage discounts and insurance claim status monitoring.
- **Payment Collection:** Support for Credit Card, Debit Card, Cash, Insurance Direct Pay, and Bank Transfers.
- **Itemized Receipts:** Printable payment receipts with clinic header and payment timestamps.

### 👤 7. Patient Health Portal
- **Personalized Access:** View assigned medical profile, digital ID card with QR/Barcode, upcoming appointments, electronic prescriptions, certified lab reports, and billing statements.

---

## 2. Integrated Artificial Intelligence (Google Gemini 3.8 Flash)

All AI capabilities operate through secure server-side proxy routes via the `@google/genai` SDK:

```
[Browser / Client] ──► [Express API Layer / Vercel Serverless (/api/ai/*)] ──► [Google GenAI SDK (gemini-3.8-flash)]
```

| AI Capability | Endpoint | Functional Description |
|---|---|---|
| **AI Clinical Notes (SOAP Scribe)** | `POST /api/ai/clinical-notes` | Transforms raw physician notes, dictations, and vital signs into standard SOAP documentation with suggested ICD-10 diagnostic codes. |
| **AI Patient Medical Summary** | `POST /api/ai/patient-summary` | Synthesizes a patient's historical diagnoses, current medications, allergy alerts, vital sign trends, and recommended action items. |
| **AI Lab Result Assistant** | `POST /api/ai/lab-interpretation` | Evaluates laboratory panels against reference ranges, identifies clinically significant abnormalities, provides potential etiologies, and generates an empathetic patient-friendly explanation. |
| **AI Medication Safety Audit** | `POST /api/ai/medication-safety` | Evaluates proposed prescription drugs against existing medications, chronic conditions, and known allergies for drug-drug interactions, duplicate therapies, and contraindications. |
| **AI Clinical & Ops Assistant** | `POST /api/ai/chat` | Context-aware conversational assistant capable of answering clinical and operational queries based on live clinic data (today's visits, waiting queue, low stock). |

> **Clinical Decision Support Safeguard:** All AI outputs are labeled with mandatory decision support notices: *"This AI output is strictly for clinical and operational reference and does NOT replace professional healthcare judgment, medical diagnosis, or prescribing authority."*

---

## 3. Supabase Backend Integration (PostgreSQL)

Smart Clinic features complete database integration with **Supabase**, providing persistent cloud storage, relational integrity, and Row Level Security (RLS).

### Database Tables Catalog

| Table | Description |
|---|---|
| `public.patients` | Patient demographics, contact info, blood type, allergies, conditions, and vitals history |
| `public.appointments` | Scheduled and waiting room appointments, rooms, queue numbers, and statuses |
| `public.consultations` | Longitudinal SOAP consultation records, diagnoses, and medical certificates |
| `public.prescriptions` | E-prescriptions, medications, dosages, dispensing statuses, and safety audits |
| `public.lab_orders` | Diagnostic pathology tests, specimen lifecycle, certified values, and AI summaries |
| `public.inventory_items` | Pharmacy formulary, batches, expiry dates, supplier details, and reorder levels |
| `public.invoices` | Billing statements, line items, discounts, taxes, and payment transactions |
| `public.audit_logs` | Tamper-evident HIPAA compliance logs tracking all system events |

### Supabase Setup Instructions

1. **Create a Supabase Project:**
   Go to [Supabase](https://supabase.com/) and create a new project.

2. **Execute Database Schema:**
   Open the Supabase **SQL Editor** and run the contents of `/supabase/schema.sql`. This script initializes all tables, UUID extensions, performance indexes, and Row Level Security (RLS) policies.

3. **Configure Environment Keys:**
   In your `.env` or deployment platform, add:
   ```env
   VITE_SUPABASE_URL="https://your-project-id.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-public-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

4. **Batch Sync in App:**
   Open the **Supabase Backend Hub** via the database icon in the clinic top bar and click **"Sync All to Supabase"** to seed all initial data to your cloud tables with a single click.

---

## 4. Vercel Deployment Guide

Smart Clinic is fully optimized for **Vercel** serverless hosting:

### Project Deployment Configuration

- `vercel.json`: Handles SPA routing for React and routes `/api/(.*)` to the serverless function handler.
- `/api/index.ts`: Vercel serverless entry point exporting the unified Express application.
- `buildCommand`: `npm run build`
- `outputDirectory`: `dist`

### Steps to Deploy to Vercel

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Deploy Smart Clinic to Vercel"
   git push origin main
   ```

2. **Import into Vercel:**
   - Log in to your [Vercel Dashboard](https://vercel.com/).
   - Click **Add New Project** and select your GitHub repository.
   - Framework Preset: **Vite** (auto-detected).

3. **Set Environment Variables on Vercel:**
   In the Vercel project settings, configure:
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `VITE_SUPABASE_URL`: Your Supabase Project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (optional for server-side admin operations).

4. **Deploy:**
   Click **Deploy**. Your application will be live at `https://your-app-name.vercel.app` with fully functional serverless APIs and Supabase database connectivity.

---

## 5. Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Motion, Lucide React
- **Backend:** Node.js, Express 4.21, TypeScript execution (`tsx`), Vercel Serverless Functions
- **Database:** Supabase PostgreSQL with Row Level Security (RLS)
- **AI SDK:** `@google/genai` (Gemini 3.8 Flash model)
- **Tooling:** Vite 8, ESLint, TypeScript Compiler (`tsc`)
- **Persistence:** LocalStorage client cache + Supabase cloud sync + Express REST fallback

---

## 6. Getting Started Locally

### Prerequisites
- Node.js (v18.x or later)
- npm (v9.x or later)
- Gemini API Key (from [Google AI Studio](https://aistudio.google.com/))
- Supabase Account (optional for cloud database)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Sergie1234/smart-clinic.git
   cd smart-clinic
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   Provide your `GEMINI_API_KEY` and optional Supabase credentials.

4. **Run in Development Mode:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

5. **Build for Production:**
   ```bash
   npm run build
   npm run start
   ```

---

## 7. Security, Privacy & Compliance

- **Role-Based Access Control (RBAC):** Dynamic role filtering for Doctor, Nurse, Receptionist, Pharmacist, Lab Technician, Patient, and Admin.
- **Tamper-Evident Audit Logging:** Real-time recording of patient profile views, consultation finals, e-prescription generation, lab result releases, and security events.
- **Server-Side API Key Protection:** Zero client exposure of AI keys or database service credentials.
- **Resilient Fallbacks:** Intelligent client caching ensures clinical workflows remain 100% operational even during transient offline or network latency periods.

---

## 8. Project Management Attribution

This system was directed and project managed by:

**Mr. Lloyd Christopher F. Dacles**  
*Master in Information Systems (MIS)*  
*Certified Cyber Incident Planner (CCIP)*  
*Certified Lean Six Sigma Black Belt (CLYSSB)*  
*Certified Information Technology Service Management Professional (CITSMP)*  
*Database Management Professional (DBMP)*  
*Certified Public Auditing Associate (CPAA)*  
*Information Technology Project Officer (ITPO)*  
*Certified Data Science Associate (CDSA)*  

---

## 9. License

This project is licensed under the Apache-2.0 License. See the [LICENSE](LICENSE) file for details.
