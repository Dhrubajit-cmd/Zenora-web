# 🌐 Zenora: Complete Cloud Deployment & Hosting Guide

This guide walks you through deploying the entire Zenora ecosystem—including the PostgreSQL database, GoLang REST API, Node.js OTP server, Python Machine Learning service, and React frontend—to secure, scalable cloud hosting environments, completely free of charge.

---

## 🏗️ Architecture Overview

The deployed system interacts securely across the cloud:

```mermaid
graph TD
    User([User Browser]) -->|HTTPS| Frontend[Frontend: Vercel / Netlify]
    Frontend -->|API Requests| GoBackend[Go Backend: Render / Railway]
    Frontend -->|OTP Requests| NodeOTP[Node.js OTP: Render / Railway]
    GoBackend -->|Read/Write| Postgres[(PostgreSQL: Neon / Supabase)]
    GoBackend -->|Inference Requests| PythonML[Python ML Server: Render / Railway]
    NodeOTP -.->|Sends Verification Email| SMTP[Gmail SMTP Server]
```

---

## 🗄️ Step 1: Deploy the PostgreSQL Database (Neon)

[Neon.tech](https://neon.tech) offers a serverless PostgreSQL database with a generous free tier, auto-scaling, and an excellent online SQL editor.

### 1. Set Up the Instance
1. Go to [Neon](https://neon.tech) and sign up for a free account.
2. Click **Create Project**. Name it `Zenora-Database` and select your closest region.
3. Once the database is created, copy the **Connection String** (which looks like `postgresql://alex:password@ep-cool-snowflake-12345.us-east-2.aws.neon.tech/neondb?sslmode=require`). Save this safely; it is your cloud `DATABASE_URL`.

### 2. Initialize the Database Schema
Go to the **SQL Editor** tab in the Neon dashboard and execute the following SQL script to create all required tables:

```sql
-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    user_name VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) DEFAULT '',
    address VARCHAR(255) DEFAULT '',
    password_hashed VARCHAR(255) DEFAULT '',
    currency VARCHAR(10) DEFAULT 'USD',
    google_id VARCHAR(255) DEFAULT '',
    age INT DEFAULT 0
);

-- 2. Incomes Table
CREATE TABLE IF NOT EXISTS incomes (
    income_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    source VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    income_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    expense_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    description VARCHAR(255) DEFAULT '',
    amount NUMERIC(12, 2) NOT NULL,
    expense_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Investments Table
CREATE TABLE IF NOT EXISTS investments (
    investment_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    asset_type VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    investment_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Goals Table
CREATE TABLE IF NOT EXISTS goals (
    goal_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    goal_name VARCHAR(255) NOT NULL,
    target_amount NUMERIC(12, 2) NOT NULL,
    target_date DATE NOT NULL
);

-- 6. ML Overrides Table
CREATE TABLE IF NOT EXISTS ml_overrides (
    override_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    raw_text VARCHAR(255) NOT NULL,
    corrected_category VARCHAR(100) NOT NULL
);
```

---

## 🧠 Step 2: Deploy the Python ML Service (Render)

The machine learning service (`personal-finance-ml`) is built with FastAPI. We can host it on [Render](https://render.com) as a free Web Service.

### 1. Create a `requirements.txt`
In the `personal-finance-ml` directory, ensure you have a `requirements.txt` containing the necessary dependencies:

```text
fastapi==0.110.0
uvicorn==0.28.0
pydantic==2.6.4
pandas==2.2.1
scikit-learn==1.4.1.post1
transformers==4.38.2
torch==2.2.1
```

### 2. Configure Render Web Service
1. Log in to [Render](https://render.com) and click **New +** > **Web Service**.
2. Connect your Git repository.
3. Set the following options:
   * **Name:** `zenora-ml`
   * **Runtime:** `Python 3`
   * **Root Directory:** `personal-finance-ml`
   * **Build Command:** `pip install -r requirements.txt`
   * **Start Command:** `uvicorn src.api:app --host 0.0.0.0 --port $PORT`
4. Click **Deploy Web Service** and save your deployed URL (e.g. `https://zenora-ml.onrender.com`).

---

## ✉️ Step 3: Deploy the Node.js OTP Service (Render)

The Node.js server (`backend` directory) handles mail-out verifications.

### 1. Configure Render Web Service
1. In the Render Dashboard, click **New +** > **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   * **Name:** `zenora-otp`
   * **Runtime:** `Node`
   * **Root Directory:** `backend`
   * **Build Command:** `npm install`
   * **Start Command:** `node server.js`
4. In the **Environment** tab, click **Add Environment Variable** and enter:
   * `EMAIL_USER`: *Your Google Gmail address*
   * `EMAIL_PASS`: *Your Google Gmail App Password* (generated in Google Account > Security > App Passwords)
5. Deploy and copy the deployed URL (e.g. `https://zenora-otp.onrender.com`).

---

## ⚙️ Step 4: Deploy the GoLang REST API (Render)

The core API server (`personal-finance-backend`) handles JWT tokens, transactional data routing, and acts as the gatekeeper.

### 1. Configure Render Web Service
1. Click **New +** > **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   * **Name:** `zenora-api`
   * **Runtime:** `Go`
   * **Root Directory:** `personal-finance-backend`
   * **Build Command:** `go build -o server cmd/server/main.go`
   * **Start Command:** `./server`
4. Go to the **Environment** tab and add:
   * `DATABASE_URL`: *Your Neon connection string*
   * `ML_SERVER_URL`: *Your deployed Python ML server URL* (e.g. `https://zenora-ml.onrender.com`)
   * `JWT_SECRET`: *A secure random string (e.g., `8f7b5a2e9c1d4f6b0a8e7d5c3b1a9f0e`)*
5. Deploy and save the API URL (e.g. `https://zenora-api.onrender.com`).

---

## 💻 Step 5: Connecting the React Frontend to the Cloud

Rather than hardcoding cloud URLs directly into component files, the industry best practice is using **Vite Environment Variables**. This makes switching between local development and cloud production automatic!

### 1. Set Up Environment Config Files
In the `frontend` root directory, create a `.env.production` file:

```env
VITE_API_URL=https://zenora-api.onrender.com
VITE_OTP_URL=https://zenora-otp.onrender.com
VITE_ML_URL=https://zenora-ml.onrender.com
```

Create a `.env.development` file for local testing:

```env
VITE_API_URL=http://localhost:8080
VITE_OTP_URL=http://localhost:5050
VITE_ML_URL=http://localhost:5000
```

### 2. Update React Code to Reference Env Variables
Replace all hardcoded localhost fetch requests with dynamic environment endpoints:

#### In `LoginForm.jsx`:
```javascript
// Send OTP via Node server
const res = await fetch(`${import.meta.env.VITE_OTP_URL}/send-otp`, { ... })

// Verify OTP
const verifyRes = await fetch(`${import.meta.env.VITE_OTP_URL}/verify-otp`, { ... })

// Fetch Token from Go backend
const loginRes = await fetch(`${import.meta.env.VITE_API_URL}/auth/otp-login`, { ... })
```

#### In `DashboardForm.jsx`, `ActivityPage.jsx`, `TransactionsPage.jsx`:
Replace all instances of `"http://localhost:8080"` with `` `${import.meta.env.VITE_API_URL}` ``.

---

## 🖥️ Step 6: Deploy the Frontend (Vercel / Netlify)

Vercel and Netlify offer excellent developer ecosystems that host static React websites for free with automatic SSL certificate generation.

### Deploying to Vercel
1. Sign up for a free [Vercel](https://vercel.com) account.
2. Click **Add New** > **Project** and connect your Git repository.
3. Configure the setup:
   * **Framework Preset:** `Vite`
   * **Root Directory:** `frontend`
4. Click **Deploy**. Vercel will automatically build your React codebase, apply the `.env.production` environment variables, and deliver a live production site!
