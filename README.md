# 🚀 VuraNaija: AI-Powered Financial Co-Pilot for Nigerian Youth

> **NextGen Knowledge Showcase Submission**  
> **Fellow:** Collins Uwabor  
> **Track:** AI/ML Learning Track  
> **Pillar:** Financial Inclusion  
> **Live Demo:** [https://vuranaija.vercel.app](https://vuranaija.vercel.app)  
> **Demo Video:** [Watch on YouTube](https://youtu.be/FGZdL1lveXE)

---

## 🎯 1. The Problem
Nigeria faces a critical **Financial Literacy Gap**. While fintech apps provide access to investment tools, high inflation (30%+) erodes savings faster than users understand.
- **The Challenge:** Existing platforms offer transactions but **no strategy**. Users don't know *what* to buy, *when* to buy, or how to hedge against Naira devaluation.
- **The Result:** Passive saving without growth, or risky decisions based on misinformation.

## 👥 2. Target Users
- **Primary:** Nigerian youths (18–55) entering the workforce who are digitally native but financially excluded.
- **Secondary:** Individuals planning emigration ("Japa") needing structured financial roadmaps.
- **Underserved Groups:** Non-expert speakers who need financial advice in **Nigerian Pidgin**.

## 🛠️ 3. The Solution & Build (Technical Implementation)
**VuraNaija** is an intelligent layer on top of traditional fintech, using AI to democratize financial strategy.

### Core Features
1.  **AI Financial Coach:** An LLM-powered assistant providing personalized advice in English & Pidgin.
2.  **Inflation Simulator:** A dynamic engine allowing users to test strategies against real-world economic shocks (e.g., "What if inflation hits 30%?").
3.  **Portfolio Stress Testing:** Visualizes portfolio resilience during market crashes (Bear Market, Crypto Winter).
4.  **Japa Planner:** Calculates relocation costs and currency hedging strategies.

### Tech Stack (AI/ML Focus)
-   **Frontend:** Next.js, React, Tailwind CSS (Responsive PWA).
-   **AI Engine:** Integrated **Google Gemini API / Qwen LLM** for natural language processing and contextual financial reasoning.
-   **Prompt Engineering:** Custom system prompts tailored to Nigerian economic context (inflation, Japa, local assets).
-   **Deployment:** Vercel (Serverless Edge Functions).
-   **Data Visualization:** Recharts for interactive financial forecasting.

## 🌍 4. Impact
-   **Educational:** Transforms passive savers into informed investors by explaining complex concepts (like compound interest) simply.
-   **Economic:** Helps users protect wealth from inflation through data-driven asset allocation (e.g., suggesting USD assets for Japa goals).
-   **Inclusion:** Breaks language barriers by offering **Pidgin support**, making high-level financial advice accessible to millions.

## 📈 5. Scalability & Business Model
-   **Revenue:** Affiliate commissions from SEC-licensed partners (Cowrywise, Chapel Hill Denham) and a Freemium model for advanced AI insights.
-   **Growth:** Viral loops via shareable "Financial Health Scores" and community challenges.
-   **Future Roadmap:** Integration with Open Banking APIs (Mono/Okra) for auto-sweep features and real-time transaction analysis.

## 🤖 6. AI Tool Disclosure
This project leverages Generative AI to power its core value proposition:
-   **Model:** Google Gemini / Qwen-Turbo (LLM).
- 
-   **Application:**
    -   Generating personalised financial advice based on user profile data.
    -   Translating financial jargon into Nigerian Pidgin.
    -   Dynamic scenario generation for the Simulation Engine.
-   **Human-in-the-Loop:** All AI advice includes mandatory disclaimers urging users to consult licensed advisors before executing trades.

## 🏃‍♂️ 7. How to Run Locally
```bash
# Clone the repository
git clone https://github.com/Dev0psKing/vuranaija.git

# Install dependencies
npm install

# Set up environment variables (.env.local)
GOOGLE_API_KEY=your_key_here
# or
DASHSCOPE_API_KEY=your_key_here

# Run development server
npm run dev
