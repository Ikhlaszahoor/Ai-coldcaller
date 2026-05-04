# CallAI — AI-Powered Cold Caller

A full-stack AI cold calling assistant built with Node.js and Claude API. Generate personalized call scripts, handle objections in real-time, track call outcomes, and manage prospects via CSV upload.

## Features

- **AI Script Generator** — Personalized cold call scripts via Claude AI
- **Live Call Timer** — Track call duration with start/pause/stop
- **Objection Handler** — Real-time AI rebuttals for any prospect pushback
- **Call Log & Dashboard** — Stats, conversion rate, outcome tracking
- **CSV Upload** — Bulk import prospects and load them into the caller
- **Export** — Download call logs as CSV

## Tech Stack

- **Backend:** Node.js, Express.js
- **AI:** Anthropic Claude API (`claude-opus-4-5`)
- **Frontend:** Vanilla HTML/CSS/JS (no framework needed)
- **CSV Parsing:** csv-parse

## Setup

**1. Clone the repo**
```bash
git clone https://github.com/Ikhlaszahoor/ai-cold-caller.git
cd ai-cold-caller
```

**2. Install dependencies**
```bash
cd backend
npm install
```

**3. Add your API key**
```bash
cp .env.example .env
# .env file open karo aur ANTHROPIC_API_KEY add karo
```

Get your API key from: https://console.anthropic.com

**4. Run the server**
```bash
npm start
# Dev mode (auto-restart):
npm run dev
```

**5. Open in browser**
```
http://localhost:3000
```

## CSV Format

Your prospect CSV should have these columns (any order):

```
name, company, role, industry, phone, email
```

## Project Structure

```
ai-cold-caller/
├── backend/
│   ├── server.js          # Express server
│   ├── routes/api.js      # API endpoints
│   └── package.json
├── frontend/
│   ├── index.html         # Main UI
│   ├── style.css          # Styling
│   └── app.js             # Frontend logic
├── .env.example
├── .gitignore
└── README.md
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/generate-script` | Generate cold call script |
| POST | `/api/handle-objection` | Get objection rebuttal |
| POST | `/api/parse-csv` | Parse prospect CSV file |

---

Built with Claude API by [Your Name]
