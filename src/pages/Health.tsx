import { useUser } from '@/context/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { motion } from 'framer-motion';
import { ShieldCheck, TrendingUp, AlertTriangle, CheckCircle, ArrowRight, Info, LineChart as ChartIcon, Users, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function Health() {
  const { healthScore, profile } = useUser();

  if (!healthScore) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">No Health Score Yet</h2>
        <p className="text-muted-foreground mb-8">Complete your profile to get your financial health assessment.</p>
        <Link to="/onboarding">
          <Button>Complete Profile</Button>
        </Link>
      </div>
    );
  }

  const getColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 75) return 'text-blue-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const getBgColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500';
    if (score >= 75) return 'bg-blue-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getPillarLink = (pillar: string) => {
    switch (pillar) {
      case 'Stability (Emergency Fund)': return '/dashboard';
      case 'Growth Potential (Savings Rate)': return '/market';
      case 'Risk Exposure (Debt)': return '/debt-payoff';
      case 'Preparedness (Goals)': return '/onboarding';
      default: return '#';
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold font-display">Financial Health Check</h1>
        <p className="text-muted-foreground">A holistic snapshot of your financial well-being. 🛡️</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Score Card */}
        <Card className="lg:col-span-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
            className={`w-48 h-48 rounded-full border-8 flex items-center justify-center relative ${
              healthScore.score >= 90 ? 'border-emerald-500/20' : healthScore.score >= 75 ? 'border-blue-500/20' : healthScore.score >= 50 ? 'border-amber-500/20' : 'border-red-500/20'
            }`}
          >
            <div className={`text-6xl font-bold font-display ${getColor(healthScore.score)}`}>
              {healthScore.score}
            </div>
            <div className="absolute bottom-8 text-sm text-muted-foreground uppercase tracking-wider">/ 100</div>
          </motion.div>
          <div className={`mt-6 text-xl font-medium uppercase tracking-widest ${getColor(healthScore.score)}`}>
            {healthScore.level}
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-4 py-2 rounded-full">
            <Users className="w-4 h-4" />
            Healthier than {healthScore.peerPercentile}% of Nigerians
          </div>
        </Card>

        {/* Pillars & Trend */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                Health Pillars
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { label: 'Stability (Emergency Fund)', score: healthScore.breakdown.stability, max: 30, icon: ShieldCheck, desc: "Your liquid cash cushion for emergencies." },
                { label: 'Growth Potential (Savings Rate)', score: healthScore.breakdown.growth, max: 30, icon: TrendingUp, desc: "How much of your income you're putting to work." },
                { label: 'Risk Exposure (Debt)', score: healthScore.breakdown.risk, max: 20, icon: AlertTriangle, desc: "Your debt-to-income balance." },
                { label: 'Preparedness (Goals)', score: healthScore.breakdown.preparedness, max: 20, icon: CheckCircle, desc: "Clarity on your financial future." },
              ].map((item, i) => (
                <Link key={item.label} to={getPillarLink(item.label)} className="block group">
                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                        <span className="text-sm font-medium group-hover:text-blue-500 transition-colors">{item.label}</span>
                        <div className="group/info relative">
                          <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                          <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/info:opacity-100 transition-all z-50 border border-border">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{item.score}/{item.max}</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.score / item.max) * 100}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className={`h-full transition-all duration-500 ${getBgColor((item.score / item.max) * 100)}`}
                      />
                    </div>
                  </motion.div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ChartIcon className="w-5 h-5 text-blue-500" />
                Health Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={healthScore.trend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#888' }} 
                    />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                      itemStyle={{ color: '#3b82f6' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-center text-muted-foreground mt-2">
                Your health score improved from {healthScore.trend[0].score} → {healthScore.score} over the last 6 months! 🚀
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold font-display flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-500" />
          How to Improve Your Score
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {healthScore.recommendations.map((rec, i) => (
            <Card key={i} className="group hover:border-blue-500/50 transition-all duration-300">
              <CardContent className="p-6 flex items-start gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${
                  rec.pillar === 'stability' ? 'bg-red-500/10 text-red-500' :
                  rec.pillar === 'growth' ? 'bg-blue-500/10 text-blue-500' :
                  rec.pillar === 'risk' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                }`}>
                  {rec.pillar === 'stability' && <ShieldCheck className="w-6 h-6" />}
                  {rec.pillar === 'growth' && <TrendingUp className="w-6 h-6" />}
                  {rec.pillar === 'risk' && <AlertTriangle className="w-6 h-6" />}
                  {rec.pillar === 'preparedness' && <CheckCircle className="w-6 h-6" />}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium leading-relaxed">{rec.text}</p>
                  <Link to={rec.link} className="inline-flex items-center gap-2 text-xs font-bold text-blue-500 hover:underline group-hover:translate-x-1 transition-transform">
                    {rec.action}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t">
        <Card className="hover:-translate-y-1 transition-transform duration-300">
          <CardHeader><CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Monthly Income</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold font-display text-foreground">₦{profile.monthlyIncome.toLocaleString()}</p></CardContent>
        </Card>
        <Card className="hover:-translate-y-1 transition-transform duration-300">
          <CardHeader><CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Savings Rate</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold font-display ${profile.monthlySavingsCapacity / profile.monthlyIncome >= 0.2 ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'}`}>
              {Math.round((profile.monthlySavingsCapacity / profile.monthlyIncome) * 100)}%
            </p>
          </CardContent>
        </Card>
        <Card className="hover:-translate-y-1 transition-transform duration-300">
          <CardHeader><CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Debt Ratio</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold font-display ${profile.debt === 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {Math.round((profile.debt / profile.monthlyIncome) * 100)}%
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
