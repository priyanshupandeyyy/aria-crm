# Aria CRM — AI-Native Campaign Intelligence for Brew & Co.

## What I Built
An AI-native CRM for a coffee brand that helps marketing managers 
decide who to talk to, what to say, and how to reach them.

The product is built around ARIA (Audience Retention & Intelligence Assistant) — an AI campaign assistant that takes 
a plain-English goal ("re-engage customers who haven't ordered in 45 days") 
and returns a complete campaign plan: audience, channel recommendation 
based on real delivery data, and 3 message variants — then launches it.

## Live Demo
Frontend: [https://aria-crm-frontend.vercel.app](https://aria-crm-frontend.vercel.app)
(Backend on Render free tier — kept awake via cron jobs, so it opens without delay)

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (React)                          │
│  Dashboard | Customers | Segments | Campaigns | AI Assistant    │
└──────────────────────┬──────────────────────────────────────────┘
                       │ REST API calls (Vite Proxy / Vercel)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CRM SERVICE (Node/Express)                   │
│   Deployed on Render: aria-crm-service                          │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │  /customers │  │  /segments   │  │     /campaigns       │    │
│  │  /orders    │  │  /aria       │  │   send / status      │    │
│  └─────────────┘  └──────────────┘  └──────────────────────┘    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              /receipts  (callback endpoint)              │   │
│  │  Receives delivery events from Channel Service           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────┐  ┌───────────────────────────┐     │
│  │        Groq API         │  │       MongoDB Atlas       │     │
│  │ (LLM inference & rules) │  │     (all collections)     │     │
│  └─────────────────────────┘  └───────────────────────────┘     │
└──────────────────────┬──────────────────────────────────────────┘
                       │ POST /api/send (campaign dispatch)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CHANNEL SERVICE (Node/Express)                 │
│   Deployed on Render: aria-channel-service                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  POST /api/send                                         │    │
│  │  - Receives: {msg_id, recipient, channel, message,      │    │
│  │               callback_url}                             │    │
│  │  - Immediately returns 202 Accepted                     │    │
│  │  - Queues async simulation job via setImmediate()       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Simulation Engine (deliveryEngine.js)                  │    │
│  │  - Initial processing delay: 1-3 seconds                │    │
│  │  - 85% Delivered, 15% Failed                            │    │
│  │  - Of Delivered: 35% Opened (after 3-8s delay)          │    │
│  │  - Of Opened: 28% Clicked (after 2-6s delay)            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Retry Mechanism (Custom Recursive Function)            │    │
│  │  - On callback failure: exponential backoff (2s * n)    │    │
│  │  - Max 3 retries, then logs to console (Dead-letter)    │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────────────┘
                       │ POST /api/receipts (callbacks)
                       └──────────────────────────▶ CRM Service
```

## Key Design Decisions

**Two-service architecture**
The CRM and Channel Service are separate because real channel providers 
(Twilio, Gupshup) are external. Separating concerns means the CRM only 
knows what happened to messages, not how they were delivered.

**Async callback pattern**
Delivery is inherently async. The channel service returns 202 immediately 
and calls back into `/api/receipts` as statuses change. This prevents 
blocking HTTP connections and scales to high volume.

**Denormalized customer stats**
`total_spend`, `total_orders`, `last_order_date` are stored on the customer 
document (not computed from orders) for fast segment queries. Tradeoff: 
write complexity. Acceptable because segment reads vastly outnumber 
order writes.

**In-memory retry queue**
Channel service retries failed callbacks up to 3x with exponential backoff. 
Production would use Redis + BullMQ for persistence across restarts.

**Polling over SSE**
Campaign stats poll every 5 seconds. SSE would be more real-time but 
adds connection management complexity. Explicit tradeoff for this scope.

## AI Features
- ARIA Assistant: intent classification → segment building → 
  channel recommendation → message generation in one request
- Natural language segment generation
- AI message drafting (3 variants with tone labels)
- Post-campaign AI analysis
- AI-powered dashboard recommendations

## Stack
- Frontend: React + Vite + Tailwind + Recharts
- CRM Service: Node.js + Express + MongoDB + Groq (llama-3.3-70b)
- Channel Service: Node.js + Express (stubbed delivery simulation)
- Database: MongoDB Atlas
- Deployed: Vercel (frontend) + Render (services)

## Running Locally

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Groq API Key

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/priyanshupandeyyy/aria-crm.git
   cd aria-crm
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in `packages/crm-service/`:
   ```env
   PORT=3001
   MONGODB_URI=mongodb://127.0.0.1:27017/aria-crm
   GROQ_API_KEY=your_groq_key
   CHANNEL_SERVICE_URL=http://localhost:3002
   CHANNEL_CALLBACK_URL=http://localhost:3001/api/receipts
   ALLOWED_ORIGINS=http://localhost:5173
   ```
   
   Create a `.env` file in `packages/channel-service/`:
   ```env
   PORT=3002
   CRM_CALLBACK_URL=http://localhost:3001/api/receipts
   ```

4. **Seed the Database:**
   ```bash
   npm run seed --workspace=packages/crm-service
   ```

5. **Start the Application:**
   Open three terminal windows and start the services:
   ```bash
   npm run crm      # Terminal 1
   npm run channel  # Terminal 2
   npm run frontend # Terminal 3
   ```
   
   The app will be available at `http://localhost:5173`.
