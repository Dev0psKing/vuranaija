import { UserProfile, FinancialHealthScore, SimulationResult, AIInsight, Portfolio } from "@/types";

// --- Caching & Retry Utilities ---

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getAdviceCacheKey(profile: UserProfile, portfolio: Portfolio | null): string {
  const state = {
    income: profile.monthlyIncome,
    savings: profile.monthlySavingsCapacity,
    debt: profile.debt,
    goal: profile.financialGoal,
    risk: profile.riskTolerance,
    wallet: profile.currentSavings,
    usdWallet: profile.usdSavings,
    portfolioValue: portfolio?.totalValue || 0,
  };
  // Simple hash/stringification for cache key
  return `ai_advice_cache_${btoa(JSON.stringify(state))}`;
}

async function withRetryAndTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 120000,
    maxRetries: number = 2,
    onRetry?: (attempt: number) => void
): Promise<T> {
  let retries = 0;
  while (true) {
    let timeoutId: ReturnType<typeof setTimeout>;
    try {
      const operationPromise = operation();
      // Prevent unhandled rejection if it rejects after timeout
      operationPromise.catch(() => {});

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("AI Generation Timeout")), timeoutMs);
      });

      const result = await Promise.race([operationPromise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId!);
      const isRateLimit = error.message?.includes('429') || error.message?.toLowerCase().includes('quota');
      const isTimeout = error.message === "AI Generation Timeout";

      if ((isRateLimit || isTimeout) && retries < maxRetries) {
        retries++;
        if (onRetry) onRetry(retries);
        const delay = Math.pow(2, retries) * 2000; // 4s, 8s
        console.warn(`${isTimeout ? 'Timeout' : 'Rate limit'} hit. Retrying in ${delay}ms... (Attempt ${retries} of ${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

async function callGroq(
    messages: { role: string, content: string }[],
    model: string = "llama-3.1-8b-instant",
    jsonMode: boolean = false
): Promise<string> {
  // Support multiple keys for rate limit bypassing
  const keys = [
    process.env.GROQ_API_KEY || (import.meta as any).env.VITE_GROQ_API_KEY,
    process.env.GROQ_API_KEY_ALT || (import.meta as any).env.VITE_GROQ_API_KEY_ALT
  ].filter(Boolean);

  if (keys.length === 0) throw new Error("Groq API key missing");

  const body: any = { model, messages };
  if (jsonMode) body.response_format = { type: "json_object" };

  let lastError = new Error("Unknown error");

  for (const apiKey of keys) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (e) {
      lastError = e as Error;
      console.warn(`Groq key failed, trying next if available...`, e);
      continue;
    }
  }

  throw lastError;
}

export function generateFallbackAdvice(
    profile: UserProfile,
    healthScore: FinancialHealthScore,
    portfolio: Portfolio | null
): AIInsight {
  const insights = [];
  const risks = [];

  // Basic insights based on data
  if ((profile.currentSavings || 0) > 0) {
    insights.push(`You have ₦${(profile.currentSavings || 0).toLocaleString()} sitting idle in your NGN wallet. Consider moving this into a high-yield asset like Treasury Bills to beat inflation.`);
    risks.push(`Leaving cash uninvested in your NGN wallet exposes it to inflation. Put every Naira to work.`);
  }

  if ((profile.usdSavings || 0) > 0) {
    insights.push(`You hold $${(profile.usdSavings || 0).toLocaleString()} in your USD wallet, providing an excellent hedge against Naira devaluation.`);
  }

  if (portfolio && (portfolio.totalValue || 0) > 0) {
    insights.push(`Your portfolio of ₦${(portfolio.totalValue || 0).toLocaleString()} is a great start. Keep automating your monthly investments to harness compound interest.`);
  } else {
    insights.push(`You haven't made your first investment yet. Start with a low-risk Money Market Fund to get comfortable with investing.`);
  }

  if ((profile.monthlySavingsCapacity || 0) > (profile.monthlyIncome || 0) * 0.2) {
    insights.push(`Great job! You are saving over 20% of your income, which is excellent for building wealth in Nigeria.`);
  } else {
    insights.push(`Try to gradually increase your savings to at least 20% of your ₦${(profile.monthlyIncome || 0).toLocaleString()} income.`);
  }

  if ((profile.debt || 0) > 0) {
    risks.push(`High debt (₦${(profile.debt || 0).toLocaleString()}) can restrict your ability to invest in high-yield opportunities.`);
  }

  if (profile.riskTolerance === 'high') {
    insights.push(`Your high risk tolerance means you can explore Nigerian equities, but ensure you have a solid cash buffer first.`);
  } else {
    insights.push(`Your conservative approach is great for capital preservation using FGN Bonds and Money Market funds.`);
  }

  // Ensure we have exactly 3 insights and 2 risks
  while (insights.length < 3) insights.push(`Consistency is key: automate your ₦${(profile.monthlySavingsCapacity || 0).toLocaleString()} monthly savings.`);
  while (risks.length < 2) risks.push(`Inflation in Nigeria can erode cash savings; ensure your money is invested in yield-generating assets.`);

  return {
    insights: insights.slice(0, 3),
    risks: risks.slice(0, 2),
    roadmap: {
      month1: {
        objective: "Establish Financial Foundations",
        actions: [
          "Track all expenses for 30 days",
          "Set up an automated transfer for your savings",
          profile.debt > 0 ? "Create a strict debt repayment plan" : "Open a high-yield savings account"
        ]
      },
      month2: {
        objective: "Build the Emergency Buffer",
        actions: [
          "Direct all extra income to your emergency fund",
          "Review your subscriptions and cut unnecessary costs",
          "Research low-risk mutual funds in Nigeria"
        ]
      },
      month3: {
        objective: "Begin Wealth Accumulation",
        actions: [
          "Make your first investment based on your risk profile",
          "Review your progress towards your primary goal",
          "Adjust your budget based on the last 60 days of data"
        ]
      }
    }
  };
}

export async function generateFinancialAdvice(
    profile: UserProfile,
    healthScore: FinancialHealthScore,
    simulation: SimulationResult | null,
    portfolio: Portfolio | null,
    onRetry?: (attempt: number) => void,
    forceRefresh: boolean = false
): Promise<AIInsight> {
  const groqKey = process.env.GROQ_API_KEY || (import.meta as any).env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY_ALT || (import.meta as any).env.VITE_GROQ_API_KEY_ALT;

  if (!groqKey) {
    console.warn("No Groq API Key configured, using offline fallback");
    return generateFallbackAdvice(profile, healthScore, portfolio);
  }

  // Check Cache
  const cacheKey = getAdviceCacheKey(profile, portfolio);
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache: CacheEntry<AIInsight> = JSON.parse(cached);
        if (Date.now() - parsedCache.timestamp < CACHE_TTL) {
          console.log("Using cached AI advice");
          return parsedCache.data;
        }
      }
    } catch (e) {
      console.warn("Failed to read cache", e);
    }
  } else {
    console.log("Force refreshing AI advice, bypassing cache");
  }

  const systemInstruction = `You are a Nigerian financial advisor and AI Co-Pilot for VuraNaija.
Your goal is to give actionable advice that beats Nigeria's 15.06% inflation.
Recommend specific partner funds based on their risk tolerance:
- Low Risk (Defender): Stanbic IBTC Money Market Fund (16%) or FGN Treasury Bills (19%)
- Medium Risk (Builder): Bamboo S&P 500 Index Fund (10% USD)
- High Risk (Aggressor): Meristem Nigerian Equity Fund (28%)

CRITICAL LOGIC:
1. If the goal is 'Japa Fund', prioritize Dollar-denominated assets (like Bamboo S&P 500) to protect against Naira devaluation.
2. If the risk tolerance is 'high' (Aggressor), recommend higher-yield equity funds like Meristem.
3. If the risk tolerance is 'low' (Defender), prioritize capital preservation.

Using the provided data:
- 3 personalized insights (1 sentence each). Include specific partner fund recommendations.
- 2 behavioral risks (concise).
- 90-day roadmap (month1, month2, month3).
Return ONLY valid JSON matching the requested schema. Do not include markdown formatting like \`\`\`json.`;

  const prompt = `
    ${systemInstruction}

    Profile: Income ₦${profile.monthlyIncome}, Savings Capacity ₦${profile.monthlySavingsCapacity}, Debt ₦${profile.debt}, Goal ${profile.financialGoal} (Target: ₦${profile.goalAmount || 'N/A'}).
    Current NGN Wallet Balance (Uninvested Cash): ₦${profile.currentSavings}.
    Current USD Wallet Balance (Uninvested Cash): $${profile.usdSavings || 0}.
    Current Portfolio Value (Invested Assets): ₦${portfolio?.totalValue || 0}.
    Score: ${healthScore.score}/100.
    Risk Tolerance: ${profile.riskTolerance}.
    ${simulation ? `Simulating ${simulation.investmentType} ₦${simulation.monthlyContribution}/mo.` : ""}

    JSON keys: insights(array of strings), risks(array of strings), roadmap(object with month1, month2, month3, each containing an 'objective' string and 'actions' array of strings).
  `;

  try {
    let responseText = "";
    const groqMessages = [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt }
    ];

    try {
      // TIER 1: Primary Groq (70B for complex JSON)
      responseText = await callGroq(groqMessages, "llama-3.1-70b-versatile", true);
    } catch (primaryError) {
      console.warn("Groq 70B failed, falling back to 8B...", primaryError);
      // TIER 2: Secondary Groq (8B Failover)
      responseText = await callGroq(groqMessages, "llama-3.1-8b-instant", true);
    }

    if (!responseText) throw new Error("No response from any AI");

    // Clean markdown formatting if Groq returned it
    const cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const insightData = JSON.parse(cleanText) as AIInsight;

    // Save to cache
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: insightData
      }));
    } catch (e) {
      console.warn("Failed to write to cache", e);
    }

    return insightData;
  } catch (error) {
    console.error("All AI Tiers Failed, using Offline Fallback:", error);
    // TIER 3: Offline Fallback
    return generateFallbackAdvice(profile, healthScore, portfolio);
  }
}

