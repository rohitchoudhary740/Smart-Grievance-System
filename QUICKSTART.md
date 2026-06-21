# PS-CRM — Quick Start Guide

## Prerequisites
- Node.js 18+
- A MongoDB Atlas cluster (free tier works fine)
- A Gemini API key (free at aistudio.google.com)

---

## 1. Configure backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/pscrm?retryWrites=true&w=majority
JWT_SECRET=any-long-random-string-at-least-32-chars
GEMINI_API_KEY=your-gemini-api-key
FRONTEND_URL=http://localhost:5173
```

## 2. Start backend

```bash
cd backend
npm install
npm run dev
```

On first boot the server will:
- Connect to Atlas
- Auto-seed `demo-city` tenant, 5 departments, and demo users
- Start Socket.IO and Change Streams
- Start SLA cron (every 5 min by default)

Check: `http://localhost:5000/api/health`

## 3. Start frontend

```bash
cd frontend
npm install
npm run dev
```

Visit: `http://localhost:5173`

---

## Demo Credentials

All use tenant slug: `demo-city`

| Role    | Email                       | Password    |
|---------|-----------------------------|-------------|
| Admin   | admin@demo-city.gov         | admin123    |
| Officer | officer@demo-city.gov       | officer123  |
| Officer | officer2@demo-city.gov      | officer123  |
| Dept Head | head@demo-city.gov        | officer123  |
| Citizen | citizen@demo-city.gov       | citizen123  |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | Public | Register citizen |
| POST | /api/auth/login | Public | Login any role |
| GET | /api/auth/me | JWT | Current user |
| POST | /api/citizen/grievances | Citizen | Submit complaint |
| GET | /api/citizen/grievances | Citizen | My complaints |
| GET | /api/citizen/grievances/:id | Citizen | Detail + AI metadata |
| GET | /api/citizen/grievances/:id/timeline | Citizen | Audit trail |
| POST | /api/citizen/grievances/:id/feedback | Citizen | Rate resolution |
| POST | /api/citizen/grievances/:id/reopen | Citizen | Reopen case |
| GET | /api/officer/grievances | Officer | Assigned tasks |
| PATCH | /api/officer/grievances/:id/status | Officer | Accept/start/resolve |
| POST | /api/officer/grievances/:id/proof | Officer | Upload proof photos |
| GET | /api/officer/performance | Officer | My stats |
| GET | /api/admin/grievances | Admin | All with filters |
| PATCH | /api/admin/grievances/:id/assign | Admin | Reassign officer |
| GET | /api/admin/analytics | Admin | Aggregated analytics |
| GET | /api/admin/critical-zones | Admin | Active alert zones |
| GET | /api/admin/departments | Admin | All departments |
| POST | /api/admin/departments | Admin | Create department |
| GET | /api/admin/users | Admin | All users |
| PATCH | /api/admin/users/:id/role | Admin | Promote/demote |
| GET | /api/admin/audit-logs | Admin | Append-only log |
| GET | /api/admin/export | Admin | CSV export |
| GET | /api/health | Public | Health + DB state |

---

## Architecture

```
ps-crm/
├── backend/
│   └── src/
│       ├── config/         # env + validation
│       ├── models/         # Mongoose schemas (6 models)
│       ├── services/       # business logic layer
│       │   ├── aiService.ts        # Gemini 1.5 Flash
│       │   ├── assignmentService.ts # workload-balanced auto-assign
│       │   ├── grievanceService.ts  # all grievance ops + analytics
│       │   ├── slaService.ts        # cron: breach + escalation + zones
│       │   ├── changeStreamService.ts # Atlas Change Streams → Socket.IO
│       │   └── ...
│       ├── controllers/    # thin HTTP handlers
│       ├── routes/         # Express routers with middleware
│       ├── middlewares/    # auth, tenant, role, validate, upload
│       └── utils/          # logger, respond helpers
└── frontend/
    └── src/
        ├── components/     # ui/, shared/ (map, timeline, SLA timer, alerts)
        ├── hooks/          # useGrievances, useSocket, useAnalytics
        ├── pages/          # citizen/, officer/, admin/
        ├── services/       # typed API clients + socket singleton
        ├── context/        # Zustand auth store
        ├── types/          # shared enums + interfaces
        └── utils/          # formatters, status colours, helpers
```

## Real-time Flow

```
Citizen submits → Backend creates → Gemini classifies → Auto-assign officer
                                  ↓
                            Change Stream fires
                                  ↓
                       Socket.IO → all admin rooms
                                  ↓
                       Dashboard updates instantly
```

## Deployment

**Backend (Render / Railway / Fly.io):**
```bash
npm run build
node dist/server.js
```

**Frontend (Vercel / Netlify):**
```bash
npm run build
# Deploy dist/ folder
# Set VITE_API_URL=https://your-backend.com/api
```

Set `FRONTEND_URL` in backend env to your Vercel/Netlify URL.
