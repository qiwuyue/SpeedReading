[README.md](https://github.com/user-attachments/files/26916782/README.md)
# SpeedReading App

A progressive web application that trains users to read faster while maintaining comprehension. Upload any PDF, set your target WPM, and let the reading engine guide your eyes — then test how much you retained.

---

## Features

- **Speed Reading Engine** — client-side WPM timer with focal highlighting and a moving-dot guide mode, runs fully offline once text is loaded
- **PDF Upload & AI Cleaning** — server-side extraction via `pdf-parse` with GPT-4o-mini cleanup for OCR artifacts and malformed text
- **Comprehension Checks** — AI-generated multiple-choice and short-answer questions after each session, cached per document
- **Progress Dashboard** — WPM-over-time charts and session history for registered users (Recharts)
- **Guest Mode** — no account required; documents are processed in memory and discarded after the session
- **PWA Support** — installable on mobile, works offline for cached content

---

## Tech Stack

| Layer        | Technology                                        |
| ------------ | ------------------------------------------------- |
| Frontend     | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| State        | Zustand                                           |
| PWA          | next-pwa (Workbox)                                |
| Backend      | Node.js + Express, TypeScript                     |
| Database     | PostgreSQL via Supabase, Prisma ORM               |
| Auth         | Supabase Auth (email/password + OAuth + guest)    |
| File Storage | Supabase Storage                                  |
| AI           | OpenAI GPT-4o-mini                                |
| PDF Parsing  | pdf-parse (pdfjs-dist)                            |
| Charts       | Recharts                                          |
| Testing      | Vitest + Playwright                               |
| Deployment   | Vercel (frontend), Railway/Render (backend)       |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (database, auth, storage)
- An OpenAI API key

### Installation

```bash
git clone https://github.com/your-org/speedreading-app.git
cd speedreading-app
npm install
```

### Environment Variables

Create a `.env.local` in the frontend root and a `.env` in the backend root:

```env
# Shared
DATABASE_URL=your_supabase_postgres_url

# Backend
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key

# Frontend
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Run Locally

```bash
# Backend
cd backend
npm run dev        # starts Express on port 4000

# Frontend (separate terminal)
cd frontend
npm run dev        # starts Next.js on port 3000
```

### Database Setup

```bash
cd backend
npx prisma migrate dev
```

---

## Architecture Overview

```
[Next.js PWA Frontend]
        │ HTTPS REST
[Node.js / Express API]
   ├── Auth Controller (Supabase JWT validation)
   ├── PDF Processing Pipeline (pdf-parse → AI cleaning)
   ├── Comprehension Generator (OpenAI)
   └── Reading Session Manager
        │ Prisma ORM
[PostgreSQL / Supabase]        [Supabase Storage]
                                  (PDF files)
```

The reading engine runs entirely client-side — no network calls during an active session. PDF extraction and AI cleaning happen server-side before text reaches the browser.

---

## User Roles

| Role       | Can Upload         | Sessions Saved | Dashboard                     |
| ---------- | ------------------ | -------------- | ----------------------------- |
| Guest      | ✓ (in-memory only) | ✗              | ✗                             |
| Registered | ✓ (persistent)     | ✓              | ✓                             |
| Admin      | ✓                  | ✓              | ✓ + sample content management |

Guest data is purged nightly via a scheduled cleanup job.

---

## Team

Luis Gonzalez · Husnain Khaliq · Bi Rong Liu · Yuefeng Xiao

CISC 3171 — Introduction to Software Engineering, Spring 2026  
Brooklyn College · Instructor: Alec Malstrom
