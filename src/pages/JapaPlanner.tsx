import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { formatCurrency } from '@/lib/utils';
import { Plane, Globe, Calculator, ArrowRight, CheckCircle, AlertCircle, TrendingUp, Info, Users, Clock, Quote, Star } from 'lucide-react';
import { useUser } from '@/context/UserContext';

const DESTINATIONS = [
  { id: 'uk', name: 'United Kingdom', currency: 'GBP', symbol: '£', rate: 1900, estCost: 15000 },
  { id: 'canada', name: 'Canada', currency: 'CAD', symbol: '$', rate: 1100, estCost: 20000 },
  { id: 'usa', name: 'United States', currency: 'USD', symbol: '$', rate: 1356.23, estCost: 25000 },
  { id: 'australia', name: 'Australia', currency: 'AUD', symbol: '$', rate: 980, estCost: 22000 },
  { id: 'germany', name: 'Germany', currency: 'EUR', symbol: '€', rate: 1650, estCost: 12000 },
  { id: 'netherlands', name: 'Netherlands', currency: 'EUR', symbol: '€', rate: 1650, estCost: 14000 },
  { id: 'uae', name: 'UAE / Dubai', currency: 'AED', symbol: 'د.إ', rate: 370, estCost: 30000 },
];

const COMMUNITY_STORIES = [
  {
    name: "Chidi",
    destination: "United Kingdom",
    year: "2025",
    story: "VuraNaija's Japa Planner was my reality check. I thought I had enough, but the exchange rate risk warning saved me. I hedged in USD and made it to London!",
    avatar: "https://picsum.photos/seed/chidi/100/100"
  },
  {
    name: "Amaka",
    destination: "Canada",
    year: "2024",
    story: "The timeline generator helped me break down the process. Saving ₦1.5M a month was tough, but seeing the progress bar move kept me going.",
    avatar: "https://picsum.photos/seed/amaka/100/100"
  }
];

