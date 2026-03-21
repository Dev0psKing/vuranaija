import { SimulationResult, FinancialHealthScore, UserProfile, Portfolio, PortfolioAsset } from '@/types';

export const INVESTMENT_RATES = {
  treasury: 0.19, // 19% avg (Current Naija T-Bills)
  mutual: 0.16,   // 16% avg (Money Market Funds)
  stocks: 0.25,   // 25% avg (NGX aggressive growth)
  cash: 0.04,     // 4% for savings/cash
  crypto: 0.40,   // 40% high risk/reward
  realestate: 0.12, // 12% steady real estate
};

export const INFLATION_RATE = 0.1506; // Nigeria inflation (March 2026 approx)

export const MARKET_SCENARIOS = {
  stable: {
    name: 'Stable Growth',
    description: 'Current market conditions continue.',
    rateModifier: 1.0,
    inflationModifier: 1.0,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10'
  },
  bull: {
    name: 'Bull Market',
    description: 'Optimistic growth, NGX stocks soaring.',
    rateModifier: 1.25,
    inflationModifier: 0.8,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10'
  },
  bear: {
    name: 'Bear Market',
    description: 'Market downturn, global recession fears.',
    rateModifier: 0.6,
    inflationModifier: 1.2,
    color: 'text-red-500',
    bg: 'bg-red-500/10'
  },
  crisis: {
    name: 'Inflation Crisis',
    description: 'Hyper-inflation scenario (30%+).',
    rateModifier: 1.1,
    inflationModifier: 2.0,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10'
  }
};

export function calculateMonthsToGoal(
  currentSavings: number,
  monthlyContribution: number,
  goalAmount: number,
  annualRate: number
): number {
  if (currentSavings >= goalAmount) return 0;
  if (monthlyContribution <= 0 && annualRate <= 0) return Infinity; // Will never reach

  let balance = currentSavings;
  let months = 0;
  const monthlyRate = annualRate / 12;
  const maxMonths = 1200; // 100 years cap to prevent infinite loops

  while (balance < goalAmount && months < maxMonths) {
    balance = (balance + monthlyContribution) * (1 + monthlyRate);
    months++;
  }

  return months;
}

export function calculateCompoundInterest(
  principal: number,
  monthlyContribution: number,
  rate: number,
  years: number
): SimulationResult {
  const months = years * 12;
  let balance = principal;
  let totalContributed = principal;
  const dataPoints = [];

  // Monthly compounding
  const monthlyRate = rate / 12;

  for (let i = 1; i <= months; i++) {
    balance = (balance + monthlyContribution) * (1 + monthlyRate);
    totalContributed += monthlyContribution;

    if (i % 12 === 0) {
      dataPoints.push({
        year: i / 12,
        amount: Math.round(balance),
        contributions: Math.round(totalContributed),
      });
    }
  }

  // Inflation adjustment: PV = FV / (1 + r)^n
  const inflationAdjustedValue = balance / Math.pow(1 + INFLATION_RATE, years);

  return {
    investmentType: rate === INVESTMENT_RATES.treasury ? 'treasury' : rate === INVESTMENT_RATES.mutual ? 'mutual' : 'stocks',
    monthlyContribution,
    durationYears: years,
    totalContributed: Math.round(totalContributed),
    totalReturns: Math.round(balance - totalContributed),
    futureValue: Math.round(balance),
    inflationAdjustedValue: Math.round(inflationAdjustedValue),
    dataPoints,
  };
}

