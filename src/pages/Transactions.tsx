import { useState, useMemo } from 'react';
import { useUser } from '@/context/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  RefreshCw, 
  TrendingUp, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Repeat,
  Info
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export default function Transactions() {
  const { profile } = useUser();
  const transactions = profile.transactions || [];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.amount.toString().includes(searchQuery);
      const matchesFilter = filterType === 'all' || t.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [transactions, searchQuery, filterType]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-5 h-5 text-emerald-500" />;
      case 'withdrawal':
        return <ArrowUpRight className="w-5 h-5 text-red-500" />;
      case 'conversion':
        return <RefreshCw className="w-5 h-5 text-blue-500" />;
      case 'investment':
        return <TrendingUp className="w-5 h-5 text-purple-500" />;
      default:
        return null;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'withdrawal':
        return 'bg-red-500/10 border-red-500/20';
      case 'conversion':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'investment':
        return 'bg-purple-500/10 border-purple-500/20';
      default:
        return 'bg-muted border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-amber-500" />;
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-500" />;
      default:
        return <AlertCircle className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return formatCurrency(amount);
  };

  const handleExport = () => {
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Currency', 'Status', 'Balance After'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(t => [
        new Date(t.date).toLocaleString(),
        t.type,
        `"${t.description.replace(/"/g, '""')}"`,
        t.amount,
        t.currency,
        t.status,
        t.balanceAfter || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vuranaija_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display mb-2">Transaction Ledger</h1>
          <p className="text-muted-foreground text-lg">
            A detailed history of all your financial activities.
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-xl">History</CardTitle>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search transactions..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
                {['all', 'deposit', 'withdrawal', 'investment', 'conversion'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                      filterType === type 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="w-6 h-6 opacity-20" />
              </div>
              <p className="text-lg font-medium">No transactions found</p>
              <p className="text-sm">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredTransactions.map((transaction) => (
                  <motion.div 
                    key={transaction.id}
                    layout
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md ${getTransactionColor(transaction.type)}`}
                  >
                    <div className="flex items-center gap-4 mb-3 sm:mb-0">
                      <div className="relative">
                        <div className={`p-2.5 rounded-xl bg-background shadow-sm border border-border/50`}>
                          {getTransactionIcon(transaction.type)}
                        </div>
                        {transaction.isRecurring && (
                          <div className="absolute -top-1 -right-1 bg-blue-500 text-white p-0.5 rounded-full shadow-sm" title="Recurring Transaction">
                            <Repeat className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground capitalize leading-none">{transaction.type}</p>
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-background/50 border border-border/50 text-[10px] font-medium uppercase tracking-wider">
                            {getStatusIcon(transaction.status)}
                            {transaction.status}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                          {transaction.description}
                          {transaction.type === 'investment' && (
                            <span className="group/info relative cursor-help">
                              <Info className="w-3 h-3 text-muted-foreground/50" />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-xl opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 border border-border">
                                This represents money moved from your wallet into investments—it's not lost, it's growing!
                              </span>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex sm:flex-row items-center sm:items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 mt-1 sm:mt-0 border-border/20 w-full sm:w-auto">
                      <div className="text-left sm:text-right">
                        <p className={`font-bold font-mono text-lg ${
                          transaction.type === 'deposit' ? 'text-emerald-500' : 
                          transaction.type === 'investment' ? 'text-purple-500' :
                          transaction.type === 'withdrawal' ? 'text-red-500' : 
                          'text-blue-500'
                        }`}>
                          {transaction.type === 'deposit' ? '+' : 
                           transaction.type === 'withdrawal' ? '-' : 
                           transaction.type === 'investment' ? '' : ''}
                          {formatAmount(transaction.amount, transaction.currency)}
                        </p>
                        <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(transaction.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(transaction.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      
                      {transaction.balanceAfter !== undefined && (
                        <div className="text-right pl-4 sm:pl-6 border-l border-border/20 hidden sm:block">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Balance</p>
                          <p className="text-sm font-mono font-semibold text-foreground">
                            {formatAmount(transaction.balanceAfter, transaction.currency)}
                          </p>
                        </div>
                      )}
                      {transaction.balanceAfter !== undefined && (
                        <div className="text-right sm:hidden">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Balance</p>
                          <p className="text-xs font-mono font-semibold text-foreground">
                            {formatAmount(transaction.balanceAfter, transaction.currency)}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
