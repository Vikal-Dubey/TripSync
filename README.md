# TripSync: Real-Time Collaborative Group Trip Planner

A modern, full-stack collaborative group trip planning application built with the **PERN stack** (PostgreSQL, Express, React, Node.js). TripSync helps groups organize itineraries, split expenses dynamically, vote on activities, and communicate in real-time.

---

## 🚀 Project Overview

TripSync is designed to solve the friction of organizing group trips. The app provides a central workspace for:
- **Collaborative Itinerary Planning**: Real-time activity scheduling and day-by-day organization.
- **Dynamic Expense Ledger**: Expense tracking with custom splits and a debt-minimizing settlement algorithm.
- **Real-Time Synchronization**: Group chat, live activity editing, and voting polls.
- **Integrated Video Calls**: Seamless WebRTC mesh-based video communication for planning calls.
- **Smart Recommendations**: LLM-powered itinerary generation and trip recommendations.

---

## 🛠️ Tech Stack & Architecture Decisions

| Layer | Technology | Rationale & Trade-offs |
| :--- | :--- | :--- |
| **Frontend** | **React (Vite)** + **Zustand** | Zustand provides lightweight, boilerplate-free state management ideal for collaborative syncing. Vite ensures ultra-fast developer loops. |
| **Backend** | **Node.js** + **Express** | Fast, flexible, and standard backend routing skeleton with robust middlewares. |
| **Database** | **PostgreSQL** | Essential for complex relational data (users $\leftrightarrow$ trips $\leftrightarrow$ expenses $\leftrightarrow$ splits). Protects data integrity with real foreign keys. |
| **ORM** | **Prisma** | Provides type-safe database access, auto-completion, and intuitive, migration-first database workflows. |
| **Realtime** | **Socket.io** | Low-latency bi-directional event syncing for collaborative components (chat, itinerary patches, live voting). |
| **Video** | **WebRTC (mesh via Simple-Peer)**| Peer-to-peer visual communication perfect for small groups (4–6 people) without heavy server infrastructure. |
| **Cache & Pub/Sub** | **Redis** | Scales Socket.io horizontally to multiple instances and caches session data. |
| **Auth** | **JWT** + **bcrypt** | Secure, stateless authentication with hashed passwords. |
| **AI Layer** | **OpenAI / Claude API** | Server-side LLM calls to safely generate structured itineraries and summarize group chats. |

### Why PostgreSQL over MongoDB?
The expense ledger is fundamentally relational (users, trips, expenses, and splits must stay in perfect sync). Normalizing tables in PostgreSQL prevents data duplication and anomalies. Additionally, implementing debt settlement algorithms is much cleaner with structured SQL joins than with schema-less nested documents, which would require complex database aggregate pipelines.

---

## 📊 Database Schema (Prisma)

Below is the database entity-relationship schema implemented in Prisma:

```mermaid
erDiagram
    USER ||--o{ TRIP_MEMBER : "tripMemberships"
    USER ||--o{ EXPENSE : "expensesPaid"
    USER ||--o{ EXPENSE_SPLIT : "splits"
    USER ||--o{ CHAT_MESSAGE : "messages"
    
    TRIP ||--o{ TRIP_MEMBER : "members"
    TRIP ||--o{ ITINERARY_DAY : "days"
    TRIP ||--o{ EXPENSE : "expenses"
    TRIP ||--o{ VOTE : "votes"
    TRIP ||--o{ CHAT_MESSAGE : "messages"
    TRIP ||--o{ PACKING_ITEM : "packingItems"
    TRIP ||--o{ BOOKING : "bookings"

    TRIP_MEMBER {
        string id PK
        string tripId FK
        string userId FK
        Role role
        datetime joinedAt
    }

    USER {
        string id PK
        string name
        string email
        string passwordHash
        datetime createdAt
    }

    TRIP {
        string id PK
        string name
        string destination
        datetime startDate
        datetime endDate
        decimal budget
        string inviteToken
        datetime tokenExpiresAt
        datetime createdAt
    }

    ITINERARY_DAY ||--o{ ACTIVITY : "activities"
    ITINERARY_DAY {
        string id PK
        string tripId FK
        int dayNumber
        datetime date
    }

    ACTIVITY {
        string id PK
        string dayId FK
        string title
        string time
        string location
        string notes
        string addedById
        datetime createdAt
    }

    EXPENSE ||--o{ EXPENSE_SPLIT : "splits"
    EXPENSE {
        string id PK
        string tripId FK
        string paidById FK
        decimal amount
        string category
        string description
        datetime createdAt
    }

    EXPENSE_SPLIT {
        string id PK
        string expenseId FK
        string userId FK
        decimal amount
    }

    VOTE {
        string id PK
        string tripId FK
        string question
        json options
        json votes
        datetime createdAt
    }

    CHAT_MESSAGE {
        string id PK
        string tripId FK
        string userId FK
        string content
        datetime createdAt
    }

    PACKING_ITEM {
        string id PK
        string tripId FK
        string name
        string checkedBy
    }

    BOOKING {
        string id PK
        string tripId FK
        string type
        json details
        datetime createdAt
    }
```

