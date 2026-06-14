# Aria CRM

Aria CRM is a next-generation Customer Relationship Management platform supercharged by artificial intelligence. Built with modern web technologies, it features an intuitive dashboard, AI-assisted campaign drafting, intelligent customer segmentation, and multi-channel message delivery simulation.

## 🌐 Live Demo

- **Frontend Application**: [https://aria-crm-frontend.vercel.app/](https://aria-crm-frontend.vercel.app/)
- **CRM API Service**: [https://aria-crm-service.onrender.com/api/health](https://aria-crm-service.onrender.com/api/health)
- **Channel Delivery Simulator**: [https://aria-channel-service.onrender.com/health](https://aria-channel-service.onrender.com/health)

## ✨ Features

- **AI-Powered Assistant**: Leverage Google Gemini and Groq integrations to auto-draft campaign messages, analyze customer data, and generate natural language segment queries.
- **Dynamic Customer Segmentation**: Create and manage highly specific customer segments using advanced filtering rules.
- **Campaign Management**: End-to-end campaign workflow—from drafting and reviewing content to launching and tracking delivery across multiple channels (Email, SMS, Push).
- **Interactive Analytics**: View real-time campaign performance and customer engagement through beautiful, interactive charts.
- **Modern User Interface**: A sleek, responsive dashboard built with React and Tailwind CSS.

## 🏗️ Architecture

Aria CRM is structured as a monorepo containing three core packages:

1. **`frontend`** (React + Vite + Tailwind CSS): The user-facing dashboard providing rich, interactive experiences.
2. **`crm-service`** (Node.js + Express + MongoDB): The core backend service handling business logic, data persistence, and AI API integrations.
3. **`channel-service`** (Node.js + Express): A simulated delivery engine representing external communication channels (e.g., SendGrid, Twilio) to track campaign dispatch and simulate real-world message delivery.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or Atlas cluster)
- API Keys for AI features (Google Gemini API, Groq API)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/priyanshupandeyyy/aria-crm.git
   cd aria-crm
   ```

2. Install dependencies for the root and all workspaces:
   ```bash
   npm install
   ```

### Environment Configuration

You will need to set up environment variables for the backend services.

Create a `.env` file in `packages/crm-service/`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/aria-crm
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
CHANNEL_SERVICE_URL=http://localhost:5001
```

Create a `.env` file in `packages/channel-service/`:
```env
PORT=5001
```

### Seeding the Database

To test the application with sample data, run the seed script:
```bash
npm run seed --workspace=packages/crm-service
```

### Running the Application

You can start each service individually using the root package scripts. Open three separate terminal windows and run:

**Terminal 1: Start CRM Service**
```bash
npm run crm
```

**Terminal 2: Start Channel Service**
```bash
npm run channel
```

**Terminal 3: Start Frontend**
```bash
npm run frontend
```

The frontend will be available at `http://localhost:5173`.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Recharts, Lucide Icons
- **Backend**: Node.js, Express.js
- **Database**: MongoDB, Mongoose
- **AI Integrations**: Google Generative AI SDK, Groq SDK

## 📝 License

This project is licensed under the MIT License.