export function calculateHealthScore(profile: UserProfile): FinancialHealthScore {
  const { monthlyIncome, monthlySavingsCapacity, currentSavings, debt } = profile;

  // 1. Savings Rate (30 points)
  // Ideal: 20% of income
  const savingsRate = monthlyIncome > 0 ? (monthlySavingsCapacity / monthlyIncome) : 0;
  const savingsScore = Math.min(30, (savingsRate / 0.20) * 30);

  // 2. Emergency Fund (30 points)
  // Ideal: 6 months of expenses (Income - Savings)
  const monthlyExpenses = monthlyIncome - monthlySavingsCapacity;
  const monthsCovered = monthlyExpenses > 0 ? (currentSavings / monthlyExpenses) : 0;
  
  // FIX: Stability Score Logic
  // If savings rate is high (>25%) and debt is zero, compensate for low emergency fund
  let emergencyScore = Math.min(30, (monthsCovered / 6) * 30);
  if (emergencyScore < 10 && savingsRate > 0.25 && debt === 0) {
    emergencyScore = 15; // Minimum 15 points if other factors are excellent
  }

  // 3. Debt Ratio (20 points)
  // Ideal: 0 debt. Penalize if debt > 0.
  const debtRatio = monthlyIncome > 0 ? (debt / monthlyIncome) : 0;
  const debtScore = Math.max(0, 20 - (debtRatio * 3)); 

  // 4. Preparedness/Consistency (20 points)
  let preparednessScore = 0;
  if (profile.financialGoal) preparednessScore += 10;
  if (monthlySavingsCapacity > 0) preparednessScore += 10;

  const totalScore = Math.round(savingsScore + emergencyScore + debtScore + preparednessScore);

  let level: FinancialHealthScore['level'] = 'critical';
  if (totalScore >= 90) level = 'excellent';
  else if (totalScore >= 75) level = 'very good';
  else if (totalScore >= 50) level = 'good';
  else if (totalScore >= 30) level = 'fair';

  // Generate Recommendations
  const recommendations: FinancialHealthScore['recommendations'] = [];
  
  if (monthsCovered < 3) {
    recommendations.push({
      pillar: 'stability',
      text: "Your emergency fund is low. Aim for 3-6 months of expenses.",
      action: "Try our automated sweep feature!",
      link: "/dashboard"
    });
  }
  
  if (savingsRate < 0.20) {
    recommendations.push({
      pillar: 'growth',
      text: "Your savings rate is below the 20% benchmark.",
      action: "Increase your monthly savings capacity.",
      link: "/simulator"
    });
  } else if (savingsRate > 0.30) {
    recommendations.push({
      pillar: 'growth',
      text: "Great savings rate! Consider optimizing your investment allocation.",
      action: "Explore the Investment Market.",
      link: "/market"
    });
  }

  if (debtRatio > 0.5) {
    recommendations.push({
      pillar: 'risk',
      text: "Your debt-to-income ratio is high.",
      action: "Use our Debt Payoff Planner.",
      link: "/debt-payoff"
    });
  }

  if (!profile.financialGoal) {
    recommendations.push({
      pillar: 'preparedness',
      text: "You haven't set a financial goal yet.",
      action: "Set a goal to stay motivated.",
      link: "/onboarding"
    });
  }

  // Simulated Trend Data (Last 6 months)
  const trend = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = d.toLocaleString('default', { month: 'short' });
    // Randomly fluctuate score around the current score for demo
    const randomFluctuation = Math.floor(Math.random() * 10) - 5;
    trend.push({
      date: monthName,
      score: Math.max(0, Math.min(100, totalScore + randomFluctuation - (i * 2)))
    });
  }

  // Peer Percentile (Simulated)
  const peerPercentile = Math.min(99, Math.max(1, totalScore + 7));

  return {
    score: totalScore,
    breakdown: {
      stability: Math.round(emergencyScore),
      growth: Math.round(savingsScore),
      risk: Math.round(debtScore),
      preparedness: Math.round(preparednessScore),
    },
    level,
    recommendations,
    trend,
    peerPercentile
  };
}

