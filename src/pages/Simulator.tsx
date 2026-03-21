import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { calculateCompoundInterest, INVESTMENT_RATES, INFLATION_RATE } from '@/lib/finance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calculator, Target, TrendingDown, ArrowRight, Info, Check, Zap, Share2, X, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Simulator() {
  const { profile, setSimulation } = useUser();
  const [activeTab, setActiveTab] = useState<'inflation' | 'currency' | 'goal'>('inflation');

  // Inflation Stress Test State
  const [infAmount, setInfAmount] = useState<number | string>(profile.monthlySavingsCapacity || 10000);
  const [infYears, setInfYears] = useState(5);
  const [infType, setInfType] = useState<'treasury' | 'mutual' | 'stocks'>('mutual');
  const [currentInfRate, setCurrentInfRate] = useState(INFLATION_RATE);
  const [infResult, setInfResult] = useState(() => calculateCompoundInterest(0, Number(infAmount) || 0, INVESTMENT_RATES[infType], infYears));

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Currency Preserver State
  const [curAmount, setCurAmount] = useState<number | string>(profile.monthlySavingsCapacity || 10000);
  const [curYears, setCurYears] = useState(5);
  const [curDevaluation, setCurDevaluation] = useState(20); // 20% annual devaluation

  // Goal Planner State
  const [goalAmount, setGoalAmount] = useState<number | string>(5000000);
  const [goalYears, setGoalYears] = useState(3);
  const [goalType, setGoalType] = useState<'treasury' | 'mutual' | 'stocks'>('mutual');

  useEffect(() => {
    if (activeTab === 'inflation') {
      // Custom calculation to allow dynamic inflation rate
      const months = Number(infYears) * 12;
      const rate = INVESTMENT_RATES[infType];
      const monthlyContribution = Number(infAmount) || 0;
      let balance = 0;
      let totalContributed = 0;
      const dataPoints = [];
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

      const inflationAdjustedValue = balance / Math.pow(1 + currentInfRate, Number(infYears));
      
      const res = {
        investmentType: infType,
        monthlyContribution,
        durationYears: Number(infYears),
        totalContributed: Math.round(totalContributed),
        totalReturns: Math.round(balance - totalContributed),
        futureValue: Math.round(balance),
        inflationAdjustedValue: Math.round(inflationAdjustedValue),
        dataPoints,
      };
      
      setInfResult(res);
      setSimulation(res);
    }
  }, [infAmount, infYears, infType, activeTab, currentInfRate]);

  const breakEvenYear = () => {
    const rate = INVESTMENT_RATES[infType];
    if (rate <= currentInfRate) return null;
    
    // Simple approximation for break-even (when returns > inflation)
    for (const dp of infResult.dataPoints) {
      const realValue = dp.amount / Math.pow(1 + currentInfRate, dp.year);
      if (realValue > dp.contributions) return dp.year;
    }
    return null;
  };

  const generateCurrencyData = () => {
    const months = Number(curYears) * 12;
    const monthlyNgn = Number(curAmount) || 0;
    const ngnRate = INVESTMENT_RATES.mutual / 12;
    const usdRate = 0.05 / 12; // 5% USD return
    const monthlyDevaluation = (curDevaluation / 100) / 12;

    let ngnBalance = 0;
    let usdBalanceInNgn = 0;
    const dataPoints = [];

    for (let i = 1; i <= months; i++) {
      ngnBalance = (ngnBalance + monthlyNgn) * (1 + ngnRate);
      
      // For USD, we convert NGN to USD at current rate, invest it, then convert back to NGN at new rate
      // Simplified: The NGN value of the USD investment grows by both the USD return AND the devaluation rate
      usdBalanceInNgn = (usdBalanceInNgn + monthlyNgn) * (1 + usdRate) * (1 + monthlyDevaluation);

      if (i % 12 === 0) {
        dataPoints.push({
          year: i / 12,
          ngnValue: Math.round(ngnBalance),
          usdValue: Math.round(usdBalanceInNgn),
        });
      }
    }
    return dataPoints;
  };

  const calculateRequiredMonthly = () => {
    const target = Number(goalAmount) || 0;
    const years = Number(goalYears) || 1;
    const rate = INVESTMENT_RATES[goalType];
    const monthlyRate = rate / 12;
    const months = years * 12;
    
    // FV = P * [ ( (1 + r)^n - 1 ) / r ]
    // P = FV * r / [ (1 + r)^n - 1 ]
    if (monthlyRate === 0) return target / months;
    const required = (target * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(required);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display mb-2">Financial Simulators</h1>
        <p className="text-muted-foreground text-lg">Test your strategies against real-world economic conditions.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-secondary/50 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('inflation')}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'inflation' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          }`}
        >
          <TrendingDown className="w-4 h-4 mr-2" />
          Inflation Stress Test
        </button>
        <button
          onClick={() => setActiveTab('currency')}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'currency' ? 'bg-indigo-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          }`}
        >
          <Calculator className="w-4 h-4 mr-2" />
          Naira vs Dollar
        </button>
        <button
          onClick={() => setActiveTab('goal')}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'goal' ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          }`}
        >
          <Target className="w-4 h-4 mr-2" />
          Goal Planner
        </button>
      </div>

      {activeTab === 'inflation' && (
        <div className="flex flex-col md:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="w-full md:w-1/3 h-fit border-primary/20">
            <CardHeader>
              <CardTitle>Parameters</CardTitle>
              <CardDescription>See how inflation eats into your returns.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Investment Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['treasury', 'mutual', 'stocks'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setInfType(t)}
                      className={`p-2 rounded-md text-[10px] font-bold transition-all border flex items-center justify-center gap-1 ${
                        infType === t 
                          ? 'bg-primary text-white border-primary ring-2 ring-primary/20' 
                          : 'bg-transparent border-white/10 hover:bg-white/5 text-muted-foreground'
                      }`}
                    >
                      {infType === t && <Check className="w-3 h-3" />}
                      {t === 'treasury' ? 'T-Bills' : t === 'mutual' ? 'Mutual' : 'Stocks'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  variant="outline" 
                  className="w-full border-amber-500/30 text-amber-500 hover:bg-amber-500/10 text-xs h-9"
                  onClick={() => setCurrentInfRate(0.30)}
                >
                  <Zap className="w-3 h-3 mr-2" />
                  What if inflation hits 30%?
                </Button>
                {currentInfRate !== INFLATION_RATE && (
                  <button 
                    onClick={() => setCurrentInfRate(INFLATION_RATE)}
                    className="text-[10px] text-muted-foreground hover:text-foreground mt-2 block mx-auto underline"
                  >
                    Reset to current rate (15.06%)
                  </button>
                )}
              </div>

              <Input
                label="Monthly Contribution (₦)"
                type="number"
                value={infAmount}
                onChange={(e) => setInfAmount(e.target.value === '' ? '' : Number(e.target.value))}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Duration: {infYears} Years</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={infYears}
                  onChange={(e) => setInfYears(Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </CardContent>
          </Card>

          <div className="w-full md:w-2/3 space-y-6">
            <Card className="border-primary/20 relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Nominal vs Real Value</CardTitle>
                {breakEvenYear() && (
                  <div className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-500/20">
                    Break-even with inflation at Year {breakEvenYear()}
                  </div>
                )}
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={infResult.dataPoints}>
                    <defs>
                      <linearGradient id="colorNominal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                    <XAxis dataKey="year" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" tickFormatter={(value) => `₦${value/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Area type="monotone" dataKey="amount" stroke="#2563EB" fillOpacity={1} fill="url(#colorNominal)" name="Nominal Value" />
                    <Area type="monotone" dataKey="contributions" stroke="#10B981" fillOpacity={0} name="Total Contributions" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="pt-6">
                  <p className="text-sm font-semibold uppercase text-muted-foreground">Nominal Value</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{formatCurrency(infResult.futureValue)}</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-500/10 border-amber-500/20 relative group">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold uppercase text-amber-500/80">Real Purchasing Power</p>
                      <p className="text-3xl font-bold text-amber-500 mt-2">{formatCurrency(infResult.inflationAdjustedValue)}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <p className="text-xs text-muted-foreground">Adjusted for {Math.round(currentInfRate * 10000) / 100}% inflation</p>
                        <div className="relative group/info">
                          <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                          <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded shadow-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-50 border border-border">
                            Based on current Nigerian inflation rate (CBN data, March 2026).
                          </div>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsShareModalOpen(true)}
                      className="p-2 bg-amber-500/10 text-amber-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-500/20"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Share Plan Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-xl font-bold font-display">Share Your Plan</h3>
                <button onClick={() => setIsShareModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden aspect-[4/3] flex flex-col justify-between">
                  <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <TrendingDown className="w-48 h-48" />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                        <Calculator className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-bold tracking-widest text-xs uppercase opacity-80">VuraNaija Plan</span>
                    </div>
                    
                    <h4 className="text-2xl font-bold leading-tight mb-2">
                      My VuraNaija Plan: {formatCurrency(Number(infAmount))} / month for {infYears} years
                    </h4>
                    <p className="text-white/80 text-lg font-bold">
                      = {formatCurrency(infResult.inflationAdjustedValue)} real wealth
                    </p>
                    <p className="text-white/60 text-xs mt-2 italic">(After adjusting for inflation)</p>
                  </div>

                  <div className="relative z-10 flex justify-between items-end">
                    <div className="text-[10px] uppercase tracking-widest opacity-60">
                      Beat the inflation with VuraNaija
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => {
                      const text = `My VuraNaija Plan: ${formatCurrency(Number(infAmount))}/month for ${infYears} years = ${formatCurrency(infResult.inflationAdjustedValue)} real wealth (after inflation) 🚀`;
                      if (navigator.share) {
                        navigator.share({
                          title: 'My VuraNaija Plan',
                          text: text,
                          url: window.location.origin
                        }).catch(console.error);
                      } else {
                        navigator.clipboard.writeText(text);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }
                    }}
                  >
                    {isCopied ? <Check className="w-4 h-4 mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
                    {isCopied ? 'Copied!' : 'Share Plan'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeTab === 'currency' && (
        <div className="flex flex-col md:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="w-full md:w-1/3 h-fit border-indigo-500/20">
            <CardHeader>
              <CardTitle>Naira vs Dollar</CardTitle>
              <CardDescription>Compare saving in NGN vs USD.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Input
                label="Monthly Savings (₦)"
                type="number"
                value={curAmount}
                onChange={(e) => setCurAmount(e.target.value === '' ? '' : Number(e.target.value))}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Est. Annual Naira Devaluation: {curDevaluation}%</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={curDevaluation}
                  onChange={(e) => setCurDevaluation(Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Duration: {curYears} Years</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={curYears}
                  onChange={(e) => setCurYears(Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </CardContent>
          </Card>

          <div className="w-full md:w-2/3 space-y-6">
            <Card className="border-indigo-500/20">
              <CardHeader>
                <CardTitle>Portfolio Value (in NGN)</CardTitle>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateCurrencyData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                    <XAxis dataKey="year" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" tickFormatter={(value) => `₦${value/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="usdValue" stroke="#6366F1" strokeWidth={3} name="Saved in USD (5% return)" />
                    <Line type="monotone" dataKey="ngnValue" stroke="#10B981" strokeWidth={3} name="Saved in NGN (16% return)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'goal' && (
        <div className="flex flex-col md:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="w-full md:w-1/3 h-fit border-emerald-500/20">
            <CardHeader>
              <CardTitle>Goal Planner</CardTitle>
              <CardDescription>Work backwards to reach your target.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Input
                label="Target Amount (₦)"
                type="number"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value === '' ? '' : Number(e.target.value))}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Timeline: {goalYears} Years</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={goalYears}
                  onChange={(e) => setGoalYears(Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Investment Vehicle</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['treasury', 'mutual', 'stocks'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setGoalType(t)}
                      className={`p-2 rounded-md text-xs font-medium transition-colors border ${
                        goalType === t 
                          ? 'bg-emerald-500 text-white border-emerald-500' 
                          : 'bg-transparent border-white/10 hover:bg-white/5'
                      }`}
                    >
                      {t === 'treasury' ? 'T-Bills' : t === 'mutual' ? 'Mutual Funds' : 'Stocks'}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="w-full md:w-2/3">
            <Card className="h-full border-emerald-500/20 bg-emerald-500/5 flex flex-col items-center justify-center p-8 text-center">
              <Target className="w-16 h-16 text-emerald-500 mb-6" />
              <h3 className="text-2xl font-display font-bold mb-2">To reach {formatCurrency(Number(goalAmount) || 0)} in {goalYears} years...</h3>
              <p className="text-muted-foreground mb-8">You need to invest this amount every month:</p>
              
              <div className="text-5xl font-bold text-emerald-500 mb-8">
                {formatCurrency(calculateRequiredMonthly())}
              </div>

              <div className="flex items-center text-sm text-muted-foreground bg-background/50 px-4 py-2 rounded-full border border-white/10">
                <TrendingDown className="w-4 h-4 mr-2 text-amber-500" />
                Note: This does not account for inflation. You may need more to maintain purchasing power.
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