export default function JapaPlanner() {
  const { profile, portfolio } = useUser();
  const [destination, setDestination] = useState(DESTINATIONS[0]);
  const [targetDate, setTargetDate] = useState<string>('');
  const [customCost, setCustomCost] = useState<number>(DESTINATIONS[0].estCost);
  
  // Fix decimal precision bug by rounding the initial calculation
  const initialSavings = (profile.usdSavings || 0) * 1356.23 + (profile.currentSavings || 0) + (portfolio?.totalValue || 0);
  const [currentSavings, setCurrentSavings] = useState<number>(Number(initialSavings.toFixed(2)));
  const [liveRate, setLiveRate] = useState(destination.rate);

  // Simulate live exchange rate fluctuation
  useEffect(() => {
    setLiveRate(destination.rate);
    const interval = setInterval(() => {
      const fluctuation = (Math.random() - 0.5) * 2; // +/- 1 Naira
      setLiveRate(prev => Number((prev + fluctuation).toFixed(2)));
    }, 5000);
    return () => clearInterval(interval);
  }, [destination]);

  const handleDestinationChange = (destId: string) => {
    const dest = DESTINATIONS.find(d => d.id === destId) || DESTINATIONS[0];
    setDestination(dest);
    setCustomCost(dest.estCost);
  };

  const totalCostNgn = customCost * liveRate;
  const shortfallNgn = Math.max(0, totalCostNgn - currentSavings);
  const progressPct = Math.min(100, (currentSavings / totalCostNgn) * 100);

  // Calculate Visa Success Probability (Simulated for demo)
  const calculateVisaProbability = () => {
    let score = 40; // Base score
    
    // Financial readiness (up to 40 points)
    score += Math.min(40, (progressPct / 100) * 40);
    
    // Income stability (up to 20 points)
    if (profile.monthlyIncome > 1000000) score += 20;
    else if (profile.monthlyIncome > 500000) score += 15;
    else if (profile.monthlyIncome > 200000) score += 10;
    
    return Math.min(98, score); // Max 98% for realism
  };

  const visaProbability = calculateVisaProbability();

  // Calculate monthly savings needed
  let monthsToTarget = 12; // default 1 year
  if (targetDate) {
    const target = new Date(targetDate);
    const now = new Date();
    monthsToTarget = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
    monthsToTarget = Math.max(1, monthsToTarget); // at least 1 month
  }

  const monthlySavingsNeededNgn = shortfallNgn / monthsToTarget;
  const monthlySavingsNeededDest = monthlySavingsNeededNgn / liveRate;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <div>
        <h1 className="text-4xl font-bold font-display mb-2 flex items-center gap-3">
          <Plane className="w-8 h-8 text-blue-500" />
          Japa / Relocation Planner
        </h1>
        <p className="text-muted-foreground text-lg">Plan your relocation financially and track your progress. 🌍</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Relocation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Target Destination</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {DESTINATIONS.map(dest => (
                    <div 
                      key={dest.id}
                      onClick={() => handleDestinationChange(dest.id)}
                      className={`p-3 rounded-xl border-2 cursor-pointer text-center transition-all ${destination.id === dest.id ? 'border-blue-500 bg-blue-500/10' : 'border-border hover:border-blue-500/50'}`}
                    >
                      <Globe className={`w-5 h-5 mx-auto mb-2 ${destination.id === dest.id ? 'text-blue-500' : 'text-muted-foreground'}`} />
                      <p className="font-semibold text-[10px] leading-tight">{dest.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Estimated Cost ({destination.currency})</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{destination.symbol}</span>
                    <Input 
                      type="number" 
                      value={customCost || ''} 
                      onChange={(e) => setCustomCost(parseFloat(e.target.value) || 0)}
                      className="pl-8"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Includes visa, flights, proof of funds, initial rent.</p>
                </div>

                <div className="space-y-2">
                  <Label>Target Date</Label>
                  <Input 
                    type="month" 
                    value={targetDate} 
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label>Current Dedicated Savings (₦)</Label>
                <Input 
                  type="number" 
                  value={currentSavings || ''} 
                  onChange={(e) => setCurrentSavings(Number(parseFloat(e.target.value).toFixed(2)) || 0)}
                />
                <p className="text-xs text-muted-foreground">We pre-filled this with your total portfolio + wallet balance.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-blue-500 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Action Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {shortfallNgn <= 0 ? (
                <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-lg">You've hit your target!</p>
                    <p className="text-sm">You have enough saved for your estimated relocation costs.</p>
                  </div>
                </div>
              ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                        <p className="text-sm text-muted-foreground mb-1">Monthly Savings Needed</p>
                        <p className="text-3xl font-bold font-display text-blue-500">{formatCurrency(monthlySavingsNeededNgn)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ≈ {destination.symbol}{monthlySavingsNeededDest.toLocaleString(undefined, { maximumFractionDigits: 2 })} / month
                        </p>
                      </div>
                      <div className="p-4 bg-secondary/50 rounded-2xl border border-border">
                        <p className="text-sm text-muted-foreground mb-1">Time Remaining</p>
                        <p className="text-2xl font-bold">{monthsToTarget} months</p>
                        <p className="text-xs text-muted-foreground mt-1">Target: {targetDate || 'Not set'}</p>
                      </div>
                    </div>

                  <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-600 dark:text-amber-400">
                      <p className="font-semibold mb-1">Exchange Rate Risk</p>
                      <p>The Naira to {destination.currency} rate fluctuates. Consider saving directly in USD or {destination.currency} to hedge against devaluation.</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Estimated Cost</p>
                <p className="text-2xl font-bold font-display">{formatCurrency(totalCostNgn)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <p className="text-sm text-muted-foreground">({destination.symbol}{customCost.toLocaleString()} @ ₦{liveRate.toLocaleString()}/{destination.symbol})</p>
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 transition-all z-50 border border-border leading-relaxed">
                      Simulated live parallel market rate. Rates fluctuate daily.
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-bold">{progressPct.toFixed(1)}%</span>
                </div>
                <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500" 
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Remaining Shortfall</p>
                <p className="text-xl font-bold text-red-500">{formatCurrency(shortfallNgn)}</p>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    Visa Probability
                  </p>
                  <span className={`text-lg font-bold ${visaProbability > 70 ? 'text-emerald-500' : visaProbability > 40 ? 'text-amber-500' : 'text-red-500'}`}>
                    {visaProbability}%
                  </span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${visaProbability > 70 ? 'bg-emerald-500' : visaProbability > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${visaProbability}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Based on financial readiness and income stability.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-blue-500" />
                Timeline Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { range: "Month 1-3", action: "Save for IELTS/Exam fees", status: progressPct > 10 ? 'completed' : 'pending' },
                { range: "Month 4-6", action: "Apply for jobs/schools", status: progressPct > 30 ? 'completed' : 'pending' },
                { range: "Month 7-9", action: "Gather documents & POF", status: progressPct > 60 ? 'completed' : 'pending' },
                { range: "Month 10-12", action: "Visa application & travel", status: progressPct > 90 ? 'completed' : 'pending' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 relative">
                  {i < 3 && <div className="absolute left-2 top-5 bottom-0 w-0.5 bg-border" />}
                  <div className={`w-4 h-4 rounded-full mt-1 shrink-0 z-10 ${step.status === 'completed' ? 'bg-emerald-500' : 'bg-secondary border-2 border-border'}`} />
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{step.range}</p>
                    <p className="text-xs font-medium">{step.action}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold font-display flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Community Stories
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {COMMUNITY_STORIES.map((story, i) => (
              <Card key={i} className="bg-secondary/30 border-none">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <img src={story.avatar} alt={story.name} className="w-10 h-10 rounded-full border-2 border-blue-500/20" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{story.name}</p>
                        <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full">{story.destination}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2">Moved in {story.year}</p>
                      <div className="relative">
                        <Quote className="w-4 h-4 text-blue-500/20 absolute -top-1 -left-1" />
                        <p className="text-xs italic text-muted-foreground pl-4 leading-relaxed">
                          {story.story}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="bg-blue-600 rounded-3xl p-8 text-white flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-4">Need a USD Hedge?</h3>
            <p className="text-blue-100 mb-6 leading-relaxed">
              Don't let Naira devaluation kill your Japa dream. Convert your savings to USD instantly and earn up to 8% annual returns.
            </p>
            <Link to="/dashboard" state={{ openUsdDeposit: true }}>
              <Button className="bg-white text-blue-600 hover:bg-blue-50 rounded-xl font-bold px-8">
                Open USD Wallet
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
