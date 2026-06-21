# PS-CRM — AI-Powered Smart Public Service CRM

Government-grade SaaS platform for citizen grievance management.

## Monorepo Structure

```
ps-crm/
├── backend/          # Node.js + Express + TypeScript + MongoDB Atlas
└── frontend/         # Vite + React + TypeScript + Tailwind + Framer Motion
```

## Quick Start

### 1. Configure Environment

```bash
cp backend/.env.example backend/.env
# Fill in MONGODB_URI, JWT_SECRET, GEMINI_API_KEY
```

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Mongoose, Socket.IO, JWT
- **Database**: MongoDB Atlas (Change Streams for real-time)
- **AI**: Gemini 1.5 Flash (category, priority, SLA risk, summaries)
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Framer Motion, Leaflet, Recharts

## Roles

| Role    | Access                                      |
|---------|---------------------------------------------|
| Citizen | Submit/track complaints, feedback, reopen   |
| Officer | Manage assigned tasks, upload proof, SLA    |
| Admin   | Full command center, analytics, config      |
