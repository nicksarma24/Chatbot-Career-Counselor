# Career Counselor Chatbot

This is a Next.js-based chatbot web application designed to provide career guidance and counseling. The assistant acts as a career counselor, offering actionable advice and answering user questions interactively.

## Features
- Start a new conversation with a dedicated "New" button
- Each session begins with the assistant greeting: "How can I help you with career guidance today?"
- Chat history is maintained for each session
- Powered by Supabase for session and message storage
- Streaming responses from the assistant

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn
- Supabase project (for storing sessions and messages)

### Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/nicksarma24/Chatbot-Career-Counselor.git
   cd Chatbot-Career-Counselor
   ```
2. Install dependencies:
   ```sh
   npm install
   # or
   yarn install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env.local` and fill in your Supabase and Cohere API keys.

### Running Locally
```sh
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure
```
career-counselor-chat/
├── src/
│   ├── app/
│   │   ├── chat/
│   │   │   └── page.js
│   │   ├── api/
│   │   │   ├── messages/stream/route.js
│   │   │   └── sessions/route.js
│   │   ├── globals.css
│   │   ├── layout.js
│   │   └── page.js
│   └── lib/
│       └── supabaseClient.js
├── package.json
├── jsconfig.json
├── next.config.mjs
├── postcss.config.mjs
└── README.md
```
Attaching the screenshot: 
<img width="1900" height="968" alt="image" src="https://github.com/user-attachments/assets/c88a234c-5c27-47d7-a9f4-196b4bba79e1" />