---

## 🗺️ Roadmap & Build Progress

- [x] **Phase 0: Setup & Skeleton** (Completed)
  - [x] Monorepo/two-folder folder structure (`frontend/` and `backend/`).
  - [x] Database configuration with Postgres & Redis (local via Docker Compose).
  - [x] Prisma configuration, schema definition, and initial migration run.
  - [x] Express backend skeleton with a functioning `/health` check route.
  - [x] React + Vite frontend skeleton connected to the backend health-check endpoint.
- [ ] **Phase 1: Auth & Trip Core** (Pending)
  - [ ] JWT authentication (signup, login, route protection).
  - [ ] Trip CRUD (create trip, view, update settings).
  - [ ] Invite-link join flow (token-based invites with expiry).
  - [ ] Role-based access control (Organizer vs. Participant).
- [ ] **Phase 2: Itinerary, Packing List, & Bookings** (Pending)
  - [ ] ItineraryDay & Activity CRUD.
  - [ ] Shared packing checklist (interactive checks/unchecks).
  - [ ] Booking storage (flights, hotels, transport details).
- [ ] **Phase 3: Realtime Layer** (Pending)
  - [ ] Socket.io integration with room isolation (`socket.join(tripId)`).
  - [ ] Live itinerary synchronization.
  - [ ] Live voting system and group chat.
  - [ ] Redis adapter integration for horizontal scaling.
- [ ] **Phase 4: Expense Ledger & Debt Settle-up** (Pending)
  - [ ] Expense creation and user splits.
  - [ ] Net balance calculations.
  - [ ] Debt minimization settlement algorithm.
  - [ ] Real-time updates over Socket.io.
- [ ] **Phase 5: LLM Integration** (Pending)
  - [ ] AI itinerary draft generator.
  - [ ] Chat message summarization tool.
  - [ ] Destination Q&A recommendations chatbot.
- [ ] **Phase 6: WebRTC Video Calling** (Pending)
  - [ ] WebRTC peer connections using Simple-Peer over Socket.io signaling.
  - [ ] Split-view itinerary and planning interface alongside video feeds.
- [ ] **Phase 7: Stretch Features** (Pending)
  - [ ] Currency conversion utilities.
  - [ ] Weather forecast warnings for itinerary days.
- [ ] **Phase 8: Polish & Deployment** (Pending)
  - [ ] Production deployment.
  - [ ] Seed data scripts for interviews/demos.

---

## ⚙️ Phase 0 Verification & Checkpoint

The project currently has **Phase 0** fully implemented. This is verified by starting both components and checking their communication:
1. The **Backend** initializes the database client, starts a server on Port `4000` (or custom `PORT`), binds Socket.io, and exposes a `/health` endpoint.
2. The **Frontend** boots on Port `5173` (Vite) and polls the backend `/health` endpoint.
3. The page renders: **"Server status: ok"** to verify CORS and server-client communication are functioning correctly.

---

## 🛠️ Local Installation & Setup

Follow these steps to run the Phase 0 skeleton locally:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) (for Postgres and Redis)

### Step 1: Clone & Configure Services
1. Start PostgreSQL and Redis containers:
   ```bash
   cd backend
   docker compose up -d
   ```
2. Copy environment files in both folders and adjust parameters if needed:
   - For backend: `cp .env.example .env` (contains the PostgreSQL link `postgresql://tripsync:tripsync@localhost:5432/tripsync` matching docker settings).
   - For frontend: `cp .env.example .env` (contains `VITE_API_URL=http://localhost:4000`).

### Step 2: Set up the Backend
1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
   The backend will be running at `http://localhost:4000`, and you should see `TripSync server listening on http://localhost:4000`.

### Step 3: Set up the Frontend
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser. You should see the **TripSync** title and **Server status: ok**.