export async function chatWithCoach(
    messages: { role: 'user' | 'model', parts: { text: string }[] }[],
    profile: UserProfile,
    healthScore: FinancialHealthScore,
    portfolio: Portfolio | null,
    isPidgin: boolean = false,
    onRetry?: (attempt: number) => void
): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY || (import.meta as any).env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY_ALT || (import.meta as any).env.VITE_GROQ_API_KEY_ALT;

  if (!groqKey) {
    return isPidgin
        ? `📡 Network Dey Rest Small. No vex, my brain dey recharge, but I still see your money well well!\n\nWetin You Get:\n• NGN Wallet: ₦${(profile.currentSavings || 0).toLocaleString()}\n• USD Wallet: $${(profile.usdSavings || 0).toLocaleString()}\n\nMy Advice For Now: Since you wan reach ₦${(profile.monthlySavingsCapacity || 0).toLocaleString()} monthly, try shift that idle cash go T-Bills or Money Market. E go grow while we wait. I go come back strong soon to chat proper!`
        : `📡 Offline Mode Active. While I'm recharging my AI engines, your financial data is safe and visible.\n\nQuick Snapshot:\n• NGN Wallet: ₦${(profile.currentSavings || 0).toLocaleString()}\n• USD Wallet: $${(profile.usdSavings || 0).toLocaleString()}\n\nMy Static Recommendation: Based on your goal to save ₦${(profile.monthlySavingsCapacity || 0).toLocaleString()} monthly, consider moving idle cash into a high-yield Money Market Fund today. I'll be back online soon to refine this strategy!`;
  }

  let systemInstruction = `You are an expert Nigerian financial advisor and AI Co-Pilot for VuraNaija.
Your goal is to give actionable, personalized advice that helps users beat Nigeria's high inflation (currently ~15.06%).
You have access to the user's financial profile:
- Monthly Income: ₦${profile.monthlyIncome.toLocaleString()}
- Monthly Savings Capacity: ₦${profile.monthlySavingsCapacity.toLocaleString()}
- Current Uninvested NGN Cash: ₦${profile.currentSavings.toLocaleString()}
- Current Uninvested USD Cash: $${profile.usdSavings?.toLocaleString() || 0}
- Total Invested Portfolio: ₦${portfolio?.totalValue?.toLocaleString() || 0}
- Financial Goal: ${profile.financialGoal} (Target: ₦${profile.goalAmount?.toLocaleString() || 'N/A'})
- Risk Tolerance: ${profile.riskTolerance}
- Financial Health Score: ${healthScore.score}/100

CRITICAL LOGIC:
1. If the user's goal is 'Japa Fund', explain that they need Dollar-denominated assets (like S&P 500) to protect against Naira devaluation.
2. If their risk tolerance is 'high' (Aggressor), recommend higher-yield equity funds like Meristem.
3. If their risk tolerance is 'low' (Defender), prioritize capital preservation.

Be conversational, empathetic, and direct. Use Nigerian context (Naira, T-Bills, FGN Bonds, local inflation, "Japa" if relevant). Keep responses concise (2-4 short paragraphs max) unless explaining a complex topic.`;

  if (isPidgin) {
    systemInstruction += `\n\n=== CRITICAL: NIGERIAN PIDGIN MODE ===
YOU ARE NOW SPEAKING AUTHENTIC NIGERIAN PIDGIN. 
Follow these rules strictly:

1. TONE & PERSONA:
   - You are a wise, street-smart Nigerian big brother/sister ("Oga").
   - Be warm, empathetic, but direct. No robotic corporate talk.
   - Use humor where appropriate (e.g., referencing "Sapa" or "Chop life").

2. MANDATORY VOCABULARY (Use these often):
   - Greetings/Connectors: "How far", "Wetin dey happen", "Abeg", "No wahala", "I hear you", "Make we", "Na so", "E no be easy".
   - Money/Work: "Kobo", "Cash", "Hustle", "Small small", "Heavy load", "Break bread".
   - Emphasis: "Well well", "Proper proper", "Joor", "Oya".

3. STRICT FORBIDDEN WORDS (DO NOT USE):
   - NEVER use American slang: "Gotta", "Wanna", "Cool", "Awesome", "Side hustle" (use "small business"), "Guys".
   - NEVER use complex financial jargon without explaining it in simple Pidgin first.

4. SENTENCE STRUCTURE:
   - Keep sentences short and punchy.
   - Use Nigerian grammar (e.g., "You dey try" instead of "You are trying", "Make you no forget" instead of "Do not forget").

5. FEW-SHOT EXAMPLES (Learn from these):
   - User: "How I fit save money?"
     YOU: "Oga, e no be by force o! Start small small. Even if na ₦500 daily, make you drop am inside your savings account before you spend anything. Small small, e go become mountain!"
   
   - User: "Inflation too much."
     YOU: "Ah, I feel you well well! Prices dey go up everywhere. Na why you no fit leave your money for bank account doing nothing. Make we put am work for T-Bills or Money Market, so e go grow pass inflation."

   - User: "I want to invest."
     YOU: "That one na good o! But first, which kind risk you fit carry? If you no wan lose sleep, make we start with Money Market. If you get strong heart, we fit look shares. Wetin you think?"

6. GOAL:
   - Give the same high-quality financial advice, but wrap it in this authentic Pidgin voice.
   - Ensure the numbers (₦, $) remain accurate.
===============================`;
  }

  try {
    const groqMessages = [
      { role: "system", content: systemInstruction },
      ...messages.map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.parts[0].text
      }))
    ];

    try {
      // TIER 1: Primary Groq (8B for speed)
      return await callGroq(groqMessages, "llama-3.1-8b-instant", false);
    } catch (primaryError) {
      console.warn("Groq 8B failed, falling back to 70B...", primaryError);
      // TIER 2: Secondary Groq (70B Failover)
      return await callGroq(groqMessages, "llama-3.1-70b-versatile", false);
    }
  } catch (error) {
    console.error("All AI Tiers Failed, using Offline Fallback:", error);

    // TIER 3: Offline Fallback
    const fallbackMsg = isPidgin
        ? `📡 Network Dey Rest Small. No vex, my brain dey recharge, but I still see your money well well!\n\nWetin You Get:\n• NGN Wallet: ₦${(profile.currentSavings || 0).toLocaleString()}\n• USD Wallet: $${(profile.usdSavings || 0).toLocaleString()}\n\nMy Advice For Now: Since you wan reach ₦${(profile.monthlySavingsCapacity || 0).toLocaleString()} monthly, try shift that idle cash go T-Bills or Money Market. E go grow while we wait. I go come back strong soon to chat proper!`
        : `📡 Offline Mode Active. While I'm recharging my AI engines, your financial data is safe and visible.\n\nQuick Snapshot:\n• NGN Wallet: ₦${(profile.currentSavings || 0).toLocaleString()}\n• USD Wallet: $${(profile.usdSavings || 0).toLocaleString()}\n\nMy Static Recommendation: Based on your goal to save ₦${(profile.monthlySavingsCapacity || 0).toLocaleString()} monthly, consider moving idle cash into a high-yield Money Market Fund today. I'll be back online soon to refine this strategy!`;

    return fallbackMsg;
  }
}

