# C Buddy — AI C Programming Assistant

An AI-powered C programming tutor backed by **Google Gemini 1.5 Flash**.

---

## 🚀 Quick Start

### 1. Get a Gemini API Key (Free)
Go to → https://aistudio.google.com/app/apikey  
Click **"Create API Key"** and copy it.

### 2. Add your API Key
Open the `.env` file in this folder and replace the placeholder:
```
GEMINI_API_KEY=paste_your_key_here
```

### 3. Install dependencies (already done if you ran npm install)
```bash
npm install
```

### 4. Start the server
```bash
npm start
```

### 5. Open the app
Open your browser and go to: **http://localhost:3000**

---

## 📁 Project Structure
```
AI MODEL/
├── server.js          ← Backend (Express + Gemini API)
├── package.json
├── .env               ← Your API key (never share this!)
├── .gitignore
└── public/
    ├── index.html     ← Frontend UI
    ├── style.css      ← Premium dark theme
    └── app.js         ← Chat logic
```

---

## ✨ Features
- 🤖 Real AI responses via Gemini 1.5 Flash
- 💬 Conversation history (context-aware follow-ups)
- 🎨 C syntax highlighting in all code blocks
- 📋 One-click copy buttons on code
- 📚 Quick topic chips for common C concepts
- 🔒 API key secured server-side (never exposed to browser)
- 📱 Responsive design (mobile-friendly)
