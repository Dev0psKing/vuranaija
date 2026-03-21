import { useUser } from '@/context/UserContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Link, useLocation } from 'react-router-dom';
import { TrendingUp, ShieldCheck, BrainCircuit, ArrowRight, CheckCircle, Target, Clock, Wallet, Sparkles, Building2, X, Copy, DollarSign, Globe, Wand2, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { calculateMonthsToGoal, INVESTMENT_RATES } from '@/lib/finance';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useState, useEffect } from 'react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export default function Dashboard() {
  const { profile, healthScore, simulation, portfolio, depositToWallet, withdrawFromWallet, depositToUsdWallet, withdrawFromUsdWallet, convertNgnToUsd, convertUsdToNgn, setSimulation } = useUser();
  const location = useLocation();
  const [smartSweepEnabled, setSmartSweepEnabled] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const [isUsdDepositModalOpen, setIsUsdDepositModalOpen] = useState(false);
  const [usdDepositAmount, setUsdDepositAmount] = useState('');
  const [isUsdDepositing, setIsUsdDepositing] = useState(false);

  useEffect(() => {
    if (location.state?.openUsdDeposit) {
      setIsUsdDepositModalOpen(true);
    }
  }, [location.state]);

  const [isUsdWithdrawModalOpen, setIsUsdWithdrawModalOpen] = useState(false);
  const [usdWithdrawAmount, setUsdWithdrawAmount] = useState('');
  const [isUsdWithdrawing, setIsUsdWithdrawing] = useState(false);

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertAmount, setConvertAmount] = useState('');
  const [convertDirection, setConvertDirection] = useState<'NGN_TO_USD' | 'USD_TO_NGN'>('NGN_TO_USD');
  const [isConverting, setIsConverting] = useState(false);

  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    if (healthScore?.score) {
      const animation = animate(count, healthScore.score, { duration: 1.5, ease: "easeOut" });
      return animation.stop;
    }
  }, [healthScore?.score]);

  const EXCHANGE_RATE = 1356.23; // 1 USD = 1356.23 NGN

  const AnimatedNumber = ({ value, prefix = '₦', isUsd = false }: { value: number, prefix?: string, isUsd?: boolean }) => {
    const motionValue = useMotionValue(0);
    const displayValue = useTransform(motionValue, (latest) => {
      const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${prefix}${formatter.format(latest)}`;
    });

    useEffect(() => {
      const animation = animate(motionValue, value, { duration: 1.5, ease: "easeOut" });
      return animation.stop;
    }, [value]);

    return <motion.span className="font-mono tracking-tighter">{displayValue}</motion.span>;
  };

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    setIsDepositing(true);
    setTimeout(() => {
      depositToWallet(amount);
      setIsDepositing(false);
      setIsDepositModalOpen(false);
      setDepositAmount('');
    }, 1500); // Simulate network delay
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0 || amount > profile.currentSavings) return;
    
    setIsWithdrawing(true);
    setTimeout(() => {
      withdrawFromWallet(amount);
      setIsWithdrawing(false);
      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');
    }, 1500); // Simulate network delay
  };

  const handleUsdDeposit = () => {
    const amount = parseFloat(usdDepositAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    setIsUsdDepositing(true);
    setTimeout(() => {
      depositToUsdWallet(amount);
      setIsUsdDepositing(false);
      setIsUsdDepositModalOpen(false);
      setUsdDepositAmount('');
    }, 1500); // Simulate network delay
  };

  const handleUsdWithdraw = () => {
    const amount = parseFloat(usdWithdrawAmount);
    if (isNaN(amount) || amount <= 0 || amount > (profile.usdSavings || 0)) return;
    
    setIsUsdWithdrawing(true);
    setTimeout(() => {
      withdrawFromUsdWallet(amount, EXCHANGE_RATE);
      setIsUsdWithdrawing(false);
      setIsUsdWithdrawModalOpen(false);
      setUsdWithdrawAmount('');
    }, 1500); // Simulate network delay
  };

  const handleConvert = () => {
    const amount = parseFloat(convertAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    if (convertDirection === 'NGN_TO_USD' && amount > profile.currentSavings) return;
    if (convertDirection === 'USD_TO_NGN' && amount > (profile.usdSavings || 0)) return;

    setIsConverting(true);
    setTimeout(() => {
      if (convertDirection === 'NGN_TO_USD') {
        convertNgnToUsd(amount, EXCHANGE_RATE);
      } else {
        convertUsdToNgn(amount, EXCHANGE_RATE);
      }
      setIsConverting(false);
      setIsConvertModalOpen(false);
      setConvertAmount('');
    }, 1500); // Simulate network delay
  };

  // Calculate Time-to-Goal
  let monthsToGoal = null;
  let optimizedMonthsToGoal = null;
  let hasGoal = !!(profile.financialGoal && profile.goalAmount && profile.goalAmount > 0);

  if (hasGoal && portfolio) {
    // Current trajectory (using current portfolio weighted rate)
    const totalWeight = portfolio.assets.reduce((sum, a) => sum + a.amount, 0);
    const currentRate = totalWeight > 0 
      ? portfolio.assets.reduce((sum, a) => {
          const rate = INVESTMENT_RATES[a.type as keyof typeof INVESTMENT_RATES] || 0;
          return sum + (rate * (a.amount / totalWeight));
        }, 0)
      : 0.10;

    monthsToGoal = calculateMonthsToGoal(
      portfolio.totalValue + (profile.currentSavings || 0),
      profile.monthlySavingsCapacity,
      profile.goalAmount!,
      currentRate
    );

    // Optimized trajectory (assuming they move to a higher yield, e.g., 18% T-Bills)
    optimizedMonthsToGoal = calculateMonthsToGoal(
      portfolio.totalValue + (profile.currentSavings || 0),
      profile.monthlySavingsCapacity,
      profile.goalAmount!,
      0.18 // 18% optimized rate
    );
  }

  if (!profile.monthlyIncome) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6"
      >
        <h2 className="text-3xl font-bold">Welcome to VuraNaija</h2>        <p className="text-muted-foreground max-w-md">Your financial journey starts here. Let's build your profile to unlock insights.</p>
        <Link to="/onboarding">
          <Button size="lg" className="animate-pulse">Start Onboarding</Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants} className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold font-display mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Welcome back{profile.name ? `, ` : ''}<span className="font-semibold text-foreground">{profile.name || ''}</span>! Let's grow your wealth! 🚀
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/portfolio">
            <Button variant="outline" size="md" className="rounded-xl">View Portfolio</Button>
          </Link>
          <Link to="/simulator">
            <Button variant="default" size="md" className="rounded-xl shadow-lg shadow-primary/20">New Simulation</Button>
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Time-to-Goal Card (Replaces Health Score if goal exists, or adds as new row) */}
        {hasGoal ? (
          <motion.div variants={itemVariants} className="col-span-1 md:col-span-1">
            <Card className="h-full border-t-4 border-t-blue-500 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Goal: {profile.financialGoal}</CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <Target className="h-5 w-5 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1">
                  <AnimatedNumber value={profile.goalAmount!} />
                </div>
                
                {monthsToGoal === Infinity ? (
                  <p className="text-sm text-red-500 font-medium flex items-center gap-1 mt-2">
                    <Clock className="w-4 h-4" /> Increase savings to reach this goal.
                  </p>
                ) : monthsToGoal === 0 ? (
                  <p className="text-sm text-emerald-500 font-medium flex items-center gap-1 mt-2">
                    <CheckCircle className="w-4 h-4" /> Goal Achieved! 🎉
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-rose-500 font-medium">Current Path</span>
                        <span className="font-bold text-rose-500">{Math.floor(monthsToGoal! / 12)}y {monthsToGoal! % 12}m</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 w-[60%]" />
                      </div>
                    </div>
                    
                    {optimizedMonthsToGoal && optimizedMonthsToGoal < monthsToGoal! && (
                      <div className="relative">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-emerald-500 font-medium flex items-center gap-1">
                            Optimized Path <Wand2 className="w-3 h-3" />
                          </span>
                          <span className="font-bold text-emerald-500">{Math.floor(optimizedMonthsToGoal / 12)}y {optimizedMonthsToGoal % 12}m</span>
                        </div>
                        <button 
                          onClick={() => {
                            // In a real app, this would trigger a strategy switch
                            alert("Strategy Updated: Your portfolio has been rebalanced to the Optimized Path! 🚀");
                          }}
                          className="w-full h-1.5 bg-secondary rounded-full overflow-hidden hover:ring-2 hover:ring-emerald-500/50 transition-all group"
                        >
                          <div className="h-full bg-emerald-500 w-[80%] group-hover:bg-emerald-400 transition-colors" />
                        </button>
                        <div className="group relative">
                          <p className="text-[10px] text-muted-foreground mt-1 cursor-help flex items-center gap-1">
                            Reach it {monthsToGoal! - optimizedMonthsToGoal} months faster! <Info className="w-3 h-3" />
                          </p>
                          <div className="absolute bottom-full left-0 mb-2 w-56 p-3 bg-popover text-popover-foreground text-[11px] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-border leading-relaxed">
                            <p className="font-bold mb-1 text-emerald-500 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> AI Recommendation
                            </p>
                            Switch to this path by allocating 20% more to High-Yield Funds. Click the bar to apply!
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="col-span-1 md:col-span-1">
            <Card className="h-full border-t-4 border-t-primary hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Health Score</CardTitle>
                <div className="p-2 bg-primary/10 rounded-xl">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold font-display">
                  <motion.span>{rounded}</motion.span>
                  <span className="text-xl text-muted-foreground">/100</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  {healthScore?.level === 'excellent' ? 'Great job! Keep it up. 🌟' : 'Room for improvement. 💪'}
                </p>
                <Link to="/health" className="text-sm text-primary mt-4 inline-flex items-center font-semibold hover:underline">
                  View Breakdown <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Wallet Balance (New) */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-1">
          <Card className="h-full border-t-4 border-t-emerald-500 hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-emerald-500/5 to-transparent relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Building2 className="w-24 h-24" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">NGN Wallet</CardTitle>
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <Wallet className="h-5 w-5 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold">
                <AnimatedNumber value={profile.currentSavings} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Partner Protected
                </span>
                <span className="text-xs text-muted-foreground">via Providus Bank</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsDepositModalOpen(true)}>Deposit</Button>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setIsWithdrawModalOpen(true)}>Withdraw</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* USD Wallet Balance */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-1">
          <Card className="h-full border-t-4 border-t-blue-500 hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-blue-500/5 to-transparent relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Globe className="w-24 h-24" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">USD Wallet</CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold">
                <AnimatedNumber value={profile.usdSavings || 0} prefix="$" isUsd />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-600 dark:text-blue-400">
                  <Globe className="w-3 h-3 mr-1" /> Global Access
                </span>
                <span className="text-xs text-muted-foreground">via Parallax</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsUsdDepositModalOpen(true)}>Deposit</Button>
                <Button size="sm" variant="outline" className="flex-1 border-blue-200 hover:bg-blue-50" onClick={() => setIsUsdWithdrawModalOpen(true)}>Withdraw</Button>
                <Button size="sm" variant="ghost" className="flex-1 text-blue-600 hover:bg-blue-50" onClick={() => setIsConvertModalOpen(true)}>Convert</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Live FX Rate Tracker */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-1">
          <Card className="h-full border-t-4 border-t-amber-500 hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-amber-500/5 to-transparent relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <TrendingUp className="w-24 h-24" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Live FX Rate</CardTitle>
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold font-display">₦{EXCHANGE_RATE.toLocaleString()} <span className="text-lg text-muted-foreground font-normal">/ $1</span></div>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-600 dark:text-red-400">
                  <TrendingUp className="w-3 h-3 mr-1" /> +2.5% this week
                </span>
                <span className="text-xs text-muted-foreground">Parallel Market</span>
              </div>
              <div className="mt-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hedge against inflation by converting your Naira to USD.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Smart Sweep Toggle (New) */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-1">
          <Card className={`h-full border-t-4 transition-all duration-300 relative overflow-hidden ${smartSweepEnabled ? 'border-t-purple-500 bg-purple-500/5' : 'border-t-muted bg-background'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Smart Sweep</CardTitle>
              <div className={`p-2 rounded-xl transition-colors ${smartSweepEnabled ? 'bg-purple-500/20 text-purple-500' : 'bg-muted text-muted-foreground'}`}>
                <Sparkles className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-bold font-display">{smartSweepEnabled ? 'Active' : 'Paused'}</div>
                
                {/* Custom Toggle Switch */}
                <button 
                  onClick={() => setSmartSweepEnabled(!smartSweepEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${smartSweepEnabled ? 'bg-purple-600' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${smartSweepEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              
              <p className="text-xs text-muted-foreground leading-relaxed">
                {smartSweepEnabled 
                  ? "AI is monitoring your connected GTBank account. It will automatically sweep safe amounts based on your spending patterns." 
                  : "Connect your bank to let our AI automatically save what you can afford, without causing overdrafts."}
              </p>
              
              {!smartSweepEnabled && (
                <Button size="sm" variant="outline" className="w-full mt-3 text-xs border-purple-500/30 text-purple-500 hover:bg-purple-500/10">
                  Connect Bank via Mono
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Insight Teaser */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-1">
          <Card className="h-full border-0 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-primary to-pink-500 rounded-full blur-2xl opacity-20" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">AI Coach</CardTitle>
              <div className="p-2 bg-white/50 dark:bg-black/20 rounded-xl backdrop-blur-sm">
                <BrainCircuit className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-lg font-bold font-display mb-2 text-foreground flex items-center gap-2">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  Proactive Insight
                </motion.span>
                <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
              </div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                className="text-sm text-muted-foreground mb-4 font-medium leading-relaxed"
              >
                {profile.name || 'User'}, your {profile.financialGoal || 'Goal'} is only {Math.round(((portfolio.totalValue + (profile.currentSavings || 0)) / (profile.goalAmount || 1)) * 100)}% funded. Let's allocate ₦50k/month to USD assets to beat inflation.
              </motion.p>
              <Link to="/coach">
                <Button size="sm" className="w-full justify-between group rounded-xl bg-foreground text-background hover:bg-foreground/90">
                  Ask Coach <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Active Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div variants={itemVariants} className="h-full">
          <Card className="h-full hover:border-primary/20 transition-colors duration-300">
            <CardHeader>
              <CardTitle>Active Simulation</CardTitle>
            </CardHeader>
            <CardContent>
              {simulation ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-secondary/50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Strategy</p>
                      <p className="font-medium capitalize">{simulation.investmentType} Fund</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Projected Value</p>
                      <p className="font-bold text-primary">{formatCurrency(simulation.futureValue)}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monthly Contribution</span>
                      <span>{formatCurrency(simulation.monthlyContribution)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span>{simulation.durationYears} Years</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Returns</span>
                      <span className="text-emerald-400">+{formatCurrency(simulation.totalReturns)}</span>
                    </div>
                  </div>
                  <Link to="/simulator">
                    <Button className="w-full mt-4" variant="outline">Adjust Simulation</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">Recommended for You</span>
                    </div>
                    <h4 className="font-bold text-sm mb-1">The T-Bill Ladder</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      See how ₦50k/month in Treasury Bills builds a ₦3.2M safety net in 3 years.
                    </p>
                  </div>
                  <Button 
                    className="w-full shadow-lg shadow-primary/20" 
                    onClick={() => {
                      setSimulation({
                        investmentType: 'treasury',
                        monthlyContribution: 50000,
                        durationYears: 3,
                        futureValue: 3200000,
                        totalReturns: 1400000,
                        totalContributions: 1800000
                      });
                    }}
                  >
                    Run Simulation ⚡
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions / Goal */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="h-full hover:border-primary/20 transition-colors duration-300">
            <CardHeader>
              <CardTitle>Financial Goal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <motion.div 
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl"
                >
                  🎯
                </motion.div>
                <div>
                  <h3 className="font-bold text-lg">{profile.financialGoal || "No goal set"}</h3>
                  <p className="text-sm text-muted-foreground">Target: Financial Freedom</p>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Recommended Actions</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Review your monthly budget</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Check inflation impact on savings</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Explore low-risk T-Bills</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      {/* Deposit Modal */}
      <AnimatePresence>
        {isDepositModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-xl font-bold font-display">Fund Wallet</h3>
                <button onClick={() => setIsDepositModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider mb-2">Your Virtual Account</p>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">Bank Name</span>
                    <span className="font-medium">Providus Bank</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">Account Name</span>
                    <span className="font-medium">VuraNaija - {profile.name || 'User'}</span>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-emerald-500/20">
                    <span className="text-2xl font-mono font-bold tracking-wider text-foreground">9901234567</span>
                    <button className="p-2 hover:bg-emerald-500/20 rounded-lg transition-colors text-emerald-600 dark:text-emerald-400">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Amount to Transfer</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <input 
                      type="number" 
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="e.g. 50000"
                      className="w-full bg-background border border-input rounded-xl py-3 pl-8 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Transferring to the account above will automatically fund your wallet.
                  </p>
                </div>

                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg rounded-xl"
                  onClick={handleDeposit}
                  disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0}
                >
                  {isDepositing ? 'Processing...' : 'Confirm Transfer'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* USD Deposit Modal */}
      <AnimatePresence>
        {isUsdDepositModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-xl font-bold font-display">Deposit USD</h3>
                <button onClick={() => setIsUsdDepositModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Global USD Account</p>
                      <p className="text-xs text-muted-foreground">Powered by Parallax</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg border border-border">
                      <span className="text-xs text-muted-foreground">Account Number</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold">0987654321</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6"><Copy className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg border border-border">
                      <span className="text-xs text-muted-foreground">Routing Number</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold">123456789</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6"><Copy className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Deposit Amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <input 
                      type="number" 
                      value={usdDepositAmount}
                      onChange={(e) => setUsdDepositAmount(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full bg-background border border-input rounded-xl py-3 pl-8 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg rounded-xl"
                  onClick={handleUsdDeposit}
                  disabled={isUsdDepositing || !usdDepositAmount || parseFloat(usdDepositAmount) <= 0}
                >
                  {isUsdDepositing ? 'Processing...' : 'Confirm USD Deposit'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* USD Withdraw Modal */}
      <AnimatePresence>
        {isUsdWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-xl font-bold font-display">Withdraw USD</h3>
                <button onClick={() => setIsUsdWithdrawModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-blue-500/10 rounded-xl p-4 flex justify-between items-center border border-blue-500/20">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-muted-foreground">USD Balance</span>
                  </div>
                  <span className="text-lg font-bold font-mono">${(profile.usdSavings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Withdrawal Amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <input 
                      type="number" 
                      value={usdWithdrawAmount}
                      onChange={(e) => setUsdWithdrawAmount(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full bg-background border border-input rounded-xl py-3 pl-8 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {parseFloat(usdWithdrawAmount) > (profile.usdSavings || 0) && (
                    <p className="text-xs text-red-500 font-medium">Insufficient USD funds.</p>
                  )}
                </div>

                <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Withdrawal Summary</p>
                  <div className="flex justify-between text-sm">
                    <span>You will receive:</span>
                    <span className="font-bold text-emerald-600">₦{(parseFloat(usdWithdrawAmount || '0') * EXCHANGE_RATE).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Funds will be instantly credited to your NGN wallet at the current rate of ₦{EXCHANGE_RATE.toLocaleString()}/$1.</p>
                </div>

                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg rounded-xl"
                  onClick={handleUsdWithdraw}
                  disabled={isUsdWithdrawing || !usdWithdrawAmount || parseFloat(usdWithdrawAmount) <= 0 || parseFloat(usdWithdrawAmount) > (profile.usdSavings || 0)}
                >
                  {isUsdWithdrawing ? 'Processing...' : 'Withdraw to NGN Wallet'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-xl font-bold font-display">Withdraw Funds</h3>
                <button onClick={() => setIsWithdrawModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-muted/50 rounded-xl p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-medium text-muted-foreground">Available Balance</span>
                  </div>
                  <span className="text-lg font-bold font-mono">{formatCurrency(profile.currentSavings)}</span>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Withdrawal Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <input 
                      type="number" 
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="e.g. 10000"
                      className="w-full bg-background border border-input rounded-xl py-3 pl-8 pr-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  {parseFloat(withdrawAmount) > profile.currentSavings && (
                    <p className="text-xs text-red-500 font-medium">Insufficient funds.</p>
                  )}
                </div>

                <Button 
                  className="w-full py-6 text-lg rounded-xl"
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > profile.currentSavings}
                >
                  {isWithdrawing ? 'Processing...' : 'Withdraw to Bank'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Convert Modal */}
      <AnimatePresence>
        {isConvertModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-xl font-bold font-display">Convert Currency</h3>
                <button onClick={() => setIsConvertModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex gap-2 p-1 bg-muted rounded-xl">
                  <button
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${convertDirection === 'NGN_TO_USD' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setConvertDirection('NGN_TO_USD')}
                  >
                    NGN to USD
                  </button>
                  <button
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${convertDirection === 'USD_TO_NGN' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setConvertDirection('USD_TO_NGN')}
                  >
                    USD to NGN
                  </button>
                </div>

                <div className="bg-muted/50 rounded-xl p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-muted-foreground">Available Balance</span>
                  </div>
                  <span className="text-lg font-bold font-mono">
                    {convertDirection === 'NGN_TO_USD' 
                      ? formatCurrency(profile.currentSavings)
                      : `$${(profile.usdSavings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Amount to Convert</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {convertDirection === 'NGN_TO_USD' ? '₦' : '$'}
                    </span>
                    <input 
                      type="number" 
                      value={convertAmount}
                      onChange={(e) => setConvertAmount(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full bg-background border border-input rounded-xl py-3 pl-8 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {convertAmount && parseFloat(convertAmount) > 0 && (
                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">You will receive:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {convertDirection === 'NGN_TO_USD' 
                          ? `$${(parseFloat(convertAmount) / EXCHANGE_RATE).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : formatCurrency(parseFloat(convertAmount) * EXCHANGE_RATE)}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground text-center">Exchange Rate: 1 USD = ₦{EXCHANGE_RATE}</p>
                  
                  {convertDirection === 'NGN_TO_USD' && parseFloat(convertAmount) > profile.currentSavings && (
                    <p className="text-xs text-red-500 font-medium">Insufficient NGN balance.</p>
                  )}
                  {convertDirection === 'USD_TO_NGN' && parseFloat(convertAmount) > (profile.usdSavings || 0) && (
                    <p className="text-xs text-red-500 font-medium">Insufficient USD balance.</p>
                  )}
                </div>

                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg rounded-xl"
                  onClick={handleConvert}
                  disabled={
                    isConverting || 
                    !convertAmount || 
                    parseFloat(convertAmount) <= 0 || 
                    (convertDirection === 'NGN_TO_USD' && parseFloat(convertAmount) > profile.currentSavings) ||
                    (convertDirection === 'USD_TO_NGN' && parseFloat(convertAmount) > (profile.usdSavings || 0))
                  }
                >
                  {isConverting ? 'Processing...' : 'Convert Now'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
