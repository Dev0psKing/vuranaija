import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, FinancialHealthScore, SimulationResult, AIInsight, Portfolio, Transaction } from '@/types';
import { calculateHealthScore, generateDynamicPortfolio, INVESTMENT_RATES } from '@/lib/finance';
import { generateFinancialAdvice } from '@/lib/ai';

interface UserContextType {
  profile: UserProfile;
  updateProfile: (data: Partial<UserProfile>) => void;
  healthScore: FinancialHealthScore | null;
  simulation: SimulationResult | null;
  setSimulation: (sim: SimulationResult) => void;
  hasOnboarded: boolean;
  aiInsight: AIInsight | null;
  setAiInsight: (insight: AIInsight | null) => void;
  portfolio: Portfolio | null;
  depositToWallet: (amount: number) => void;
  withdrawFromWallet: (amount: number) => void;
  depositToUsdWallet: (amount: number) => void;
  withdrawFromUsdWallet: (amount: number, rate: number) => void;
  convertNgnToUsd: (ngnAmount: number, rate: number) => void;
  convertUsdToNgn: (usdAmount: number, rate: number) => void;
  investFromWallet: (amount: number, assetType: 'treasury' | 'mutual' | 'stocks' | 'cash' | 'crypto' | 'realestate', assetName: string) => void;
  sellAsset: (assetId: string, amount: number) => void;
  simulateTime: (years: number) => void;
  resetSimulation: () => void;
  resetData: () => void;
}

