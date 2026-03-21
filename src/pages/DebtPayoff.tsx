import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { formatCurrency } from '@/lib/utils';
import { Calculator, ArrowRight, TrendingDown, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Debt {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
}

const COLORS = ['#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E'];

export default function DebtPayoff() {
  const [debts, setDebts] = useState<Debt[]>([
    { id: '1', name: 'Personal Loan', balance: 500000, interestRate: 25, minimumPayment: 25000 },
    { id: '2', name: 'Credit Card', balance: 150000, interestRate: 36, minimumPayment: 15000 },
  ]);
  const [extraPayment, setExtraPayment] = useState<number>(10000);
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');

  const addDebt = () => {
    setDebts([...debts, { id: Date.now().toString(), name: 'New Debt', balance: 0, interestRate: 0, minimumPayment: 0 }]);
  };

  const removeDebt = (id: string) => {
    setDebts(debts.filter(d => d.id !== id));
  };

  const updateDebt = (id: string, field: keyof Debt, value: string | number) => {
    setDebts(debts.map(d => {
      if (d.id === id) {
        return { ...d, [field]: typeof value === 'string' ? parseFloat(value) || 0 : value };
      }
      return d;
    }));
  };

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalMinimum = debts.reduce((sum, d) => sum + d.minimumPayment, 0);

  // Simple calculation for display purposes (not a full amortization schedule)
  const calculatePayoff = () => {
    let sortedDebts = [...debts];
    if (strategy === 'avalanche') {
      sortedDebts.sort((a, b) => b.interestRate - a.interestRate);
    } else {
      sortedDebts.sort((a, b) => a.balance - b.balance);
    }

    let totalInterestPaid = 0;
    let months = 0;
    let remainingDebts = sortedDebts.map(d => ({ ...d }));
    let isPayoffPossible = true;

    // Safety check for infinite loops
    let iterations = 0;
    while (remainingDebts.some(d => d.balance > 0) && iterations < 1200) {
      iterations++;
      months++;
      let availableExtra = extraPayment;

      for (let i = 0; i < remainingDebts.length; i++) {
        if (remainingDebts[i].balance <= 0) continue;

        const interest = (remainingDebts[i].balance * (remainingDebts[i].interestRate / 100)) / 12;
        totalInterestPaid += interest;
        remainingDebts[i].balance += interest;

        let payment = remainingDebts[i].minimumPayment;
        
        // Apply extra payment to the target debt
        if (i === remainingDebts.findIndex(d => d.balance > 0)) {
           payment += availableExtra;
           availableExtra = 0;
        }

        // Check if minimum payment covers interest
        if (payment <= interest && availableExtra === 0 && i === remainingDebts.findIndex(d => d.balance > 0)) {
            // If the target debt's payment doesn't cover interest, it will never be paid off
            isPayoffPossible = false;
            break;
        }

        if (remainingDebts[i].balance <= payment) {
          availableExtra += (payment - remainingDebts[i].balance); // rollover extra
          remainingDebts[i].balance = 0;
        } else {
          remainingDebts[i].balance -= payment;
        }
      }
      if (!isPayoffPossible) break;
    }

    return {
      months: isPayoffPossible ? months : -1,
      totalInterest: isPayoffPossible ? totalInterestPaid : -1,
      isPossible: isPayoffPossible
    };
  };

  const payoffResult = calculatePayoff();

  const chartData = debts.map(d => ({
    name: d.name,
    value: d.balance
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <div>
        <h1 className="text-4xl font-bold font-display mb-2">Debt Payoff Calculator</h1>
        <p className="text-muted-foreground text-lg">Strategize your way out of debt faster. 📉</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Your Debts</CardTitle>
              <Button onClick={addDebt} size="sm" variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Add Debt
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {debts.map((debt, index) => (
                <div key={debt.id} className="p-4 bg-muted/30 rounded-xl space-y-4 border border-border/50 relative">
                  <div className="flex justify-between items-center">
                    <Input 
                      value={debt.name} 
                      onChange={(e) => updateDebt(debt.id, 'name', e.target.value)}
                      className="font-semibold text-lg bg-transparent border-none px-0 focus-visible:ring-0 w-1/2"
                      placeholder="Debt Name"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeDebt(debt.id)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Balance (₦)</Label>
                      <Input 
                        type="number" 
                        value={debt.balance || ''} 
                        onChange={(e) => updateDebt(debt.id, 'balance', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Interest Rate (%)</Label>
                      <Input 
                        type="number" 
                        value={debt.interestRate || ''} 
                        onChange={(e) => updateDebt(debt.id, 'interestRate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Min. Payment (₦)</Label>
                      <Input 
                        type="number" 
                        value={debt.minimumPayment || ''} 
                        onChange={(e) => updateDebt(debt.id, 'minimumPayment', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payoff Strategy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${strategy === 'avalanche' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => setStrategy('avalanche')}
                >
                  <h3 className="font-semibold mb-1">Avalanche Method</h3>
                  <p className="text-sm text-muted-foreground">Highest interest rate first. Saves the most money overall.</p>
                </div>
                <div 
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${strategy === 'snowball' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => setStrategy('snowball')}
                >
                  <h3 className="font-semibold mb-1">Snowball Method</h3>
                  <p className="text-sm text-muted-foreground">Smallest balance first. Builds momentum and psychological wins.</p>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label>Extra Monthly Payment (₦)</Label>
                <p className="text-sm text-muted-foreground mb-2">How much extra can you put towards your debt each month?</p>
                <Input 
                  type="number" 
                  value={extraPayment || ''} 
                  onChange={(e) => setExtraPayment(parseFloat(e.target.value) || 0)}
                  className="text-lg font-semibold"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Payoff Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Debt</p>
                <p className="text-3xl font-bold font-display">{formatCurrency(totalDebt)}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Total Min. Payment</p>
                  <p className="font-semibold">{formatCurrency(totalMinimum)}</p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Total Monthly</p>
                  <p className="font-semibold text-primary">{formatCurrency(totalMinimum + extraPayment)}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-primary/10">
                {!payoffResult.isPossible ? (
                  <div className="p-4 bg-red-500/10 text-red-500 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">Your payments are not enough to cover the interest. You need to increase your monthly payments.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Time to Debt-Free</p>
                      <p className="text-2xl font-bold text-emerald-500">
                        {Math.floor(payoffResult.months / 12)} years, {payoffResult.months % 12} months
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Interest Paid</p>
                      <p className="text-xl font-bold text-red-500">{formatCurrency(payoffResult.totalInterest)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {totalDebt > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Debt Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                      itemStyle={{ color: '#E5E7EB' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
