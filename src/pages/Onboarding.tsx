import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane, 
  Home, 
  GraduationCap, 
  Rocket, 
  Shield, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  Info
} from 'lucide-react';
import { generateFinancialAdvice } from '@/lib/ai';
import { calculateHealthScore } from '@/lib/finance';
import { AIInsight } from '@/types';

const INCOME_RANGES = [
  { label: '< ₦100k', value: 75000 },
  { label: '₦100k - ₦500k', value: 300000 },
  { label: '₦500k - ₦1.5M', value: 1000000 },
  { label: '> ₦1.5M', value: 2000000 },
];

const GOALS = [
  { id: 'japa', label: 'Japa Fund', icon: Plane, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'home', label: 'Home Ownership', icon: Home, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'edu', label: 'Education', icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'biz', label: 'Business Capital', icon: Rocket, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'emergency', label: 'Emergency Fund', icon: Shield, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { id: 'other', label: 'Other', icon: Sparkles, color: 'text-slate-500', bg: 'bg-slate-500/10' },
];

const RISK_PERSONAS = [
  { id: 'low', label: 'Defender', desc: 'Protect my money', icon: Shield },
  { id: 'medium', label: 'Builder', desc: 'Steady growth', icon: Home },
  { id: 'high', label: 'Aggressor', desc: 'Maximum wealth', icon: Rocket },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { updateProfile, setAiInsight, resetData } = useUser();
  const [step, setStep] = useState(1);
  const [savingsPercent, setSavingsPercent] = useState(15);
  const [formData, setFormData] = useState({
    name: '',
    monthlyIncome: '',
    monthlySavingsCapacity: '',
    currentSavings: '',
    debt: '',
    riskTolerance: 'medium',
    financialGoal: '',
    goalAmount: '',
  });

  // Clear old data when starting onboarding
  useEffect(() => {
    resetData();
  }, []);

  // Update savings capacity when income or percent changes
  useEffect(() => {
    if (formData.monthlyIncome) {
      const capacity = Math.round((Number(formData.monthlyIncome) * savingsPercent) / 100);
      setFormData(prev => ({ ...prev, monthlySavingsCapacity: capacity.toString() }));
    }
  }, [formData.monthlyIncome, savingsPercent]);

  // Ref to hold the latest generated insight
  const backgroundInsightRef = useRef<AIInsight | null>(null);

  // Background AI Analysis
  useEffect(() => {
    const income = Number(formData.monthlyIncome);
    const savings = Number(formData.monthlySavingsCapacity);
    
    // Only run if we have the minimum required data
    if (income > 0 && savings >= 0 && formData.name) {
      const timer = setTimeout(async () => {
        try {
          const draftProfile = {
            name: formData.name,
            monthlyIncome: income,
            monthlySavingsCapacity: savings,
            currentSavings: Number(formData.currentSavings) || 0,
            debt: Number(formData.debt) || 0,
            riskTolerance: formData.riskTolerance as 'low' | 'medium' | 'high',
            financialGoal: formData.financialGoal || 'Financial Freedom',
            goalAmount: Number(formData.goalAmount) || 0,
            completedModules: []
          };
          
          const draftScore = calculateHealthScore(draftProfile);
          // Generate advice in the background
          const insight = await generateFinancialAdvice(draftProfile, draftScore, null, null);
          backgroundInsightRef.current = insight;
        } catch (error) {
          console.error("Background AI analysis failed", error);
          // Fallback is handled inside generateFinancialAdvice now
        }
      }, 1500); // 1.5s debounce

      return () => clearTimeout(timer);
    }
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    resetData();
    updateProfile({
      name: formData.name,
      monthlyIncome: Number(formData.monthlyIncome),
      monthlySavingsCapacity: Number(formData.monthlySavingsCapacity),
      currentSavings: Number(formData.currentSavings),
      debt: Number(formData.debt),
      riskTolerance: formData.riskTolerance as 'low' | 'medium' | 'high',
      financialGoal: formData.financialGoal,
      goalAmount: Number(formData.goalAmount),
    });
    
    // If background analysis succeeded, save it to context immediately
    if (backgroundInsightRef.current) {
      setAiInsight(backgroundInsightRef.current);
    }
    
    navigate('/dashboard');
  };

  const handleSkip = () => {
    resetData();
    updateProfile({
      name: 'Chidi',
      monthlyIncome: 300000,
      monthlySavingsCapacity: 45000,
      currentSavings: 150000,
      debt: 0,
      riskTolerance: 'medium',
      financialGoal: 'Japa Fund',
      goalAmount: 5000000,
    });
    navigate('/dashboard');
  };

  const getCTA = () => {
    if (formData.financialGoal.includes('Japa')) return 'Build My Japa Plan ✈️';
    if (formData.financialGoal.includes('Home')) return 'Start My Home Journey 🏠';
    if (formData.financialGoal.includes('Education')) return 'Secure My Future 🎓';
    if (formData.financialGoal.includes('Business')) return 'Launch My Business 🚀';
    return 'Complete Profile';
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8 space-y-4">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-primary uppercase tracking-wider">Onboarding</h2>
            <p className="text-2xl font-display font-bold">Step {step} of 3</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-muted-foreground">{Math.round((step / 3) * 100)}% Complete</span>
          </div>
        </div>
        <div className="h-3 w-full bg-secondary rounded-full overflow-hidden shadow-inner">
          <motion.div 
            className="h-full bg-gradient-to-r from-primary to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 15 }}
          />
        </div>
      </div>

      <Card className="glass-card border-t-4 border-t-primary shadow-2xl overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl font-display">
            {step === 1 && "Personal Info"}
            {step === 2 && "Financial Health"}
            {step === 3 && "Goals & Risk"}
          </CardTitle>
          <CardDescription className="text-lg">
            {step === 1 && "Start with the basics to customize your experience."}
            {step === 2 && "Help us understand your current standing."}
            {step === 3 && "Where do you want to go from here?"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Input
                  label="Full Name"
                  name="name"
                  placeholder="e.g. Emeka Okafor"
                  value={formData.name}
                  onChange={handleChange}
                  className="text-lg"
                />
                
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">Monthly Income Range</label>
                  <div className="grid grid-cols-2 gap-3">
                    {INCOME_RANGES.map((range) => (
                      <button
                        key={range.label}
                        onClick={() => setFormData({ ...formData, monthlyIncome: range.value.toString() })}
                        className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          formData.monthlyIncome === range.value.toString()
                            ? 'border-primary bg-primary/10 text-primary shadow-md'
                            : 'border-border bg-background/50 hover:border-primary/50'
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.monthlyIncome && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-2"
                  >
                    <div className="flex justify-between items-end">
                      <label className="text-sm font-medium text-muted-foreground">Monthly Savings Target</label>
                      <span className="text-xl font-bold text-primary">{savingsPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={savingsPercent}
                      onChange={(e) => setSavingsPercent(Number(e.target.value))}
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                      <span>Starter (5%)</span>
                      <span>Balanced (20%)</span>
                      <span>Wealth Builder (50%)</span>
                    </div>
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Estimated Monthly Savings:</span>
                      <span className="text-lg font-bold text-emerald-500">₦{Number(formData.monthlySavingsCapacity).toLocaleString()}</span>
                    </div>
                  </motion.div>
                )}

                <Button 
                  className="w-full h-12 text-lg" 
                  onClick={() => setStep(2)} 
                  disabled={!formData.monthlyIncome || !formData.name}
                >
                  Next <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Input
                  label="Current Savings (₦)"
                  name="currentSavings"
                  type="number"
                  placeholder="Total saved so far"
                  value={formData.currentSavings}
                  onChange={handleChange}
                />
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-muted-foreground">Total Debt (Optional)</label>
                    <button 
                      onClick={() => setFormData({ ...formData, debt: '0' })}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      I have no debt
                    </button>
                  </div>
                  <Input
                    name="debt"
                    type="number"
                    placeholder="e.g. Student Loan, Car Loan, Credit Card"
                    value={formData.debt}
                    onChange={handleChange}
                  />
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Include all outstanding balances to help us calculate your safety net.
                  </p>
                </div>
                <div className="flex gap-4 pt-4">
                  <Button variant="outline" className="w-full h-12" onClick={() => setStep(1)}>
                    <ChevronLeft className="w-5 h-5 mr-2" /> Back
                  </Button>
                  <Button className="w-full h-12" onClick={() => setStep(3)}>
                    Next <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">Primary Financial Goal</label>
                  <div className="grid grid-cols-2 gap-3">
                    {GOALS.map((goal) => (
                      <button
                        key={goal.id}
                        onClick={() => setFormData({ ...formData, financialGoal: goal.label })}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-center ${
                          formData.financialGoal === goal.label
                            ? 'border-primary bg-primary/10 shadow-md'
                            : 'border-border bg-background/50 hover:border-primary/50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${goal.bg} ${goal.color}`}>
                          <goal.icon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold">{goal.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">Risk Persona</label>
                  <div className="grid grid-cols-3 gap-2">
                    {RISK_PERSONAS.map((persona) => (
                      <button
                        key={persona.id}
                        onClick={() => setFormData({ ...formData, riskTolerance: persona.id })}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center gap-1 ${
                          formData.riskTolerance === persona.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-background/50 hover:border-primary/50'
                        }`}
                      >
                        <persona.icon className={`w-5 h-5 ${formData.riskTolerance === persona.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">{persona.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Target Amount (₦)"
                  name="goalAmount"
                  type="number"
                  placeholder="e.g. 5000000"
                  value={formData.goalAmount}
                  onChange={handleChange}
                />

                <div className="flex gap-4 pt-4">
                  <Button variant="outline" className="w-full h-12" onClick={() => setStep(2)}>
                    <ChevronLeft className="w-5 h-5 mr-2" /> Back
                  </Button>
                  <Button className="w-full h-12 shadow-lg shadow-emerald-500/20" onClick={handleSubmit} variant="success">
                    <CheckCircle2 className="w-5 h-5 mr-2" /> {getCTA()}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
        <button 
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4 transition-colors font-medium"
        >
          Just testing? Skip to Sample Dashboard
        </button>
      </div>
    </div>
  );
}