const defaultProfile: UserProfile = {
  name: '',
  monthlyIncome: 0,
  monthlySavingsCapacity: 0,
  currentSavings: 0,
  usdSavings: 0,
  debt: 0,
  riskTolerance: 'medium',
  financialGoal: '',
  completedModules: [],
  transactions: [],
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const defaultPortfolio: Portfolio = {
  totalValue: 0,
  totalReturns: 0,
  assets: [],
  history: []
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('vuranaija_profile');
    return saved ? JSON.parse(saved) : defaultProfile;
  });

  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [healthScore, setHealthScore] = useState<FinancialHealthScore | null>(null);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(() => {
    const saved = localStorage.getItem('vuranaija_ai_insight');
    return saved ? JSON.parse(saved) : null;
  });
  const [portfolio, setPortfolio] = useState<Portfolio | null>(() => {
    const saved = localStorage.getItem('vuranaija_portfolio');
    return saved ? JSON.parse(saved) : defaultPortfolio;
  });

  useEffect(() => {
    localStorage.setItem('vuranaija_profile', JSON.stringify(profile));
    if (profile.monthlyIncome > 0) {
      setHealthScore(calculateHealthScore(profile));
    }
  }, [profile]);

  useEffect(() => {
    if (portfolio) {
      localStorage.setItem('vuranaija_portfolio', JSON.stringify(portfolio));
      
      // Retroactively fix duplicate history entries (from previous bug)
      if (portfolio.history && portfolio.history.length > 0) {
        const uniqueDates = new Set(portfolio.history.map(h => h.date));
        if (uniqueDates.size < portfolio.history.length) {
          setPortfolio(prev => {
            if (!prev) return prev;
            
            const mergedHistory: typeof prev.history = [];
            
            prev.history.forEach(entry => {
              const existingIndex = mergedHistory.findIndex(h => h.date === entry.date);
              if (existingIndex >= 0) {
                // Update the existing entry with the latest value and sum contributions
                mergedHistory[existingIndex] = {
                  ...mergedHistory[existingIndex],
                  value: entry.value, // Keep the latest value
                  contribution: mergedHistory[existingIndex].contribution + entry.contribution
                };
              } else {
                mergedHistory.push({ ...entry });
              }
            });
            
            return {
              ...prev,
              history: mergedHistory
            };
          });
        }
      }

      // Calculate accrued returns based on time elapsed since lastUpdated
      const now = new Date();
      let hasUpdates = false;
      const updatedAssets = portfolio.assets.map(asset => {
        if (!asset.lastUpdated) return asset;
        const lastDate = new Date(asset.lastUpdated);
        const diffTime = Math.abs(now.getTime() - lastDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
          hasUpdates = true;
          const rate = INVESTMENT_RATES[asset.type as keyof typeof INVESTMENT_RATES] || 0.05;
          const dailyRate = rate / 365;
          const futureValue = asset.amount * Math.pow(1 + dailyRate, diffDays);
          const newReturns = (asset.returns || 0) + (futureValue - asset.amount);
          
          return {
            ...asset,
            amount: futureValue,
            returns: newReturns,
            lastUpdated: now.toISOString().split('T')[0]
          };
        }
        return asset;
      });

      if (hasUpdates) {
        setPortfolio(prev => {
          if (!prev) return prev;
          const newTotalValue = updatedAssets.reduce((sum, a) => sum + a.amount, 0);
          const newTotalReturns = updatedAssets.reduce((sum, a) => sum + a.returns, 0);
          return {
            ...prev,
            totalValue: newTotalValue,
            totalReturns: newTotalReturns,
            assets: updatedAssets
          };
        });
      }
    }
  }, [portfolio]);

  useEffect(() => {
    if (aiInsight) {
      localStorage.setItem('vuranaija_ai_insight', JSON.stringify(aiInsight));
    } else {
      localStorage.removeItem('vuranaija_ai_insight');
    }
  }, [aiInsight]);

  // Background AI Sync
  useEffect(() => {
    if (profile.monthlyIncome <= 0 || !healthScore) return;

    const timer = setTimeout(async () => {
      try {
        // generateFinancialAdvice handles its own caching. 
        // If the state hasn't changed, it returns the cached version instantly.
        // If the state HAS changed, it fetches new advice in the background.
        const insight = await generateFinancialAdvice(profile, healthScore, simulation, portfolio);
        setAiInsight(insight);
      } catch (e) {
        console.error("Background AI sync failed", e);
      }
    }, 5000); // 5-second debounce to avoid spamming API on rapid transactions

    return () => clearTimeout(timer);
  }, [
    profile.currentSavings,
    profile.usdSavings,
    profile.monthlyIncome,
    profile.debt,
    profile.riskTolerance,
    portfolio?.totalValue,
    healthScore,
    simulation
  ]);

  const updateProfile = (data: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...data }));
  };

  const depositToWallet = (amount: number) => {
    const newBalance = (profile.currentSavings || 0) + amount;
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type: 'deposit',
      amount,
      currency: 'NGN',
      description: 'Deposit to NGN Wallet',
      status: 'completed',
      balanceAfter: newBalance
    };
    setProfile(prev => ({
      ...prev,
      currentSavings: newBalance,
      transactions: [newTransaction, ...(prev.transactions || [])]
    }));
  };

  const withdrawFromWallet = (amount: number) => {
    if ((profile.currentSavings || 0) < amount) return;
    const newBalance = (profile.currentSavings || 0) - amount;
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type: 'withdrawal',
      amount,
      currency: 'NGN',
      description: 'Withdrawal from NGN Wallet',
      status: 'completed',
      balanceAfter: newBalance
    };
    setProfile(prev => ({
      ...prev,
      currentSavings: newBalance,
      transactions: [newTransaction, ...(prev.transactions || [])]
    }));
  };

  const depositToUsdWallet = (amount: number) => {
    const newBalance = (profile.usdSavings || 0) + amount;
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type: 'deposit',
      amount,
      currency: 'USD',
      description: 'Deposit to USD Wallet',
      status: 'completed',
      balanceAfter: newBalance
    };
    setProfile(prev => ({
      ...prev,
      usdSavings: newBalance,
      transactions: [newTransaction, ...(prev.transactions || [])]
    }));
  };

  const withdrawFromUsdWallet = (amount: number, rate: number) => {
    if ((profile.usdSavings || 0) < amount) return;
    const ngnAmount = amount * rate;
    const newUsdBalance = (profile.usdSavings || 0) - amount;
    const newNgnBalance = (profile.currentSavings || 0) + ngnAmount;
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type: 'withdrawal',
      amount,
      currency: 'USD',
      description: `Withdrawal from USD Wallet (Converted to ₦${ngnAmount.toFixed(2)})`,
      status: 'completed',
      balanceAfter: newUsdBalance
    };
    setProfile(prev => ({
      ...prev,
      usdSavings: newUsdBalance,
      currentSavings: newNgnBalance,
      transactions: [newTransaction, ...(prev.transactions || [])]
    }));
  };

  const convertNgnToUsd = (ngnAmount: number, rate: number) => {
    if ((profile.currentSavings || 0) < ngnAmount) return;
    const usdAmount = ngnAmount / rate;
    const newNgnBalance = (profile.currentSavings || 0) - ngnAmount;
    const newUsdBalance = (profile.usdSavings || 0) + usdAmount;
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type: 'conversion',
      amount: ngnAmount,
      currency: 'NGN',
      description: `Converted ₦${ngnAmount} to $${usdAmount.toFixed(2)}`,
      status: 'completed',
      balanceAfter: newNgnBalance
    };
    setProfile(prev => ({
      ...prev,
      currentSavings: newNgnBalance,
      usdSavings: newUsdBalance,
      transactions: [newTransaction, ...(prev.transactions || [])]
    }));
  };

  const convertUsdToNgn = (usdAmount: number, rate: number) => {
    if ((profile.usdSavings || 0) < usdAmount) return;
    const ngnAmount = usdAmount * rate;
    const newUsdBalance = (profile.usdSavings || 0) - usdAmount;
    const newNgnBalance = (profile.currentSavings || 0) + ngnAmount;
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type: 'conversion',
      amount: usdAmount,
      currency: 'USD',
      description: `Converted $${usdAmount} to ₦${ngnAmount.toFixed(2)}`,
      status: 'completed',
      balanceAfter: newUsdBalance
    };
    setProfile(prev => ({
      ...prev,
      usdSavings: newUsdBalance,
      currentSavings: newNgnBalance,
      transactions: [newTransaction, ...(prev.transactions || [])]
    }));
  };

  const investFromWallet = (amount: number, assetType: 'treasury' | 'mutual' | 'stocks' | 'cash' | 'crypto' | 'realestate', assetName: string) => {
    if (profile.currentSavings < amount) return; // Insufficient funds

    const newBalance = profile.currentSavings - amount;
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type: 'investment',
      amount,
      currency: 'NGN',
      description: `Invested in ${assetName}`,
      status: 'completed',
      balanceAfter: newBalance,
      isRecurring: Math.random() > 0.7 // Mock recurring for some investments
    };

    // Deduct from wallet
    setProfile(prev => ({
      ...prev,
      currentSavings: newBalance,
      transactions: [newTransaction, ...(prev.transactions || [])]
    }));

    // Add to portfolio
    setPortfolio(prev => {
      if (!prev) return defaultPortfolio;
      
      const existingAssetIndex = prev.assets.findIndex(a => a.type === assetType && a.name === assetName);
      let newAssets = [...prev.assets];
      
      if (existingAssetIndex >= 0) {
        newAssets[existingAssetIndex] = {
          ...newAssets[existingAssetIndex],
          amount: newAssets[existingAssetIndex].amount + amount,
          returns: newAssets[existingAssetIndex].returns || 0
        };
      } else {
        newAssets.push({
          id: Math.random().toString(36).substr(2, 9),
          name: assetName,
          type: assetType,
          amount: amount,
          returns: 0,
          lastUpdated: new Date().toISOString().split('T')[0]
        });
      }

      const newTotalValue = prev.totalValue + amount;
      const now = new Date();
      const monthName = now.toLocaleString('default', { month: 'short' });
      const year = now.getFullYear();
      const currentDateStr = `${monthName} ${year}`;
      
      let newHistory = [...(prev.history || [])];
      const existingMonthIndex = newHistory.findIndex(h => h.date === currentDateStr);
      
      if (existingMonthIndex >= 0) {
        newHistory[existingMonthIndex] = {
          ...newHistory[existingMonthIndex],
          value: newTotalValue,
          contribution: newHistory[existingMonthIndex].contribution + amount
        };
      } else {
        newHistory.push({
          date: currentDateStr,
          value: newTotalValue,
          contribution: amount
        });
      }

      return {
        ...prev,
        totalValue: newTotalValue,
        totalReturns: prev.totalReturns || 0,
        assets: newAssets,
        history: newHistory
      };
    });
  };

  const sellAsset = (assetId: string, amount: number) => {
    if (!portfolio) return;
    
    const asset = portfolio.assets.find(a => a.id === assetId);
    if (!asset || asset.amount < amount) return;

    const newBalance = (profile.currentSavings || 0) + amount;
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type: 'withdrawal', // Treat as a withdrawal from portfolio to wallet
      amount,
      currency: 'NGN',
      description: `Sold ${asset.name}`,
      status: 'completed',
      balanceAfter: newBalance
    };

    // Add to wallet
    setProfile(prev => ({
      ...prev,
      currentSavings: newBalance,
      transactions: [newTransaction, ...(prev.transactions || [])]
    }));

    // Deduct from portfolio
    setPortfolio(prev => {
      if (!prev) return defaultPortfolio;
      
      let newAssets = [...prev.assets];
      const assetIndex = newAssets.findIndex(a => a.id === assetId);
      
      let realizedReturn = 0;
      let principalSold = amount;

      if (assetIndex >= 0) {
        // Calculate realized return proportionally
        const proportionSold = amount / newAssets[assetIndex].amount;
        realizedReturn = (newAssets[assetIndex].returns || 0) * proportionSold;
        principalSold = amount - realizedReturn;

        if (newAssets[assetIndex].amount <= amount) {
          // Remove asset entirely if sold all
          newAssets.splice(assetIndex, 1);
        } else {
          // Reduce amount and returns proportionally
          newAssets[assetIndex] = {
            ...newAssets[assetIndex],
            amount: newAssets[assetIndex].amount - amount,
            returns: (newAssets[assetIndex].returns || 0) - realizedReturn
          };
        }
      }

      const newTotalValue = prev.totalValue - amount;
      const newTotalReturns = (prev.totalReturns || 0) - realizedReturn;

      const now = new Date();
      const monthName = now.toLocaleString('default', { month: 'short' });
      const year = now.getFullYear();
      const currentDateStr = `${monthName} ${year}`;
      
      let newHistory = [...(prev.history || [])];
      const existingMonthIndex = newHistory.findIndex(h => h.date === currentDateStr);
      
      if (existingMonthIndex >= 0) {
        newHistory[existingMonthIndex] = {
          ...newHistory[existingMonthIndex],
          value: newTotalValue,
          contribution: newHistory[existingMonthIndex].contribution - principalSold
        };
      } else {
        newHistory.push({
          date: currentDateStr,
          value: newTotalValue,
          contribution: -principalSold
        });
      }

      return {
        ...prev,
        totalValue: newTotalValue,
        totalReturns: newTotalReturns,
        assets: newAssets,
        history: newHistory
      };
    });
  };

  const simulateTime = (years: number) => {
    setPortfolio(prev => {
      if (!prev || prev.assets.length === 0) return prev;

      const newAssets = prev.assets.map(asset => {
        const rate = INVESTMENT_RATES[asset.type as keyof typeof INVESTMENT_RATES] || 0.05;
        // Simple compound interest for the simulation period
        const futureValue = asset.amount * Math.pow(1 + rate, years);
        const newReturns = (asset.returns || 0) + (futureValue - asset.amount);
        
        return {
          ...asset,
          amount: futureValue,
          returns: newReturns,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
      });

      const newTotalValue = newAssets.reduce((sum, a) => sum + a.amount, 0);
      const newTotalReturns = newAssets.reduce((sum, a) => sum + a.returns, 0);

      const newHistoryEntry = {
        date: new Date(Date.now() + years * 365 * 24 * 60 * 60 * 1000).toLocaleString('default', { month: 'short', year: 'numeric' }),
        value: newTotalValue,
        contribution: 0 // Just tracking growth, not new contributions in this jump
      };

      return {
        ...prev,
        totalValue: newTotalValue,
        totalReturns: newTotalReturns,
        assets: newAssets,
        history: [...prev.history, newHistoryEntry],
        originalPortfolio: prev.originalPortfolio || prev
      };
    });
  };

  const resetSimulation = () => {
    setPortfolio(prev => {
      if (prev && prev.originalPortfolio) {
        return prev.originalPortfolio;
      }
      return prev;
    });
  };

  const hasOnboarded = profile.monthlyIncome > 0;

  const resetData = () => {
    setProfile(defaultProfile);
    setPortfolio(defaultPortfolio);
    setSimulation(null);
    setHealthScore(null);
    setAiInsight(null);
    localStorage.removeItem('vuranaija_profile');
    localStorage.removeItem('vuranaija_portfolio');
    localStorage.removeItem('vuranaija_ai_insight');
  };

  return (
    <UserContext.Provider value={{ 
      profile, updateProfile, healthScore, simulation, setSimulation, 
      hasOnboarded, aiInsight, setAiInsight, portfolio,
      depositToWallet, withdrawFromWallet, depositToUsdWallet, withdrawFromUsdWallet, convertNgnToUsd, convertUsdToNgn, investFromWallet, sellAsset, simulateTime, resetSimulation, resetData
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