export function generateDynamicPortfolio(profile: UserProfile): Portfolio {
  const { currentSavings, riskTolerance, monthlySavingsCapacity } = profile;
  
  // Allocation based on risk tolerance
  let allocations: Record<PortfolioAsset['type'], number>;
  
  if (riskTolerance === 'low') {
    allocations = { cash: 0.3, treasury: 0.4, mutual: 0.2, realestate: 0.1, stocks: 0.0, crypto: 0.0 };
  } else if (riskTolerance === 'high') {
    allocations = { cash: 0.1, treasury: 0.1, mutual: 0.1, realestate: 0.1, stocks: 0.4, crypto: 0.2 };
  } else {
    allocations = { cash: 0.15, treasury: 0.25, mutual: 0.2, realestate: 0.15, stocks: 0.2, crypto: 0.05 };
  }

  const assets: PortfolioAsset[] = [];
  let totalReturns = 0;
  const today = new Date().toISOString().split('T')[0];

  Object.entries(allocations).forEach(([type, pct], i) => {
    if (pct === 0) return;
    const amount = currentSavings * pct;
    const rate = INVESTMENT_RATES[type as keyof typeof INVESTMENT_RATES] || 0;
    // Assume 6 months of returns on average for the current balance
    const returns = amount * (rate / 2); 
    totalReturns += returns;

    const names = {
      cash: 'PiggyVest Flex Naira',
      treasury: 'FGN Savings Bonds',
      mutual: 'Stanbic IBTC Money Market',
      stocks: 'MTN Nigeria Shares',
      crypto: 'Bitcoin (BTC)',
      realestate: 'Lagos Real Estate Trust'
    };

    assets.push({
      id: String(i + 1),
      name: names[type as keyof typeof names],
      type: type as PortfolioAsset['type'],
      amount: Math.round(amount + returns),
      returns: Math.round(returns),
      lastUpdated: today
    });
  });

  const totalValue = assets.reduce((sum, a) => sum + a.amount, 0);

  // Generate 6 months of history
  const history = [];
  const now = new Date();
  
  // Base value to start calculating history from (current total value)
  let historicalValue = totalValue;
  
  // We want to generate data for the last 6 months, ending with the current month
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    
    // Add some random variation to the contribution (±20%)
    const variation = 1 + (Math.random() * 0.4 - 0.2);
    const actualContribution = i === 0 ? monthlySavingsCapacity : Math.round(monthlySavingsCapacity * variation);
    
    // Calculate the value at this point in time
    // We work backwards: Value(t-1) = Value(t) - Contribution(t) - Returns(t)
    // To make it look like a growing chart from left to right, we calculate the historical values
    // by subtracting estimated past contributions and returns from the current total.
    
    // Estimated monthly return based on total returns over 6 months
    const estimatedMonthlyReturn = totalReturns / 6;
    
    // Add some market volatility to the return (±50% of the estimated return)
    const volatility = 1 + (Math.random() * 1.0 - 0.5);
    const actualReturn = estimatedMonthlyReturn * volatility;
    
    // Calculate the value for this month
    const valueAtPoint = historicalValue - (i * actualContribution) - (i * actualReturn);
    
    history.push({
      date: `${monthName} ${year}`,
      value: Math.max(0, Math.round(valueAtPoint)),
      contribution: Math.max(0, actualContribution)
    });
  }

  return {
    totalValue: Math.round(totalValue),
    totalReturns: Math.round(totalReturns),
    assets,
    history
  };
}

export function calculatePortfolioProjection(
  portfolio: Portfolio,
  monthlyContribution: number,
  years: number,
  rateModifier: number = 1.0
): Array<{ month: number; value: number; contributions: number; returns: number }> {
  const dataPoints = [];
  let currentBalance = portfolio.totalValue;
  let totalContributed = portfolio.totalValue;

  // Calculate weighted average rate of the portfolio
  const totalWeight = portfolio.assets.reduce((sum, a) => sum + a.amount, 0);
  const baseRate = totalWeight > 0 
    ? portfolio.assets.reduce((sum, a) => {
        const rate = INVESTMENT_RATES[a.type as keyof typeof INVESTMENT_RATES] || 0;
        return sum + (rate * (a.amount / totalWeight));
      }, 0)
    : 0.10; // Default to 10% if portfolio is empty

  const weightedRate = baseRate * rateModifier;
  const monthlyRate = weightedRate / 12;

  // Add month 0
  dataPoints.push({
    month: 0,
    value: Math.round(currentBalance),
    contributions: Math.round(totalContributed),
    returns: 0
  });

  for (let m = 1; m <= years * 12; m++) {
    currentBalance = (currentBalance + monthlyContribution) * (1 + monthlyRate);
    totalContributed += monthlyContribution;
    
    dataPoints.push({
      month: m,
      value: Math.round(currentBalance),
      contributions: Math.round(totalContributed),
      returns: Math.round(currentBalance - totalContributed)
    });
  }

  return dataPoints;
}
