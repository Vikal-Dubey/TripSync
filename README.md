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
│   │   ├── lib/              # Helpers, weather & algorithms (jwt.js, llm.js, prisma.js, settleUp.js, weather.js)
│   │   ├── middleware/       # Express middlewares (auth, member, organizer checks)
│   │   ├── routes/           # REST endpoints (ai, auth, bookings, chat, expenses, itinerary, packing, trips, votes, weather)
│   │   └── index.js          # App entry point, socket handlers & Redis pub/sub config
│   ├── .env.example          # Template environment configurations
│   ├── docker-compose.yml    # Docker configuration for Postgres & Redis
│   └── package.json          # Server package and dev dependencies
└── frontend/                 # Vite + React Single Page App Frontend
    ├── src/                  # Frontend Application Source Code
    ├── api/              # Axios/Fetch HTTP client API handlers
    │   ├── ai.js         # AI recommendations & optimization API client
    │   ├── auth.js       # Authentication requests
    │   ├── bookings.js   # Bookings CRUD API client
    │   ├── chat.js       # Chat messages API client
    │   ├── client.js     # Shared client settings (headers, base URLs)
    │   ├── expenses.js   # Expense ledger and balances API client
    │   ├── itinerary.js  # Days & Activities API client
    │   ├── packing.js    # Packing checklist API client
    │   ├── trips.js      # Trips settings & info API client
    │   ├── votes.js      # Voting/Polls API client
    │   └── weather.js    # Weather forecast API client
    ├── components/       # Shared UI components (Navbar, ProtectedRoute, VideoCall, CurrencyConverter)
    ├── lib/              # Frontend utilities and connections
    │   └── socket.js     # Socket.io client instance initialization
    ├── pages/            # View components (Dashboard, Login, Signup, Trip, JoinTrip)
    ├── store/            # Lightweight global state stores (Zustand)
    ├── App.jsx           # App shell and routing structure
    └── main.jsx          # DOM rendering and entry configuration
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
- [x] **Phase 3: Realtime Layer** (Completed)
  - [x] Socket.io integration with JWT handshake authentication & room isolation (`socket.join(tripId)`).
  - [x] Live itinerary synchronization (instant updates on days and activities changes).
  - [x] Live voting system (create polls via REST, cast votes via socket room events, update counts live).
  - [x] Live group chat (messages relayed in real time and persisted in Postgres).
  - [x] Socket connectivity state indicator in UI.
- [x] **Phase 4: Expense Ledger & Debt Settle-up** (Completed)
  - [x] Expense creation and user splits (supports equal split calculation or customized amount split).
  - [x] Net balance calculations for each user based on their shares and payments.
  - [x] Debt minimization settlement algorithm using a greedy largest-creditor-vs-largest-debtor matching logic.
  - [x] Real-time updates over Socket.io (`expense:added`, `expense:deleted`, `balances:updated`).
- [x] **Phase 5: LLM Integration** (Completed)
  - [x] AI itinerary draft generator (supports appending or replacing existing activities).
  - [x] Chat message summarization tool (condenses chat log records into concrete decisions reached).
  - [x] Destination Q&A recommendations chatbot (scoped traveling adviser assistant).
  - [x] Route order optimization adviser (arranges activity sequence to reduce backtracking).
- [x] **Phase 6: WebRTC Video Calling** (Completed)
  - [x] WebRTC peer connections using Simple-Peer over Socket.io signaling.
  - [x] Multi-user mesh peer call lifecycle management (calls join/signal relay/leave).
  - [x] Split-view UI showing client webcam, peer tiles, audio/video toggles, and itinerary/budget interfaces side-by-side.
- [x] **Phase 7: Stretch Features** (Completed)
  - [x] Currency conversion utility (uses Frankfurter API for real-time exchange rates).
  - [x] Weather-aware forecast banners on itinerary days (uses Open-Meteo geocoding and weather API to warn on rain probability and max/min temperatures).
- [x] **Phase 8: Polish & Deployment** (Completed)
  - [x] Overhauled UI with modern Coastal & Outdoor Explorer design system (Navbar, login, signup, workspace dashboards, TIMELINES, and WebRTC grid).
  - [x] Implemented database cascading deletes, optimistic UI day renames, contiguous sequential index shifting, and trip capacity validations.
  - [x] Verified backend start sequences and production-readiness compilations.

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

