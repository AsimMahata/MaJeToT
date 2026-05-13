# MaJeToT

A full-stack web app for a small group of friends (2–5 people) to track their placement preparation together. Users join a group, upload a JSON curriculum template, and track topic checkboxes + lecture counts per section. Progress updates trigger AI-generated motivational messages sent to a Telegram group.

## Tech Stack

- **Frontend:** React + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend:** Node.js + Express + TypeScript
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (localStorage)
- **Real-time:** Socket.io
- **AI:** HuggingFace Inference API
- **Notifications:** Telegram Bot API

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Server Setup
```bash
cd server
cp .env .env.local  # Edit with your credentials
npm install
npm run dev
```

### 2. Client Setup
```bash
cd client
npm install
npm run dev
```

The app runs at `http://localhost:5173` with API proxied to `http://localhost:4000`.

## Environment Variables

Create a `.env` file in `/server`:

```env
MONGODB_URI=mongodb://localhost:27017/placementsync
JWT_SECRET=your_random_secret
PORT=4000
FRONTEND_URL=http://localhost:5173
HUGGINGFACE_API_KEY=your_hf_api_key
HUGGINGFACE_MODEL=meta-llama/Meta-Llama-3-8B-Instruct
```

## Sample Template

Save this as `template.json` and upload it in the app:

```json
{
  "title": "Placement Prep 2025",
  "sections": [
    {
      "id": "os",
      "title": "Operating Systems",
      "color": "#6366f1",
      "topics": [
        { "id": "os-1", "label": "Process vs Program vs Thread" },
        { "id": "os-2", "label": "CPU Scheduling — FCFS, SJF, Round Robin" }
      ],
      "lectures": { "label": "Gate Smashers OS Playlist", "total": 120 }
    },
    {
      "id": "dsa",
      "title": "Data Structures",
      "color": "#10b981",
      "topics": [
        { "id": "dsa-1", "label": "Arrays — sliding window, prefix sums" }
      ],
      "lectures": { "label": "Striver A2Z", "total": 200 }
    }
  ]
}
```

## Features

- 🔐 JWT auth with signup/login
- 👥 Group creation with 6-char join codes
- 📋 JSON curriculum template upload
- ✅ Topic checkbox tracking with debounced save
- 🎬 Lecture progress tracking
- 🤖 AI-generated motivational/roasting messages via HuggingFace
- 📱 Telegram notifications
- ⚡ Real-time activity feed via Socket.io
- 🔥 Daily streak tracking
- 🎉 Confetti on section completion
- 📥 Export progress as Markdown
- 👀 View group members' progress
