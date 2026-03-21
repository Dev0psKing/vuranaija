export interface Transaction {
  id: string;
  date: string;
  type: 'deposit' | 'withdrawal' | 'investment' | 'conversion';
  amount: number;
  currency: 'NGN' | 'USD';
  description: string;
  status: 'completed' | 'pending' | 'failed';
  balanceAfter?: number;
  isRecurring?: boolean;
}

export interface UserProfile {
  name?: string;
  monthlyIncome: number;
  monthlySavingsCapacity: number;
  currentSavings: number;
  usdSavings?: number;
  debt: number;
  riskTolerance: 'low' | 'medium' | 'high';
  financialGoal: string;
  goalAmount?: number;
  completedModules: string[];
  transactions?: Transaction[];
}

export interface SimulationResult {
  investmentType: 'treasury' | 'mutual' | 'stocks';
  monthlyContribution: number;
  durationYears: number;
  totalContributed: number;
  totalReturns: number;
  futureValue: number;
  inflationAdjustedValue: number;
  dataPoints: Array<{
    year: number;
    amount: number;
    contributions: number;
  }>;
}

export interface FinancialHealthScore {
  score: number;
  breakdown: {
    stability: number;
    growth: number;
    risk: number;
    preparedness: number;
  };
  level: 'critical' | 'fair' | 'good' | 'excellent' | 'very good';
  recommendations: Array<{
    pillar: 'stability' | 'growth' | 'risk' | 'preparedness';
    text: string;
    action: string;
    link: string;
  }>;
  trend: Array<{ date: string; score: number }>;
  peerPercentile: number;
}

export interface AIInsight {
  insights: string[];
  risks: string[];
  roadmap: {
    month1: string | { objective: string; actions: string[] };
    month2: string | { objective: string; actions: string[] };
    month3: string | { objective: string; actions: string[] };
  };
}

export interface PortfolioAsset {
  id: string;
  name: string;
  type: 'treasury' | 'mutual' | 'stocks' | 'cash' | 'crypto' | 'realestate';
  amount: number;
  returns: number;
  lastUpdated: string;
}

export interface Portfolio {
  totalValue: number;
  totalReturns: number;
  assets: PortfolioAsset[];
  history: Array<{
    date: string;
    value: number;
    contribution: number;
  }>;
  originalPortfolio?: Portfolio;
}