export async function askTutor(topic: string, question: string, onRetry?: (attempt: number) => void): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY || (import.meta as any).env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY_ALT || (import.meta as any).env.VITE_GROQ_API_KEY_ALT;

  if (!groqKey) {
    return `📡 Teacher Dey Offline. I can't generate new quizzes right now, but '${topic}' is a critical skill for beating inflation!\n\nAction Plan:\n• Read the module content above carefully.\n• Note down 3 key takeaways.\n• Come back when I'm online, and I'll test your knowledge with a custom quiz!\n\nKeep learning—knowledge is your best hedge against inflation.`;
  }

  const prompt = `
    You are a friendly financial tutor for Nigerian youth.
    Topic: ${topic}
    User Question: ${question}
    
    Answer in 2-3 sentences. Be simple, direct, and use a Nigerian context if applicable (e.g., mention Naira, local markets).
  `;

  try {
    const groqMessages = [
      { role: "user", content: prompt }
    ];

    try {
      // TIER 1: Primary Groq (8B for speed)
      return await callGroq(groqMessages, "llama-3.1-8b-instant", false);
    } catch (primaryError) {
      console.warn("Groq 8B failed, falling back to 70B...", primaryError);
      // TIER 2: Secondary Groq (70B Failover)
      return await callGroq(groqMessages, "llama-3.1-70b-versatile", false);
    }
  } catch (error) {
    console.error("All AI Tiers Failed, using Offline Fallback:", error);

    // TIER 3: Offline Fallback
    return `📡 Teacher Dey Offline. I can't generate new quizzes right now, but '${topic}' is a critical skill for beating inflation!\n\nAction Plan:\n• Read the module content above carefully.\n• Note down 3 key takeaways.\n• Come back when I'm online, and I'll test your knowledge with a custom quiz!\n\nKeep learning—knowledge is your best hedge against inflation.`;
  }
}
