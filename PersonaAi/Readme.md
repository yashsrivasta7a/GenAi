# PersonaAI Chatbot Backend

This project is an **Express.js + Azure OpenAI API** backend that powers two distinct chat personas:

1. **Hitesh Choudhary** (`/chat/hitesh`) – casual, Hinglish-speaking tech mentor as in *"Chai aur Code"*.
2. **Piyush Garg** (`/chat/piyush`) – professional, energetic full-stack/devops educator with a light Hinglish touch.

Each persona’s responses are **fully in-character** based on detailed *system prompts*.

---

## 📂 Project Structure

.
├── PersonaAi.js # Main Express.js server
├── system_prompt.js # Persona definition for Hitesh Choudhary
├── system_prompt_piyush.js # Persona definition for Piyush Garg
├── package.json
├── .env # Environment variables (Azure API keys)

text

---

## ⚙️ Setup & Installation

### 1️⃣ Clone the Repository
git clone <your-repo-url>
cd persona-ai-backend

text

### 2️⃣ Install Dependencies
npm install

text

### 3️⃣ Configure Environment
Create a `.env` in the project root:
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_ENDPOINT=your_api_endpoint_here
PORT=5000

text

> This uses **AzureOpenAI `gpt-4o`** model.

---

## 🚀 Run the Server
node PersonaAi.js

text
Output:
Persona bot backend running on port 5000

text

---

## 📡 API Endpoints

### **1. POST /chat/hitesh**
Send a message to **Hitesh Choudhary**.
{
"message": "How to get a job in tech?"
}

text
Response:
{
"reply": "Arre bhai, seedhi si baat — skill banao, projects build karo..."
}

text

---

### **2. POST /chat/piyush**
Send a message to **Piyush Garg**.
{
"message": "How to fix a port conflict?"
}

text
Response:
{
"reply": "Chalo, ek kaam karte hain: run 'netstat -ano | findstr :80'..."
}

text

---

### **3. POST /clear**
Clear conversation history.
{
"persona": "hitesh" // or "piyush" or omit to clear both
}

text
Response:
{
"message": "Conversation cleared"
}

text

---

## 🧠 Persona Design Summary

### 🎯 Hitesh (`system_prompt.js`)
- Hinglish + tech mentor
- Motivational & teasing
- Uses phrases like _"bhai, consistency hi sab kuch hai"_
- Everyday analogies & coding stories

### 🚀 Piyush (`system_prompt_piyush.js`)
- Professional, beginner-friendly, DevOps & Cloud focus
- Step-by-step structure
- Light humor & Mannu Paaji banter

---

## 🔄 How It Works – Flow Diagram

### **Hitesh Persona Request**
┌──────────────┐ ┌─────────────────┐ ┌──────────────────┐
│ Frontend │ POST │ Express Server │ API │ Azure OpenAI GPT │
│ (React, ──┼──────►│ /chat/hitesh ├──────►│ Model gpt-4o │
│ etc.) │ │ Uses system │ │ With Hitesh's │
└──────┬───────┘ │ prompt │ │ persona rules │
│ └────────┬────────┘ └────────┬─────────┘
│ │ │
│<────── JSON reply ◄────┘ │
│ │
▼ ▼
User sees Responds in tone:
Hinglish, "Arre bhai..."
motivational style

text

---

### **Piyush Persona Request**
┌──────────────┐ ┌─────────────────┐ ┌──────────────────┐
│ Frontend │ POST │ Express Server │ API │ Azure OpenAI GPT │
│ (React, etc.)├──────►│ /chat/piyush ├──────►│ Model gpt-4o │
└──────┬───────┘ │ Uses Piyush's │ │ With Piyush's │
│ │ system prompt │ │ persona rules │
│ └────────┬────────┘ └────────┬─────────┘
│ │ │
│<────── JSON reply ◄────┘ │
▼ ▼
User sees Responds in tone:
step-by-step, "Chalo, ek kaam..."
DevOps-focused style

text

---

## 🛠 Technology Stack
- **Node.js + Express**
- **Azure OpenAI API** (`gpt-4o`)
- CORS for frontend calls
- Environment variables with `dotenv`

---

## 📌 Notes
- Chat history is stored **in-memory** (will reset if server restarts)
- `/clear` allows clearing individual or all persona histories
- No AI/self references — personas speak as the real human

---

## 📜 License
For **educational/demo** purposes. Shows how to integrate multiple custom AI personas in one backend using Azure OpenAI.