### Phase 3 Checkpoint (Realtime Layer)
Phase 3 adds bi-directional WebSocket syncing to ensure the UI stays synchronized across multiple devices without manual refreshing.

#### 1. Socket Authentication & Room Security
* The Socket.io connection uses a handshake authorization check where it verifies the JWT token using `verifyToken` on connection.
* Sockets must explicitly join a trip room via the `trip:join` socket event. The backend validates database membership before joining (`socket.join(tripId)`), ensuring isolation between different trips.

#### 2. Real-Time Sync Strategy
* **Hybrid REST/Socket Operations**:
  * Creation, updates, and deletions for itinerary days, activities, bookings, and packing checklist items occur over REST APIs.
  * Upon successful database writes, the backend triggers broadcasts via `req.app.get("io").to(tripId).emit(...)` to immediately push patches to other users.
* **Pure Socket Events**:
  * **Group Chat**: Sending message events (`chat:send`) happens directly via websockets. The server records the message in the database and broadcasts the new message payload via the `chat:new` event.
  * **Live Voting**: Casting votes (`vote:cast`) updates the database JSON column for the poll's vote log, and instantly publishes the updated vote structure via `vote:updated` to render progress bars live.
* **State indicator**:
  * A socket connection dot is displayed in [`TripPage.jsx`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/pages/TripPage.jsx) header which changes color based on `connected` status.

### Phase 4 Checkpoint (Expense Ledger & Debt Settle-up)
Phase 4 adds expense splitting capabilities and a transaction-minimization settle-up engine, allowing group trip members to keep track of spending and resolve debts simply.

#### 1. Backend REST Endpoints
* **Expense Routes (`/api/trips/:tripId/expenses`)** (mapped in [`expenses.js`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/backend/src/routes/expenses.js)):
  * `GET /`: Lists all expenses registered for the trip, including paidBy information and user split ratios.
  * `GET /balances`: Computes the net balance for each user (total paid minus total owed) and runs the transaction-minimization engine to return a list of recommended settlements.
  * `POST /`: Registers a new expense. Computes splits evenly by default, or accepts custom amounts (verifying that they add up to the total). Emits `expense:added` and `balances:updated` via Socket.io.
  * `DELETE /:expenseId`: Deletes an expense and its associated splits. Emits `expense:deleted` and `balances:updated` via Socket.io.

#### 2. Debt Settlement Engine
* Handled in [`settleUp.js`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/backend/src/lib/settleUp.js) using a greedy largest-creditor-vs-largest-debtor matching logic.
* While the general minimum-transaction problem is NP-hard (subset-sum variant), this heuristic runs in $O(N \log N)$ time (due to sorting) and produces minimal settlements that cover all outstanding balances efficiently.

#### 3. Frontend Workspace UI & API Clients
* **API Handler**:
  * [`expenses.js`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/api/expenses.js): Handles REST calls for adding, listing, deleting expenses, and fetching settlements.
* **UI Features in [`TripPage.jsx`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/pages/TripPage.jsx)**:
  * **Expenses Workspace**: Display panel lists recent expenses with details on who paid, description, amount, and category.
  * **Interactive Settle-up Panel**: Displays net user balances (positive/green for creditors, negative/red for debtors) alongside a list of direct, optimized payments (e.g. *"Bob owes Alice $50.00"*).
  * **Socket Updates**: Balances and settlement views update instantly in response to real-time events (`expense:added`, `expense:deleted`, `balances:updated`).

### Phase 5 Checkpoint (LLM Integration)
Phase 5 integrates AI capabilities by communicating server-side with the Gemini API to safeguard developer credentials.

