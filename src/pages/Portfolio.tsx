import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { calculatePortfolioProjection, INVESTMENT_RATES, INFLATION_RATE, MARKET_SCENARIOS } from '@/lib/finance';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar
} from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, History, ArrowUpRight, Rocket, Wallet, Info, AlertCircle, Sparkles, RotateCcw, X, Share2, Check, Copy, Zap, CloudRain, Flame, ShieldCheck, ArrowRight } from 'lucide-react';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6'];

export default function Portfolio() {
  const { portfolio, profile, hasOnboarded, simulateTime, resetSimulation, sellAsset } = useUser();
  const [includeContributions, setIncludeContributions] = useState(true);
  const [isInflationAdjusted, setIsInflationAdjusted] = useState(false);
  const [marketScenario, setMarketScenario] = useState<keyof typeof MARKET_SCENARIOS>('stable');
  const [customMonthlyContribution, setCustomMonthlyContribution] = useState<number>(profile?.monthlySavingsCapacity || 0);
  const [isRebalanced, setIsRebalanced] = useState(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isRiskCopied, setIsRiskCopied] = useState(false);
  
  // Update custom contribution when profile changes
  useEffect(() => {
    if (profile?.monthlySavingsCapacity) {
      setCustomMonthlyContribution(profile.monthlySavingsCapacity);
    }
  }, [profile?.monthlySavingsCapacity]);
  
  // Sell Modal State
  const [selectedAssetToSell, setSelectedAssetToSell] = useState<{ id: string, name: string, amount: number } | null>(null);
  const [sellAmount, setSellAmount] = useState('');
  const [isSelling, setIsSelling] = useState(false);
  
  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const AnimatedNumber = ({ value, prefix = '₦', isUsd = false }: { value: number, prefix?: string, isUsd?: boolean }) => {
    const motionValue = useMotionValue(0);
    const displayValue = useTransform(motionValue, (latest) => {
      const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      return `${prefix}${formatter.format(latest)}`;
    });

    useEffect(() => {
      const animation = animate(motionValue, value, { duration: 1.5, ease: "easeOut" });
      return animation.stop;
    }, [value]);

    return <motion.span className="font-mono tracking-tighter">{displayValue}</motion.span>;
  };

  // Reset simulation when leaving the page
  useEffect(() => {
    return () => {
      resetSimulation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSell = () => {
    const amount = parseFloat(sellAmount);
    if (isNaN(amount) || amount <= 0 || !selectedAssetToSell) return;
    if (amount > selectedAssetToSell.amount) return; // Cannot sell more than owned
    
    setIsSelling(true);
    setTimeout(() => {
      sellAsset(selectedAssetToSell.id, amount);
      setIsSelling(false);
      setSelectedAssetToSell(null);
      setSellAmount('');
    }, 1000); // Simulate network delay
  };

  if (!hasOnboarded || !portfolio) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <h2 className="text-3xl font-bold">Portfolio Tracking</h2>
        <p className="text-muted-foreground max-w-md">Complete your profile to see your personalized portfolio breakdown.</p>
      </div>
    );
  }

  if (portfolio.assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Wallet className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold font-display">Your Portfolio is Empty</h2>
        <p className="text-muted-foreground max-w-md text-lg">
          You haven't made any investments yet. Head over to the market to put your wealth to work.
        </p>
        <Link to="/market">
          <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-xl font-medium mt-4">
            Explore Market
          </button>
        </Link>
      </div>
    );
  }

  const assetData = portfolio.assets.map(asset => ({
    name: asset.name,
    value: asset.amount
  }));

  const monthlyContribution = includeContributions ? customMonthlyContribution : 0;
  const scenario = MARKET_SCENARIOS[marketScenario];
  
  // Calculate projections
  let projectionData = calculatePortfolioProjection(portfolio, monthlyContribution, 5, scenario.rateModifier);
  let conservativeData = calculatePortfolioProjection(portfolio, monthlyContribution, 5, scenario.rateModifier * 0.7);
  let optimisticData = calculatePortfolioProjection(portfolio, monthlyContribution, 5, scenario.rateModifier * 1.3);

  // Apply inflation adjustment if toggled
  if (isInflationAdjusted) {
    const currentInflation = INFLATION_RATE * scenario.inflationModifier;
    const adjustForInflation = (data: any[]) => data.map(d => ({
      ...d,
      value: d.value / Math.pow(1 + currentInflation, d.month / 12),
      returns: d.returns / Math.pow(1 + currentInflation, d.month / 12)
    }));
    
    projectionData = adjustForInflation(projectionData);
    conservativeData = adjustForInflation(conservativeData);
    optimisticData = adjustForInflation(optimisticData);
  }

  const finalDataPoint = projectionData[projectionData.length - 1];
  const fiveYearValue = finalDataPoint.value;
  const totalContributions = finalDataPoint.contributions;
  const totalInvestmentReturns = finalDataPoint.returns;

  const conservativeValue = conservativeData[conservativeData.length - 1].value;
  const optimisticValue = optimisticData[optimisticData.length - 1].value;

  // Calculate weighted average rate for assumptions display
  const totalWeight = portfolio.assets.reduce((sum, a) => sum + a.amount, 0);
  const weightedRate = totalWeight > 0 
    ? portfolio.assets.reduce((sum, a) => {
        const rate = INVESTMENT_RATES[a.type as keyof typeof INVESTMENT_RATES] || 0;
        return sum + (rate * (a.amount / totalWeight));
      }, 0)
    : 0.10; // Default to 10% if portfolio is empty

  const totalReturns = portfolio.assets.reduce((sum, asset) => {
    const rate = INVESTMENT_RATES[asset.type as keyof typeof INVESTMENT_RATES] || 0;
    return sum + (asset.amount * rate);
  }, 0);

  // Generate a simple AI insight based on the portfolio
  const getAIInsight = () => {
    if (portfolio.assets.length === 0) return "Start investing to get personalized insights.";
    const highestAllocation = portfolio.assets.reduce((prev, current) => (prev.amount > current.amount) ? prev : current, portfolio.assets[0]);
    const highestPct = ((highestAllocation.amount / portfolio.totalValue) * 100).toFixed(0);
    
    if (highestAllocation.type === 'crypto') {
      return `Your portfolio is highly aggressive with ${highestPct}% in Crypto. Consider diversifying into FGN Bonds or Real Estate to protect your wealth from high volatility.`;
    } else if (highestAllocation.type === 'cash' || highestAllocation.type === 'treasury') {
      return `You have a very safe portfolio with ${highestPct}% in ${highestAllocation.name}. This is great for capital preservation, but you might be missing out on higher returns from Nigerian Stocks or Real Estate to beat inflation.`;
    } else if (highestAllocation.type === 'stocks') {
      return `Your portfolio is growth-focused with ${highestPct}% in Equities. Ensure you have an adequate emergency fund in Cash or Money Market funds to weather market downturns.`;
    } else {
      return `Your portfolio looks well-diversified. Keep up your monthly contributions of ${formatCurrency(monthlyContribution)} to reach your 5-year goal of ${formatCurrency(fiveYearValue)}.`;
    }
  };

  // Stress Test Calculations
  const calculateCrashImpact = (assets: any[]) => {
    return assets.reduce((sum, a) => {
      if (a.type === 'stocks') return sum + (a.amount * 0.40);
      if (a.type === 'crypto') return sum + (a.amount * 0.70);
      if (a.type === 'realestate') return sum + (a.amount * 0.25);
      if (a.type === 'mutual') return sum + (a.amount * 0.15);
      return sum;
    }, 0);
  };

  const calculateCryptoImpact = (assets: any[]) => {
    return assets.filter(a => a.type === 'crypto').reduce((sum, a) => sum + (a.amount * 0.80), 0);
  };

  const calculateSafetyFloor = (assets: any[]) => {
    return assets.filter(a => ['treasury', 'cash'].includes(a.type)).reduce((sum, a) => sum + a.amount, 0);
  };

  const currentCrashImpact = calculateCrashImpact(portfolio.assets);
  const currentCryptoImpact = calculateCryptoImpact(portfolio.assets);
  const currentSafetyFloor = calculateSafetyFloor(portfolio.assets);
  const riskScore = Math.min(10, Math.ceil((currentCrashImpact / portfolio.totalValue) * 25));

  // Hypothetical Rebalanced Portfolio (60% Safe, 40% Risky)
  const rebalancedAssets = [
    { type: 'treasury', amount: portfolio.totalValue * 0.4, name: 'FGN Savings Bonds' },
    { type: 'cash', amount: portfolio.totalValue * 0.2, name: 'PiggyVest Flex' },
    { type: 'stocks', amount: portfolio.totalValue * 0.2, name: 'MTN Shares' },
    { type: 'mutual', amount: portfolio.totalValue * 0.15, name: 'Stanbic Mutual' },
    { type: 'crypto', amount: portfolio.totalValue * 0.05, name: 'Bitcoin' },
  ];

  const rebalancedCrashImpact = calculateCrashImpact(rebalancedAssets);
  const rebalancedSafetyFloor = calculateSafetyFloor(rebalancedAssets);

  const activeAssets = isRebalanced ? rebalancedAssets : portfolio.assets;
  const activeCrashImpact = isRebalanced ? rebalancedCrashImpact : currentCrashImpact;
  const activeSafetyFloor = isRebalanced ? rebalancedSafetyFloor : currentSafetyFloor;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display mb-2">{profile.name ? `${profile.name}'s Portfolio` : 'My Portfolio'}</h1>
          <p className="text-muted-foreground text-lg">Real-time tracking of your wealth. 📈</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {portfolio.originalPortfolio && (
            <div className="group/tooltip relative">
              <Button 
                variant="outline" 
                onClick={resetSimulation}
                className="shrink-0 bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Simulation
              </Button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 border border-border leading-relaxed pointer-events-none text-center font-normal">
                Reset your portfolio to its original state.
              </div>
            </div>
          )}
          <div className="group/tooltip relative">
            <Button 
              variant="outline" 
              onClick={() => setIsInflationAdjusted(!isInflationAdjusted)}
              className={`shrink-0 ${isInflationAdjusted ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20' : 'bg-background hover:bg-muted'}`}
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              {isInflationAdjusted ? 'Real Returns (Inflation Adj.)' : 'Nominal Returns'}
            </Button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 border border-border leading-relaxed pointer-events-none text-center font-normal">
              {isInflationAdjusted ? "Showing values adjusted for inflation (buying power)." : "Showing standard values without inflation adjustment."}
            </div>
          </div>
          <div className="group/tooltip relative">
            <Button 
              variant="outline" 
              onClick={() => simulateTime(1)}
              className="shrink-0 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Simulate 1 Year Growth
            </Button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 border border-border leading-relaxed pointer-events-none text-center font-normal">
              Fast-forward 12 months to see how your portfolio grows.
            </div>
          </div>
        </div>
      </div>

      {isInflationAdjusted && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3"
        >
          <div className="group/eli5 relative">
            <Info className="w-5 h-5 text-amber-500 shrink-0 cursor-help" />
            <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-popover text-popover-foreground text-xs rounded-xl shadow-2xl opacity-0 invisible group-hover/eli5:opacity-100 group-hover/eli5:visible transition-all z-50 border border-border leading-relaxed pointer-events-none">
              <div className="font-bold mb-1 text-primary text-[10px] uppercase tracking-wider">Explain Like I'm 5:</div>
              Imagine your ₦1,000 buying 4 loaves of bread today, but only 3 loaves next year. That's <strong>Inflation</strong> eating your money's power.
            </div>
          </div>
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            <strong>Inflation Reality Check:</strong> Showing values adjusted for Nigeria's 15.06% inflation. This represents the actual "buying power" of your money in 5 years.
          </p>
        </motion.div>
      )}

      {/* Market Scenario Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {(Object.entries(MARKET_SCENARIOS) as [keyof typeof MARKET_SCENARIOS, typeof MARKET_SCENARIOS['stable']][]).map(([key, s]) => (
          <button
            key={key}
            onClick={() => setMarketScenario(key)}
            className={`p-4 rounded-2xl border-2 transition-all text-left relative group/scenario ${
              marketScenario === key 
                ? 'border-primary bg-primary/5 ring-4 ring-primary/10' 
                : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${s.bg}`}>
                {key === 'stable' && <TrendingUp className={`w-4 h-4 ${s.color}`} />}
                {key === 'bull' && <Zap className={`w-4 h-4 ${s.color}`} />}
                {key === 'bear' && <CloudRain className={`w-4 h-4 ${s.color}`} />}
                {key === 'crisis' && <Flame className={`w-4 h-4 ${s.color}`} />}
              </div>
              <div className="group/tooltip relative z-10">
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-[100] border border-border leading-relaxed pointer-events-none">
                  {key === 'stable' && "Standard market conditions with historical average returns."}
                  {key === 'bull' && "Optimistic market with high growth and investor confidence."}
                  {key === 'bear' && "Pessimistic market with declining prices and low confidence."}
                  {key === 'crisis' && "Extreme volatility or economic downturn (e.g. high inflation)."}
                </div>
              </div>
            </div>
            <h4 className="font-bold text-sm mb-1">{s.name}</h4>
            <p className="text-xs text-muted-foreground leading-tight">{s.description}</p>
            
            {/* Visual indicator for rate impact */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.rateModifier / 1.25) * 100}%` }}
                  className={`h-full ${s.color.replace('text-', 'bg-')}`}
                />
              </div>
              <span className={`text-[10px] font-bold ${s.color}`}>
                {s.rateModifier > 1 ? '+' : s.rateModifier < 1 ? '-' : ''}
                {Math.abs(Math.round((s.rateModifier - 1) * 100))}% Yield
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20 hover:-translate-y-1 transition-transform duration-300">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Total Portfolio Value</p>
                  <div className="group/tooltip relative z-10">
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-[100] border border-border leading-relaxed pointer-events-none text-center">
                      The current total market value of all your assets.
                    </div>
                  </div>
                </div>
                <div className="text-4xl font-bold font-display text-foreground mt-2">
                  <AnimatedNumber value={portfolio.totalValue} />
                </div>
              </div>
              <div className="p-3 bg-primary/20 rounded-2xl">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 hover:-translate-y-1 transition-transform duration-300">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Est. 1Y Returns</p>
                  <div className="group/tooltip relative z-10">
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-[100] border border-border leading-relaxed pointer-events-none text-center">
                      Estimated earnings over the next 12 months based on current market scenario.
                    </div>
                  </div>
                </div>
                <div className="text-4xl font-bold font-display text-emerald-500 dark:text-emerald-400 mt-2">
                  +<AnimatedNumber value={totalReturns} />
                </div>
              </div>
              <div className="p-3 bg-emerald-500/20 rounded-2xl">
                <ArrowUpRight className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border-indigo-500/20 hover:-translate-y-1 transition-transform duration-300 relative group">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">5-Year Forecast</p>
                  <div className="group/tooltip relative z-10">
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-[100] border border-border leading-relaxed pointer-events-none text-center">
                      Projected value based on your current portfolio and monthly contributions.
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsShareModalOpen(true)}
                    className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-500/20"
                    title="Share Goal"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-4xl font-bold font-display text-indigo-500 dark:text-indigo-400 mt-2">
                  <AnimatedNumber value={fiveYearValue} />
                </div>
              </div>
              <div className="p-3 bg-indigo-500/20 rounded-2xl">
                <Rocket className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stress Test Section */}
      <Card className={`border-red-500/20 bg-red-500/5 transition-all duration-500 ${isRebalanced ? 'border-emerald-500/20 bg-emerald-500/5' : ''}`}>
        <CardHeader className={`border-b border-red-500/10 pb-4 flex flex-row items-center justify-between ${isRebalanced ? 'border-emerald-500/10' : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${isRebalanced ? 'bg-emerald-500' : 'bg-red-500'}`}>
              {isRebalanced ? <ShieldCheck className="w-5 h-5 text-white" /> : <AlertCircle className="w-5 h-5 text-white" />}
            </div>
            <div>
              <CardTitle className="text-xl font-bold font-display">
                {isRebalanced ? 'Rebalanced Portfolio Resilience' : 'Portfolio Stress Test'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isRebalanced ? 'See how your recommended allocation handles the crash.' : 'How would your wealth handle a sudden market crash?'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsRiskModalOpen(true)}
              className="border-primary/20 hover:bg-primary/10"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Risk Score
            </Button>
            <Button 
              variant={isRebalanced ? "default" : "outline"}
              size="sm"
              onClick={() => setIsRebalanced(!isRebalanced)}
              className={isRebalanced ? "bg-emerald-600 hover:bg-emerald-700" : "border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10"}
            >
              {isRebalanced ? <RotateCcw className="w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              {isRebalanced ? 'Reset to Actual' : 'Rebalance My Portfolio'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className={`grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x ${isRebalanced ? 'divide-emerald-500/10' : 'divide-red-500/10'}`}>
            <div className="p-6 space-y-4">
              <div className={`flex items-center justify-between font-bold uppercase tracking-widest text-[10px] ${isRebalanced ? 'text-emerald-500' : 'text-red-500'}`}>
                <div className="flex items-center gap-2">
                  <Flame className="w-3 h-3" /> 2008 Style Crash
                </div>
                <div className="group/tooltip relative z-10">
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-[100] border border-border leading-relaxed pointer-events-none normal-case font-normal">
                    Simulates a global recession where stocks drop 40% and real estate 25%.
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Global financial crisis scenario. Stocks drop 40%, real estate stagnates, but T-Bills remain safe havens.
              </p>
              <div className="pt-2">
                <p className="text-xs font-medium mb-1 text-muted-foreground">Impact on Portfolio:</p>
                <div className={`text-2xl font-bold transition-colors ${isRebalanced ? 'text-emerald-500' : 'text-red-500'}`}>
                  -<AnimatedNumber value={activeCrashImpact} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Estimated {Math.round((activeCrashImpact / portfolio.totalValue) * 100)}% total value drop.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-amber-500 font-bold uppercase tracking-widest text-[10px]">
                <div className="flex items-center gap-2">
                  <CloudRain className="w-3 h-3" /> Crypto Winter
                </div>
                <div className="group/tooltip relative z-10">
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-[100] border border-border leading-relaxed pointer-events-none normal-case font-normal">
                    Simulates an 80% crash in digital assets while traditional markets remain stable.
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sudden 80% drop in crypto assets. High volatility period for digital assets while traditional markets stay flat.
              </p>
              <div className="pt-2">
                <p className="text-xs font-medium mb-1 text-muted-foreground">Impact on Portfolio:</p>
                <div className="text-2xl font-bold text-amber-500">
                  -<AnimatedNumber value={isRebalanced ? (portfolio.totalValue * 0.05 * 0.8) : currentCryptoImpact} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {isRebalanced 
                    ? `Based on recommended 5% crypto exposure.`
                    : portfolio.assets.some(a => a.type === 'crypto') 
                      ? `Based on your ${formatCurrency(portfolio.assets.filter(a => a.type === 'crypto').reduce((sum, a) => sum + a.amount, 0))} crypto exposure.`
                      : 'No crypto exposure detected. You are safe!'}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-blue-500 font-bold uppercase tracking-widest text-[10px]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3" /> Vura Resilience
                </div>
                <div className="group/tooltip relative z-10">
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-[100] border border-border leading-relaxed pointer-events-none normal-case font-normal">
                    The portion of your portfolio in guaranteed or low-risk assets like T-Bills and Cash.
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                How VuraNaija's diversification protects you. Even in a crash, your T-Bills and Cash provide a solid floor.
              </p>
              <div className="pt-2">
                <p className="text-xs font-medium mb-1 text-muted-foreground">Your "Safety Floor":</p>
                <div className="text-2xl font-bold text-emerald-500">
                  <AnimatedNumber value={activeSafetyFloor} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">This amount is considered "Low Risk" and highly resilient.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights Card */}
      <Card className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-indigo-500/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-500/20 rounded-2xl shrink-0">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">AI Portfolio Coach</h3>
              <p className="text-muted-foreground leading-relaxed">
                {getAIInsight()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Rebalance Report */}
      <AnimatePresence>
        {isRebalanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-2xl shadow-emerald-500/10">
              <CardHeader className="border-b border-emerald-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500 rounded-lg">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold font-display">The Vura "Perfect Mix" Report</CardTitle>
                      <p className="text-sm text-muted-foreground">A breakdown of your optimized wealth distribution.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Optimization Level</p>
                    <p className="text-lg font-bold text-foreground">Maximum Resilience</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Side by Side Comparison */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <History className="w-4 h-4" /> Current vs Recommended
                    </h4>
                    
                    <div className="space-y-4">
                      {[
                        { type: 'treasury', name: 'Safe Havens (Bonds)', color: 'bg-blue-500', target: 40 },
                        { type: 'cash', name: 'Liquidity (Cash)', color: 'bg-indigo-500', target: 20 },
                        { type: 'stocks', name: 'Growth (Stocks)', color: 'bg-emerald-500', target: 20 },
                        { type: 'mutual', name: 'Diversified (Mutual)', color: 'bg-purple-500', target: 15 },
                        { type: 'crypto', name: 'High Risk (Crypto)', color: 'bg-amber-500', target: 5 },
                      ].map((item) => {
                        const currentAmount = portfolio.assets
                          .filter(a => a.type === item.type)
                          .reduce((sum, a) => sum + a.amount, 0);
                        const currentPct = (currentAmount / portfolio.totalValue) * 100;
                        
                        return (
                          <div key={item.type} className="space-y-2">
                            <div className="flex justify-between items-end">
                              <span className="text-xs font-bold text-foreground">{item.name}</span>
                              <div className="flex items-center gap-2 text-[10px] font-mono">
                                <span className="text-muted-foreground">{currentPct.toFixed(0)}%</span>
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                <span className="text-emerald-500 font-bold">{item.target}%</span>
                              </div>
                            </div>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex">
                              <div 
                                className={`h-full ${item.color} opacity-40 transition-all duration-1000`}
                                style={{ width: `${currentPct}%` }}
                              />
                              <div 
                                className={`h-full ${item.color} transition-all duration-1000 border-l border-white/20`}
                                style={{ width: `${Math.max(0, item.target - currentPct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-4 bg-background/50 rounded-xl border border-border/50">
                      <p className="text-xs text-muted-foreground italic">
                        * This rebalance moves <strong>{formatCurrency(portfolio.totalValue * 0.6)}</strong> into low-risk assets to ensure you never lose more than 15% of your total wealth in a single year.
                      </p>
                    </div>
                  </div>

                  {/* Why this works */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Why this works
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex gap-4 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-foreground">The 60% Safety Net</h5>
                          <p className="text-xs text-muted-foreground mt-1">By keeping 60% in T-Bills and Cash, you create a "Safety Floor" that inflation can't easily touch and crashes can't break.</p>
                        </div>
                      </div>

                      <div className="flex gap-4 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                          <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-foreground">Controlled Growth</h5>
                          <p className="text-xs text-muted-foreground mt-1">20% in Stocks and 15% in Mutual Funds ensures you still capture the upside of the Nigerian economy without betting the farm.</p>
                        </div>
                      </div>

                      <div className="flex gap-4 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-foreground">Volatility Cap</h5>
                          <p className="text-xs text-muted-foreground mt-1">Limiting Crypto to 5% means you enjoy the "moon shots" but a 90% crypto crash only impacts your total wealth by 4.5%.</p>
                        </div>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 rounded-2xl shadow-lg shadow-emerald-500/20"
                      onClick={() => setIsRebalanced(false)}
                    >
                      Apply This Strategy Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scenario Comparison Chart */}
      <Card className="bg-background/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <CardTitle className="text-lg font-bold">5-Year Forecast Comparison</CardTitle>
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-secondary/50 px-2 py-1 rounded">
            Based on Current Strategy
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Object.entries(MARKET_SCENARIOS).map(([key, s]) => {
                  const projection = calculatePortfolioProjection(
                    portfolio,
                    customMonthlyContribution,
                    5,
                    s.rateModifier
                  );
                  return {
                    name: s.name,
                    value: projection[projection.length - 1].value,
                    color: key === 'stable' ? '#6366F1' : key === 'bull' ? '#10B981' : key === 'bear' ? '#F59E0B' : '#EF4444'
                  };
                })}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={10} 
                  tickFormatter={(value) => `₦${(value/1000000).toFixed(1)}M`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border border-border p-3 rounded-xl shadow-xl">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{data.name}</p>
                          <p className="text-lg font-bold text-foreground">{formatCurrency(data.value)}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Projected value in 5 years</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="value" 
                  radius={[6, 6, 0, 0]}
                  barSize={60}
                  animationDuration={1000}
                >
                  {Object.entries(MARKET_SCENARIOS).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry[0] === 'stable' ? '#6366F1' : entry[0] === 'bull' ? '#10B981' : entry[0] === 'bear' ? '#F59E0B' : '#EF4444'} 
                      fillOpacity={marketScenario === entry[0] ? 1 : 0.4}
                      className="cursor-pointer transition-all duration-300"
                      onClick={() => setMarketScenario(entry[0] as keyof typeof MARKET_SCENARIOS)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {Object.entries(MARKET_SCENARIOS).map(([key, s]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${key === 'stable' ? 'bg-indigo-500' : key === 'bull' ? 'bg-emerald-500' : key === 'bear' ? 'bg-amber-500' : 'bg-red-500'}`} />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{s.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Allocation Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-primary" />
            <div className="flex items-center gap-2">
              <CardTitle>Asset Allocation</CardTitle>
              <div className="group/tooltip relative z-10">
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-[100] border border-border leading-relaxed pointer-events-none text-center font-normal">
                  How your wealth is distributed across different asset classes.
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {assetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                  itemStyle={{ color: '#E5E7EB' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance History */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <CardTitle>Portfolio Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolio.history}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12} 
                  tickFormatter={(value) => `₦${value/1000000}M`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                  itemStyle={{ color: '#E5E7EB' }}
                  formatter={(value: number) => [formatCurrency(value), 'Value']}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2563EB" 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Contribution History */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-400" />
          <CardTitle>Monthly Contribution History</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={portfolio.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `₦${value/1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                itemStyle={{ color: '#E5E7EB' }}
                formatter={(value: number) => [formatCurrency(value), 'Contribution']}
              />
              <Bar dataKey="contribution" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 5-Year Forecast Section */}
      <Card className="border-indigo-500/20 bg-indigo-500/5">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl mt-1">
              <Rocket className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">5-Year Forecast</CardTitle>
                <div className="group/eli5 relative">
                  <div className="p-1.5 bg-indigo-500/20 rounded-lg cursor-help hover:bg-indigo-500/30 transition-colors">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">ELI5</span>
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-popover text-popover-foreground text-xs rounded-xl shadow-2xl opacity-0 invisible group-hover/eli5:opacity-100 group-hover/eli5:visible transition-all z-50 border border-border leading-relaxed pointer-events-none">
                    <div className="font-bold mb-1 text-primary text-[10px] uppercase tracking-wider">Explain Like I'm 5:</div>
                    Think of your money as a small plant. Every month you add water (contributions), and the plant grows. But then, the new leaves start making their own seeds (interest), which grow into more plants. That's <strong>Compound Interest</strong>!
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Projected Portfolio Value: <span className="font-bold text-foreground text-lg">{formatCurrency(fiveYearValue)}</span>
              </p>
            </div>
          </div>
          
          {/* Projection Mode Toggle */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center bg-background/50 p-1 rounded-xl border border-border">
              <div className="group/tooltip relative">
                <button
                  onClick={() => setIncludeContributions(true)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${includeContributions ? 'bg-indigo-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  With Contributions
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 border border-border leading-relaxed pointer-events-none text-center font-normal">
                  Includes your monthly top-ups in the final projection.
                </div>
              </div>
              <div className="group/tooltip relative">
                <button
                  onClick={() => setIncludeContributions(false)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${!includeContributions ? 'bg-indigo-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  None
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 border border-border leading-relaxed pointer-events-none text-center font-normal">
                  Shows only how your current assets grow without adding more money.
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Dynamic Slider */}
          {includeContributions && (
            <div className="bg-background/40 border border-border/50 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">Adjust Monthly Top-up</h4>
                  <p className="text-xs text-muted-foreground">See how increasing your monthly savings changes your 5-year wealth.</p>
                </div>
                <div className="text-xl font-mono font-bold text-indigo-400">
                  {formatCurrency(customMonthlyContribution)}
                </div>
              </div>
              <input 
                type="range" 
                min="0" 
                max={Math.max(customMonthlyContribution * 5, 1000000)} 
                step="5000"
                value={customMonthlyContribution}
                onChange={(e) => setCustomMonthlyContribution(parseInt(e.target.value))}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                <span>₦0</span>
                <span>₦{Math.max(customMonthlyContribution * 5, 1000000).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-background/50 border border-border rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Your Contributions</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalContributions)}</p>
              </div>
              <div className="w-3 h-12 bg-blue-500 rounded-full"></div>
            </div>
            <div className="bg-background/50 border border-border rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Investment Returns</p>
                <p className="text-2xl font-bold text-emerald-500 dark:text-emerald-400 mt-1">+{formatCurrency(totalInvestmentReturns)}</p>
              </div>
              <div className="w-3 h-12 bg-emerald-500 rounded-full"></div>
            </div>
          </div>

          {/* Growth Chart */}
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData}>
                <defs>
                  <linearGradient id="colorContributions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="#9CA3AF" 
                  fontSize={12} 
                  tickFormatter={(val) => val % 12 === 0 ? `Year ${val/12}` : ''}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12} 
                  tickFormatter={(value) => `₦${value/1000000}M`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                  itemStyle={{ color: '#E5E7EB' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(label) => `Month ${label}`}
                />
                <Legend verticalAlign="top" height={36}/>
                <Area 
                  type="monotone" 
                  dataKey="contributions" 
                  name="Contributions"
                  stroke="#3B82F6" 
                  fillOpacity={1} 
                  fill="url(#colorContributions)" 
                  stackId="1"
                />
                <Area 
                  type="monotone" 
                  dataKey="returns" 
                  name="Investment Returns"
                  stroke="#10B981" 
                  fillOpacity={1} 
                  fill="url(#colorReturns)" 
                  stackId="1"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-indigo-500/20">
            {/* Confidence Range */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">5-Year Projection Range</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Conservative Scenario</span>
                  <span className="font-mono font-medium">{formatCurrency(conservativeValue)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-indigo-400 font-medium">Expected Scenario</span>
                  <span className="font-mono font-bold text-indigo-400">{formatCurrency(fiveYearValue)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Optimistic Scenario</span>
                  <span className="font-mono font-medium">{formatCurrency(optimisticValue)}</span>
                </div>
              </div>
            </div>

            {/* Assumptions */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Projection Assumptions</h4>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <div className="text-muted-foreground">Monthly Investment:</div>
                <div className="font-medium text-right">{formatCurrency(monthlyContribution)}</div>
                
                <div className="text-muted-foreground">Expected Annual Return:</div>
                <div className="font-medium text-right">{(weightedRate * 100).toFixed(1)}%</div>
                
                <div className="text-muted-foreground">Time Horizon:</div>
                <div className="font-medium text-right">5 Years</div>
                
                <div className="text-muted-foreground">Compounding:</div>
                <div className="font-medium text-right">Monthly</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Holdings Breakdown</CardTitle>
            <div className="group relative">
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-popover text-popover-foreground text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 border border-border">
                Your actual investments and their current allocations.
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-sm">
                  <th className="pb-4 font-medium">Asset Name</th>
                  <th className="pb-4 font-medium">Type</th>
                  <th className="pb-4 font-medium">Yield (Est.)</th>
                  <th className="pb-4 font-medium">Amount</th>
                  <th className="pb-4 font-medium">Est. 1Y Return</th>
                  <th className="pb-4 font-medium text-right">Allocation</th>
                  <th className="pb-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {portfolio.assets.map((asset, idx) => (
                  <tr key={asset.id} className="group hover:bg-muted/50 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="font-medium text-foreground">{asset.name}</span>
                      </div>
                    </td>
                    <td className="py-4 capitalize text-sm text-muted-foreground">{asset.type}</td>
                    <td className="py-4 text-sm font-medium text-indigo-400">
                      {(INVESTMENT_RATES[asset.type as keyof typeof INVESTMENT_RATES] * 100).toFixed(1)}%
                    </td>
                    <td className="py-4 font-mono text-sm text-foreground">{formatCurrency(asset.amount)}</td>
                    <td className="py-4">
                      <span className="text-emerald-500 dark:text-emerald-400">
                        +{formatCurrency(asset.amount * (INVESTMENT_RATES[asset.type as keyof typeof INVESTMENT_RATES] || 0))}
                      </span>
                    </td>
                    <td className="py-4 text-right text-sm text-muted-foreground">
                      {((asset.amount / portfolio.totalValue) * 100).toFixed(1)}%
                    </td>
                    <td className="py-4 text-right">
                      <div className="group/tooltip relative inline-block">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-500 border-red-500/20 hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => setSelectedAssetToSell({ id: asset.id, name: asset.name, amount: asset.amount })}
                          disabled={!!portfolio.originalPortfolio}
                        >
                          Sell
                        </Button>
                        {!!portfolio.originalPortfolio && (
                          <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-popover-foreground text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-10 border border-border text-center">
                            Cannot sell during simulation. Reset simulation first.
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Risk Score Modal */}
      <AnimatePresence>
        {isRiskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-xl font-bold font-display">Share Risk Resilience</h3>
                <button onClick={() => setIsRiskModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="bg-gradient-to-br from-red-500 to-orange-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden aspect-[4/3] flex flex-col justify-between">
                  <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <ShieldCheck className="w-48 h-48" />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-bold tracking-widest text-xs uppercase opacity-80">VuraNaija Risk Score</span>
                    </div>
                    
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-6xl font-bold">{riskScore}</span>
                      <span className="text-2xl font-bold opacity-60">/ 10</span>
                    </div>
                    <h4 className="text-xl font-bold leading-tight mb-2">
                      My portfolio can withstand a {Math.round((currentCrashImpact / portfolio.totalValue) * 100)}% market crash.
                    </h4>
                    <p className="text-white/80 text-sm">
                      Resilience Floor: {formatCurrency(currentSafetyFloor)}
                    </p>
                  </div>

                  <div className="relative z-10 flex justify-between items-end">
                    <div className="text-[10px] uppercase tracking-widest opacity-60">
                      How resilient is yours? Check VuraNaija
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => {
                      const text = `My VuraNaija Risk Score: ${riskScore}/10. My portfolio can withstand a ${Math.round((currentCrashImpact / portfolio.totalValue) * 100)}% market crash. How resilient is yours? 🛡️`;
                      if (navigator.share) {
                        navigator.share({
                          title: 'My VuraNaija Risk Score',
                          text: text,
                          url: window.location.origin
                        }).catch(console.error);
                      } else {
                        navigator.clipboard.writeText(text);
                        setIsRiskCopied(true);
                        setTimeout(() => setIsRiskCopied(false), 2000);
                      }
                    }}
                  >
                    {isRiskCopied ? <Check className="w-4 h-4 mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
                    {isRiskCopied ? 'Copied!' : 'Share Risk Score'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Goal Modal */}
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
                <h3 className="text-xl font-bold font-display">Share Your Goal</h3>
                <button onClick={() => setIsShareModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                {/* Shareable Card Preview */}
                <div id="share-card" className="relative bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-2xl overflow-hidden aspect-[4/3] flex flex-col justify-between">
                  <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <Rocket className="w-48 h-48" />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-bold tracking-widest text-xs uppercase opacity-80">VuraNaija Wealth</span>
                    </div>
                    
                    <h4 className="text-2xl font-bold leading-tight mb-2">
                      I'm on track to reach <span className="text-amber-400">{formatCurrency(fiveYearValue)}</span> in 5 years!
                    </h4>
                    <p className="text-white/60 text-sm">Building wealth with VuraNaija's AI-powered portfolio.</p>
                  </div>

                  <div className="relative z-10 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">My Goal</p>
                      <p className="text-lg font-bold">{profile.financialGoal || 'Financial Freedom'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">Status</p>
                      <p className="text-lg font-bold text-emerald-400">Optimized ⚡</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-center text-muted-foreground">
                    Share your progress and inspire others to start their wealth journey!
                  </p>
                  
                  <div className="flex gap-3">
                    <Button 
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => {
                        const text = `I'm on track to reach ${formatCurrency(fiveYearValue)} in 5 years with VuraNaija! 🚀 Check out my financial progress.`;
                        if (navigator.share) {
                          navigator.share({
                            title: 'My VuraNaija Goal',
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
                      {isCopied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share Progress
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const text = `I'm on track to reach ${formatCurrency(fiveYearValue)} in 5 years with VuraNaija! 🚀`;
                        navigator.clipboard.writeText(text);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Text
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedAssetToSell && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-xl font-bold font-display">Sell Asset</h3>
                <button onClick={() => setSelectedAssetToSell(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-500/90 leading-relaxed">
                    This is a <strong>Paper Trading Simulation</strong>. Selling this asset will convert it back to your virtual wallet balance.
                  </p>
                </div>

                <div className="bg-muted/50 rounded-xl p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-medium text-muted-foreground">Available to Sell</span>
                  </div>
                  <span className="text-lg font-bold font-mono">{formatCurrency(selectedAssetToSell.amount)}</span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-foreground">Amount to Sell from {selectedAssetToSell.name}</label>
                    <button 
                      className="text-xs text-primary hover:underline font-medium"
                      onClick={() => setSellAmount(selectedAssetToSell.amount.toString())}
                    >
                      Sell Max
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <input 
                      type="number" 
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value)}
                      placeholder="e.g. 10000"
                      className="w-full bg-background border border-input rounded-xl py-3 pl-8 pr-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  {parseFloat(sellAmount) > selectedAssetToSell.amount && (
                    <p className="text-xs text-red-500 font-medium">You cannot sell more than you own.</p>
                  )}
                </div>

                <Button 
                  className="w-full py-6 text-lg rounded-xl bg-red-500 hover:bg-red-600 text-white"
                  onClick={handleSell}
                  disabled={isSelling || !sellAmount || parseFloat(sellAmount) <= 0 || parseFloat(sellAmount) > selectedAssetToSell.amount}
                >
                  {isSelling ? 'Processing...' : `Confirm Virtual Sell`}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
