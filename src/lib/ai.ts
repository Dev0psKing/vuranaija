import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
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

export function generateFallbackAdvice(
  profile: UserProfile,
  healthScore: FinancialHealthScore,
  portfolio: Portfolio | null
): AIInsight {
  const insights = [];
  const risks = [];
  
  // Basic insights based on data
  if (profile.currentSavings > 0) {
    insights.push(`You have ₦${profile.currentSavings.toLocaleString()} sitting idle in your NGN wallet. Consider moving this into a high-yield asset like Treasury Bills to beat inflation.`);
    risks.push(`Leaving cash uninvested in your NGN wallet exposes it to inflation. Put every Naira to work.`);
  }

  if (profile.usdSavings > 0) {
    insights.push(`You hold $${profile.usdSavings.toLocaleString()} in your USD wallet, providing an excellent hedge against Naira devaluation.`);
  }

  if (portfolio && portfolio.totalValue > 0) {
    insights.push(`Your portfolio of ₦${portfolio.totalValue.toLocaleString()} is a great start. Keep automating your monthly investments to harness compound interest.`);
  } else {
    insights.push(`You haven't made your first investment yet. Start with a low-risk Money Market Fund to get comfortable with investing.`);
  }

  if (profile.monthlySavingsCapacity > profile.monthlyIncome * 0.2) {
    insights.push(`Great job! You are saving over 20% of your income, which is excellent for building wealth in Nigeria.`);
  } else {
    insights.push(`Try to gradually increase your savings to at least 20% of your ₦${profile.monthlyIncome.toLocaleString()} income.`);
  }
  
  if (profile.debt > 0) {
    risks.push(`High debt (₦${profile.debt.toLocaleString()}) can restrict your ability to invest in high-yield opportunities.`);
  }
  
  if (profile.riskTolerance === 'high') {
    insights.push(`Your high risk tolerance means you can explore Nigerian equities, but ensure you have a solid cash buffer first.`);
  } else {
    insights.push(`Your conservative approach is great for capital preservation using FGN Bonds and Money Market funds.`);
  }

  // Ensure we have exactly 3 insights and 2 risks
  while (insights.length < 3) insights.push(`Consistency is key: automate your ₦${profile.monthlySavingsCapacity.toLocaleString()} monthly savings.`);
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
  if (!process.env.GEMINI_API_KEY) {
    console.warn("Gemini API Key not configured, using fallback");
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

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    const response = await withRetryAndTimeout(async () => {
      return ai.models.generateContent({
        model: "gemini-3-flash-preview", // Switched back to Flash for speed (30-40s -> ~5s)
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              insights: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              risks: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              roadmap: {
                type: Type.OBJECT,
                properties: {
                  month1: {
                    type: Type.OBJECT,
                    properties: {
                      objective: { type: Type.STRING },
                      actions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                  },
                  month2: {
                    type: Type.OBJECT,
                    properties: {
                      objective: { type: Type.STRING },
                      actions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                  },
                  month3: {
                    type: Type.OBJECT,
                    properties: {
                      objective: { type: Type.STRING },
                      actions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                  }
                }
              }
            }
          }
        }
      });
    }, 120000, 2, onRetry);

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response from AI");
    }
    
    const insightData = JSON.parse(responseText) as AIInsight;
    
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
    console.error("AI Generation Error, using fallback:", error);
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
  if (!process.env.GEMINI_API_KEY) {
    return "I'm currently operating in offline mode. Please configure the Gemini API key to chat with me!";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    systemInstruction += `\n\nCRITICAL: You MUST speak in friendly, clear Nigerian Pidgin English. Use terms like 'Oga', 'Abeg', 'No dull', 'Wetin', 'Chop life', 'Sapa', etc. Make the advice feel like a conversation between brothers/sisters while remaining professional about the numbers.`;
  }

  try {
    const response = await withRetryAndTimeout(async () => {
      return ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: messages,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction,
        }
      });
    }, 120000, 2, onRetry);

    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Chat Error:", error);
    
    // Fallback response if API fails
    const fallbackMsg = isPidgin 
      ? `Ah, network don jam small. But no worry, based on your profile, you get ₦${profile.currentSavings.toLocaleString()} for wallet and $${profile.usdSavings?.toLocaleString() || 0} for USD. Keep saving that ₦${profile.monthlySavingsCapacity.toLocaleString()} every month, e go make sense!`
      : `I'm currently experiencing network issues and can't reach my AI brain. However, looking at your profile, I see you have ₦${profile.currentSavings.toLocaleString()} in NGN and $${profile.usdSavings?.toLocaleString() || 0} in USD. I recommend focusing on your goal of saving ₦${profile.monthlySavingsCapacity.toLocaleString()} monthly until I'm back online.`;
      
    return fallbackMsg;
  }
}

export async function askTutor(topic: string, question: string, onRetry?: (attempt: number) => void): Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `
    You are a friendly financial tutor for Nigerian youth.
    Topic: ${topic}
    User Question: ${question}
    
    Answer in 2-3 sentences. Be simple, direct, and use a Nigerian context if applicable (e.g., mention Naira, local markets).
  `;

  try {
    const response = await withRetryAndTimeout(async () => {
      return ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        }
      });
    }, 60000, 2, onRetry);

    return response.text || "I couldn't generate an answer right now.";
  } catch (error) {
    console.error("Tutor Error:", error);
    return "Sorry, I'm having trouble connecting to the knowledge base.";
  }
}
