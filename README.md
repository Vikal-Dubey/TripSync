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

## 📂 Folder Structure

The project is structured as a monorepo containing the Express API `backend` and Vite-React `frontend` directories:

```text
TripSync/
├── backend/                  # Node.js + Express API Backend
│   ├── prisma/               # Prisma Database Schemas & Migrations
│   │   ├── migrations/       # Database SQL migration scripts
│   │   └── schema.prisma     # Relational database models definition
│   ├── src/                  # Backend Application Source Code
│   │   ├── generated/        # Auto-generated Prisma Client
│   │   ├── lib/              # Client loaders & helpers (jwt.js, prisma.js)
│   │   ├── middleware/       # Express middlewares (auth, member, organizer checks)
│   │   ├── routes/           # REST endpoints (auth, bookings, itinerary, packing, trips)
│   │   └── index.js          # App entry point & HTTP / Socket server config
│   ├── .env.example          # Template environment configurations
│   ├── docker-compose.yml    # Docker configuration for Postgres & Redis
│   └── package.json          # Server package and dev dependencies
└── frontend/                 # Vite + React Single Page App Frontend
    ├── src/                  # Frontend Application Source Code
    │   ├── api/              # Axios/Fetch HTTP client API handlers
    │   │   ├── auth.js       # Authentication requests
    │   │   ├── bookings.js   # Bookings CRUD API client
    │   │   ├── client.js     # Shared client settings (headers, base URLs)
    │   │   ├── itinerary.js  # Days & Activities API client
    │   │   ├── packing.js    # Packing checklist API client
    │   │   └── trips.js      # Trips settings & info API client
    │   ├── components/       # Shared interface components (Navbar, ProtectedRoute)
    │   ├── pages/            # View components (Dashboard, Login, Signup, Trip, JoinTrip)
    │   ├── store/            # Lightweight global state stores (Zustand)
    │   ├── App.jsx           # App shell and routing structure
    │   └── main.jsx          # DOM rendering and entry configuration
    ├── .env.example          # Template client-side environment configurations
    └── package.json          # Client dependencies & scripts configuration
```

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
- [x] **Phase 1: Auth & Trip Core** (Completed)
  - [x] JWT authentication (signup, login, and route protection via `requireAuth` middleware).
  - [x] Trip CRUD (create trip, get user's trips, get trip details, update trip settings, and delete trip).
  - [x] Invite-link join flow (token-based invites with expiry validation).
  - [x] Role-based access control (`requireMember` and `requireOrganizer` middlewares).
- [x] **Phase 2: Itinerary, Packing List, & Bookings** (Completed)
  - [x] ItineraryDay & Activity CRUD (add days, add/remove day activities).
  - [x] Shared packing checklist (interactive list check/uncheck status tracking).
  - [x] Booking storage (store confirmation number, details, URL link for flights/hotels/trains).
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

## ⚙️ Checkpoints & Verification

### Phase 0 Checkpoint
1. The **Backend** initializes the database client, starts a server on Port `4000` (or custom `PORT`), binds Socket.io, and exposes a `/health` endpoint.
2. The **Frontend** boots on Port `5173` (Vite) and polls the backend `/health` endpoint.
3. The page renders: **"Server status: ok"** to verify CORS and server-client communication are functioning correctly.

### Phase 1 Checkpoint (Auth & Trip Core)
With Phase 1 complete, users can sign up, log in, create trips, invite members, and access secure pages.

#### 1. Backend REST Endpoints
* **Auth Routes (`/api/auth`)**:
  * `POST /signup`: Registers a new user, hashes password via `bcrypt`, generates a JWT, and returns the token and user details.
  * `POST /login`: Validates user credentials and returns a JWT token.
* **Trip Routes (`/api/trips`)**:
  * `POST /`: Creates a new trip. The creator is automatically added as the `ORGANIZER` member.
  * `GET /`: Lists all trips that the authenticated user is a member of.
  * `GET /:tripId`: Retrieves details for a specific trip (accessible to members only).
  * `PATCH /:tripId`: Updates trip details (accessible to organizers only).
  * `DELETE /:tripId`: Deletes a trip (accessible to organizers only).
  * `POST /join/:inviteToken`: Joins a trip via its unique invite token (checks token expiry before adding user as `PARTICIPANT`).

#### 2. Express Middlewares
* [`auth.js`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/backend/src/middleware/auth.js) (`requireAuth`): Extracts the JWT token from the `Authorization` header (`Bearer <token>`) and verifies it.
* [`requireMember.js`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/backend/src/middleware/requireMember.js): Verifies that the authenticated user belongs to the requested trip.
* [`requireOrganizer.js`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/backend/src/middleware/requireOrganizer.js): Verifies that the authenticated user is the organizer of the requested trip.

#### 3. Frontend Pages & Store
* State management is powered by Zustand ([`authStore.js`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/store/authStore.js)) to manage user sessions and tokens in `localStorage`.
* **Pages**:
  * `/signup` ([`SignupPage.jsx`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/pages/SignupPage.jsx)): Multi-field registration form.
  * `/login` ([`LoginPage.jsx`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/pages/LoginPage.jsx)): Secure credentials validation form.
  * `/` ([`DashboardPage.jsx`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/pages/DashboardPage.jsx)): Lists trips user belongs to, allows creating a new trip, and links to details. Protected route.
  * `/trips/:tripId` ([`TripPage.jsx`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/pages/TripPage.jsx)): Main trip workspace containing trip info, member list, and settings panel. Protected route.
  * `/join/:inviteToken` ([`JoinTripPage.jsx`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/pages/JoinTripPage.jsx)): Handles instant join-trip actions using invite tokens.

### Phase 2 Checkpoint (Itinerary, Packing List, & Bookings)
In Phase 2, core trip workspace features have been implemented, including the backend REST endpoints and the corresponding UI components in the main workspace view.

#### 1. Backend REST Endpoints
All new sub-routes are nested under the trip router (`/api/trips/:tripId`) and secured by both the authentication and member middleware (`requireAuth` and `requireMember`):
* **Itinerary Routes (`/api/trips/:tripId/days`)** (mapped in [`itinerary.js`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/backend/src/routes/itinerary.js)):
  * `GET /`: Lists all itinerary days and activities for the specified trip, ordered by day number.
  * `POST /`: Creates a new itinerary day.
  * `DELETE /:dayId`: Deletes an itinerary day and all activities assigned to it.
  * `POST /:dayId/activities`: Adds a new activity (title, time, location, notes) to a day.
  * `PATCH /:dayId/activities/:activityId`: Modifies details of a specific activity.
  * `DELETE /:dayId/activities/:activityId`: Removes an activity from a day.
* **Packing Routes (`/api/trips/:tripId/packing`)** (mapped in [`packing.js`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/backend/src/routes/packing.js)):
  * `GET /`: Lists all shared packing items for the trip.
  * `POST /`: Adds a new item to the packing list.
  * `PATCH /:itemId`: Toggles the checked status (stores the checking user's ID or sets it to null).
  * `DELETE /:itemId`: Deletes a packing item.
* **Booking Routes (`/api/trips/:tripId/bookings`)** (mapped in [`bookings.js`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/backend/src/routes/bookings.js)):
  * `GET /`: Lists all trip bookings.
  * `POST /`: Adds a new booking with a type (flight, hotel, transport) and JSON details (confirmation #, URL link).
  * `PATCH /:bookingId`: Updates booking details.
  * `DELETE /:bookingId`: Deletes a booking record.

#### 2. Frontend Workspace UI & API Clients
* **API Handlers**:
  * [`itinerary.js`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/api/itinerary.js): Client calls for days and activities.
  * [`packing.js`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/api/packing.js): Client calls for checking items and listing the checklist.
  * [`bookings.js`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/api/bookings.js): Client calls for managing reservation cards.
* **UI Features in [`TripPage.jsx`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/pages/TripPage.jsx)**:
  * **Day-by-Day Itinerary Layout**: Displays itinerary days with a vertical timeline representing individual activities. Users can create days, add activities instantly by pressing Enter, and remove individual activities.
  * **Packing Checklist**: A shared list of packing items that can be dynamically checked or unchecked. Checked items are visually marked with a line-through.
  * **Booking Workspace**: A clean view showcasing booked accommodations, flights, or tickets. Includes type, confirmation details, and outward links.

---

## 🛠️ Local Installation & Setup

Follow these steps to run the application locally:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) (for PostgreSQL and Redis)

### Step 1: Start Services & Configure Environments
1. Start PostgreSQL and Redis containers:
   ```bash
   cd backend
   docker compose up -d
   ```
2. Copy environment files in both folders and adjust parameters if needed:
   * **Backend**: Copy `backend/.env.example` to `backend/.env`
     ```env
     DATABASE_URL="postgresql://tripsync:tripsync@localhost:5432/tripsync?schema=public"
     JWT_SECRET="replace-with-a-long-random-string"
     PORT=4000
     CLIENT_ORIGIN="http://localhost:5173"
     REDIS_URL="redis://localhost:6379"
     ```
   * **Frontend**: Copy `frontend/.env.example` to `frontend/.env`
     ```env
     VITE_API_URL="http://localhost:4000"
     ```

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
   The backend will be running at `http://localhost:4000`.

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
   Open `http://localhost:5173` in your browser. You can register an account, log in, create a trip, copy the invite link, and test member-joining logic!