#### 1. Backend REST Endpoints
All AI operations are nested under the trip router (`/api/trips/:tripId/ai`) and mapped in [`ai.js`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/backend/src/routes/ai.js):
* `POST /generate-itinerary`: Accepts a text prompt and modes (`fill` or `replace`). Calls the Gemini model using a predefined JSON schema structure to build daily activity list arrays. Reordered and created days are pushed via Socket.io `day:added` broadcasts.
* `POST /summarize-chat`: Scopes the last 200 messages in the trip chat and queries the LLM to output a concise bulleted decision summary (rendered to users in the Chat Panel).
* `POST /recommendations`: Scopes chatbot queries scope-restricted to destination travel tips.
* `POST /optimize-route/:dayId`: Takes activity title and location fields for a day and arranges their visiting order geographically to minimize backtracking.

#### 2. Gemini Connection Wrapper
* Handled in [`llm.js`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/backend/src/lib/llm.js) using Google's `gemini-3.6-flash` model.
* Uses native `responseSchema` parameters inside structural generation queries to ensure strict output compliance without markdown backticks parsing issues.
* Configures `thinkingLevel: "minimal"` to ensure low-latency JSON returns that fit inside standard quota limits.

#### 3. Frontend Workspace UI & API Clients
* **API Handler**:
  * [`ai.js`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/api/ai.js): Client request functions mapping all AI queries.
* **UI Features in [`TripPage.jsx`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/pages/TripPage.jsx)**:
  * **Draft Generator**: Input text area where planners describe their dream trip, select whether to append or replace, and generate day activities that instantly render onto the timeline.
  * **Chat Decisions Card**: Decoded decisions from the chat list display inside the Group Chat sidebar.
  * **Travel Guide Dialog**: Side-panel recommendation dialogue where users can ask custom travel Q&A.

### Phase 6 Checkpoint (WebRTC Video Calling)
Phase 6 adds real-time video conferencing to the trip dashboard workspace, allowing group trip planners to conduct voice/video calls inside the app.

#### 1. Signaling Server Events
* **Call Membership Check**: When joining a call (`call:join`), the backend verifies the user is a member of the trip room and checks active calls in a server-side map. Returns `existingPeers` in the call.
* **Signaling Relay**: Peer targets use the `webrtc:signal` socket event to relay WebRTC SDP offers/answers and ICE candidate payloads directly to each other via target socket routing (`io.to(to).emit`).
* **Connection Lifecycle**: Broadcasts `call:peer-joined` when a client connects, and `call:peer-left` when a client triggers `call:leave` or disconnects from the socket.

#### 2. Decentralized Peer-to-Peer Mesh
* Built client-side using `simple-peer` to connect users in a full mesh network.
* Allows participants to stream high-quality audio and video directly to one another without using an external media server, which is cost-effective and low-latency for groups of up to 6 people.

#### 3. Frontend UI Panel & Controls
* Handled by the [`VideoCall.jsx`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/components/VideoCall.jsx) component, integrated within [`TripPage.jsx`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/pages/TripPage.jsx):
  * **Planning Call Toggle**: User triggers "📹 Join planning call" to open the local camera feed and begin connecting to other call members.
  * **Video Call Grid Layout**: Local and peer feeds display in a grid with custom label overlays showing participant names.
  * **Conferencing Actions**: Bottom control buttons let users mute/unmute audio tracks, turn camera feeds on/off, or hang up and leave the call.

### Phase 7 Checkpoint (Stretch Features)
Phase 7 introduces helper conversion utilities and automated weather conditions integration to help travelers prepare better.

#### 1. Currency Exchange Converter
* Uses Frankfurter's public API endpoints (`https://api.frankfurter.dev/v2/rate`) to dynamically query currency conversion factors.
* Instantiated frontend-side inside [`CurrencyConverter.jsx`](file:///c:/Users/sushi/OneDrive/Desktop/My Project/TripSync/frontend/src/components/CurrencyConverter.jsx) to calculate values between INR, USD, EUR, etc. on input changes. Uses `AbortController` to handle input rate-limiting.

#### 2. Weather-Aware Forecasting Banners
* Backend fetches destination coordinates via Open-Meteo geocoding search APIs.
* Daily parameters (`precipitation_probability_max`, `temperature_2m_max`, and `temperature_2m_min`) are retrieved for the exact duration of the trip.
* Maps returned daily items to specific trip `dayNumber` values to display weather state headers directly inside each Itinerary Day timeline card (shows rain warnings "🌧️" for probability values $\ge 50\%$).

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
