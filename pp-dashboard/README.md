# Radha Darshan Petropack — Manufacturing Intelligence Dashboard

AI-powered daily report analysis for PP woven sack manufacturing.

## What this does

Upload your daily Excel/image/PDF reports → AI reads all 7 report types → Full dashboard with KPIs, alerts, trends, and insights.

---

## Setup (Windows)

### Step 1 — Install Node.js
1. Go to https://nodejs.org
2. Download the **LTS** version (green button)
3. Run the installer, click Next through all steps
4. Open **Command Prompt** and verify: `node --version` (should show v18 or higher)

### Step 2 — Get your Anthropic API Key
1. Go to https://console.anthropic.com
2. Sign up / log in
3. Click **API Keys** in the left sidebar
4. Click **Create Key**, name it "PP Dashboard", copy the key (starts with `sk-ant-...`)
5. **Save it somewhere safe** — you only see it once

### Step 3 — Set up the project
1. Download or copy this entire `pp-dashboard` folder to your computer (e.g., `C:\pp-dashboard`)
2. Open **Command Prompt** in that folder:
   - Press `Win + R`, type `cmd`, press Enter
   - Type: `cd C:\pp-dashboard` and press Enter

### Step 4 — Install dependencies
```
npm install
cd server
npm install
cd ..
```

### Step 5 — Configure your API key
1. In the `pp-dashboard` folder, find the file `.env.example`
2. Copy it and rename the copy to `.env`
3. Open `.env` in Notepad
4. Replace `sk-ant-your-key-here` with your actual key
5. Save and close

### Step 6 — Start the application
You need two Command Prompt windows open:

**Window 1 — Backend (API proxy):**
```
cd C:\pp-dashboard\server
node index.js
```
You should see: `API proxy running on http://localhost:3001`

**Window 2 — Frontend (Dashboard):**
```
cd C:\pp-dashboard
npm run dev
```
You should see: `Local: http://localhost:3000`

### Step 7 — Open the dashboard
Open your browser and go to: **http://localhost:3000**

---

## Daily Use

1. Make sure both Command Prompt windows are running (Steps 6)
2. Open http://localhost:3000
3. Click **Upload Report** or drag & drop your daily report files
4. Wait 10–20 seconds — the AI processes everything automatically
5. Review your dashboard

---

## Troubleshooting

**"ANTHROPIC_API_KEY not set"** → Check your `.env` file is in the right folder and has the correct key

**"Cannot connect"** → Make sure both windows (backend + frontend) are running

**Page doesn't load** → Try refreshing. If still broken, restart both windows

**API error 401** → Your API key is wrong — double-check it in `.env`

**API error 429** → Too many requests — wait 1 minute and try again

---

## Upgrading / Deployment (optional — for IT staff)

To make this accessible from any device on your network (tablet, phone, other computers):

1. Find your computer's local IP: `ipconfig` → look for IPv4 Address (e.g., 192.168.1.50)
2. In `vite.config.js`, add `host: true` inside `server:`
3. Restart the frontend
4. Others can access it at `http://192.168.1.50:3000`

For cloud deployment (accessible from anywhere):
- Frontend: Deploy `dist/` folder to **Netlify** (free) — run `npm run build` first
- Backend: Deploy `server/` to **Railway** or **Render** (free tier available)
- Set `ANTHROPIC_API_KEY` as an environment variable in your cloud platform
- Update `VITE_API_URL` in your frontend `.env` to point to your cloud backend URL
