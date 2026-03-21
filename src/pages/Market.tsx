import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, ArrowUpRight, ShieldCheck, Building, Globe, Zap, X, Wallet, ExternalLink, Info } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

const MARKET_OPPORTUNITIES = [
  // Low Risk (Capital Preservation)
  {
    id: 1,
    title: "FGN Treasury Bills",
    assetType: "treasury" as const,
    provider: "Stanbic IBTC",
    link: "https://www.stanbicibtcassetmanagement.com/",
    type: "Low Risk",
    yield: "19.5%",
    minInvestment: "₦100,000",
    icon: ShieldCheck,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    description: "Government-backed securities. Perfect for your emergency fund and capital preservation.",
    eli5: "Imagine lending ₦100k to the Govt for 1 year. They pay you back ₦119,500. It's one of the safest ways to grow your money."
  },
  {
    id: 2,
    title: "Money Market Fund",
    assetType: "mutual" as const,
    provider: "Cowrywise",
    link: "https://cowrywise.com/",
    type: "Low Risk",
    yield: "16.2%",
    minInvestment: "₦5,000",
    icon: Building,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    description: "Highly liquid mutual fund. Great for short-term goals and daily interest compounding.",
    eli5: "Like a 'contribution' (Ajo/Esusu) where an expert handles the money to buy different safe things so your money grows every single day."
  },
  {
    id: 6,
    title: "FGN Savings Bond",
    assetType: "treasury" as const,
    provider: "ARM Investment",
    link: "https://www.arminvestmentcenter.com/",
    type: "Low Risk",
    yield: "17.0%",
    minInvestment: "₦5,000",
    icon: ShieldCheck,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
    description: "Retail-focused government bond with quarterly interest payments.",
    eli5: "You lend money to the government, and they pay you 'thank you' money (interest) every 3 months until they return your full money."
  },
  {
    id: 7,
    title: "Halal Fixed Income",
    assetType: "mutual" as const,
    provider: "Lotus Capital",
    link: "https://www.lotuscapitallimited.com/",
    type: "Low Risk",
    yield: "14.8%",
    minInvestment: "₦5,000",
    icon: ShieldCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-600/10",
    border: "border-emerald-600/20",
    description: "Shari'ah compliant fixed-income investments. No interest (Riba), just profit sharing.",
    eli5: "A safe investment that follows Islamic rules. Instead of earning interest, you share in the actual profits of safe businesses."
  },
  {
    id: 8,
    title: "Corporate Bonds Fund",
    assetType: "mutual" as const,
    provider: "FBNQuest",
    link: "https://fbnquest.com/",
    type: "Low Risk",
    yield: "18.1%",
    minInvestment: "₦50,000",
    icon: Building,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    description: "Invests in high-quality debt issued by top-tier Nigerian corporations.",
    eli5: "Instead of lending to the government, you lend to big, safe companies like MTN or Dangote, and they pay you back with interest."
  },

  // Medium Risk (Balanced Growth & USD Hedge)
  {
    id: 3,
    title: "S&P 500 Index Fund",
    assetType: "stocks" as const,
    provider: "Bamboo",
    link: "https://investbamboo.com/",
    type: "Medium Risk",
    yield: "10.5% (USD)",
    minInvestment: "$10",
    icon: Globe,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    description: "Invest in the top 500 US companies. Protects against Naira devaluation.",
    eli5: "You're buying a tiny piece of the 500 biggest companies in America (like Apple and Google). Since it's in Dollars, you win if the Naira drops!"
  },
  {
    id: 5,
    title: "Fractional Real Estate",
    assetType: "realestate" as const,
    provider: "Coreum",
    link: "https://coreum.ng/",
    type: "Medium Risk",
    yield: "14.5%",
    minInvestment: "₦50,000",
    icon: Building,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    description: "Co-own premium real estate in Lagos and Abuja. Earn rental income and capital appreciation.",
    eli5: "Instead of buying a whole house in Lekki, you and others join money to buy it. You get a share of the rent and the house value as it grows."
  },
  {
    id: 9,
    title: "Global Tech ETF (QQQ)",
    assetType: "stocks" as const,
    provider: "Trove",
    link: "https://troveapp.co/",
    type: "Medium Risk",
    yield: "12.4% (USD)",
    minInvestment: "$10",
    icon: Globe,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    description: "Tracks the NASDAQ-100. Heavy exposure to top global technology companies.",
    eli5: "You are buying a basket that holds only the biggest tech companies in the world, like Microsoft, Tesla, and Nvidia."
  },
  {
    id: 10,
    title: "Eurobond Fund",
    assetType: "mutual" as const,
    provider: "United Capital",
    link: "https://www.unitedcapitalplcgroup.com/",
    type: "Medium Risk",
    yield: "7.5% (USD)",
    minInvestment: "$100",
    icon: ShieldCheck,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    border: "border-teal-500/20",
    description: "Invests in Dollar-denominated sovereign and corporate bonds from Africa.",
    eli5: "You lend Dollars to African governments and big companies. They pay you back in Dollars with interest. Very stable."
  },
  {
    id: 11,
    title: "Agriculture Fund",
    assetType: "mutual" as const,
    provider: "ThriveAgric",
    link: "https://www.thriveagric.com/",
    type: "Medium Risk",
    yield: "15.0%",
    minInvestment: "₦10,000",
    icon: TrendingUp,
    color: "text-lime-600",
    bg: "bg-lime-600/10",
    border: "border-lime-600/20",
    description: "Fund agricultural projects across Nigeria and earn returns after harvest.",
    eli5: "You give money to farmers to buy seeds and fertilizer. When they harvest and sell the crops, you share the profits."
  },
  {
    id: 12,
    title: "Dividend Aristocrats ETF",
    assetType: "stocks" as const,
    provider: "Chaka",
    link: "https://chaka.com/",
    type: "Medium Risk",
    yield: "8.2% (USD)",
    minInvestment: "$10",
    icon: Globe,
    color: "text-fuchsia-500",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/20",
    description: "Invests in US companies with a history of consistently paying and growing dividends.",
    eli5: "You buy shares in big, boring companies (like Coca-Cola) that are famous for paying out cash to their owners every single year."
  },
  {
    id: 13,
    title: "Balanced Mutual Fund",
    assetType: "mutual" as const,
    provider: "Afrinvest",
    link: "https://www.afrinvest.com/",
    type: "Medium Risk",
    yield: "18.5%",
    minInvestment: "₦10,000",
    icon: Building,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    description: "A mix of Nigerian stocks and safe bonds. Balances growth with capital protection.",
    eli5: "The experts split your money: half goes to safe government loans, half goes to riskier company shares. Best of both worlds."
  },

  // High Risk (Aggressive Growth)
  {
    id: 4,
    title: "Nigerian Equity Fund",
    assetType: "stocks" as const,
    provider: "Meristem",
    link: "https://www.meristemng.com/",
    type: "High Risk",
    yield: "28.4%",
    minInvestment: "₦10,000",
    icon: TrendingUp,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    description: "Aggressive growth fund tracking the NGX. Best for long-term wealth building.",
    eli5: "You're buying pieces of big Nigerian companies like MTN and Dangote. It can be a bumpy ride, but it's great for building long-term wealth."
  },
  {
    id: 14,
    title: "Bitcoin (BTC)",
    assetType: "crypto" as const,
    provider: "Binance / Quidax",
    link: "https://www.quidax.com/",
    type: "High Risk",
    yield: "Variable",
    minInvestment: "₦5,000",
    icon: Zap,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    description: "The largest cryptocurrency by market cap. Highly volatile digital gold.",
    eli5: "Digital money that isn't controlled by any government. Its price goes up and down wildly, but many see it as the future of money."
  },
  {
    id: 15,
    title: "Ethereum (ETH)",
    assetType: "crypto" as const,
    provider: "Luno",
    link: "https://www.luno.com/",
    type: "High Risk",
    yield: "Variable",
    minInvestment: "₦5,000",
    icon: Zap,
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    border: "border-slate-400/20",
    description: "The leading smart contract platform. Powers decentralized finance and NFTs.",
    eli5: "Like Bitcoin, but it's also a giant global computer that other apps can run on. Very risky, but has huge potential."
  },
  {
    id: 16,
    title: "Individual NGX Stocks",
    assetType: "stocks" as const,
    provider: "Trove",
    link: "https://troveapp.co/",
    type: "High Risk",
    yield: "Variable",
    minInvestment: "₦1,000",
    icon: TrendingUp,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    description: "Pick and choose individual Nigerian companies (e.g., Zenith Bank, Seplat).",
    eli5: "Instead of buying a basket of companies, you bet all your money on one specific company. If they do well, you win big. If they fail, you lose."
  },
  {
    id: 17,
    title: "Individual US Stocks",
    assetType: "stocks" as const,
    provider: "Bamboo",
    link: "https://investbamboo.com/",
    type: "High Risk",
    yield: "Variable (USD)",
    minInvestment: "$1",
    icon: Globe,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    description: "Buy fractional shares of companies like Tesla, Apple, or Nvidia.",
    eli5: "You are picking one specific American company to invest in. It's in Dollars, but if that one company has a bad year, your money drops."
  },
  {
    id: 18,
    title: "Venture Capital Syndicate",
    assetType: "stocks" as const,
    provider: "Syndicate by VFD",
    link: "https://vfdgroup.com/",
    type: "High Risk",
    yield: "High Potential",
    minInvestment: "₦500,000",
    icon: Zap,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    description: "Invest in early-stage African tech startups before they go public.",
    eli5: "You give money to a brand new company (like Paystack before it was famous). 9 out of 10 might fail, but the 1 that succeeds pays for everything."
  },
  {
    id: 19,
    title: "Solana (SOL)",
    assetType: "crypto" as const,
    provider: "Binance",
    link: "https://www.binance.com/",
    type: "High Risk",
    yield: "Variable",
    minInvestment: "₦5,000",
    icon: Zap,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    description: "High-speed, low-cost blockchain network. Extremely volatile.",
    eli5: "A newer, faster version of Ethereum. It's like a rollercoaster—it can go up 100% in a month or crash 50% in a week."
  },
  {
    id: 20,
    title: "Emerging Markets ETF",
    assetType: "stocks" as const,
    provider: "Chaka",
    link: "https://chaka.com/",
    type: "High Risk",
    yield: "11.5% (USD)",
    minInvestment: "$10",
    icon: Globe,
    color: "text-orange-600",
    bg: "bg-orange-600/10",
    border: "border-orange-600/20",
    description: "Invests in fast-growing economies like India, Brazil, and China.",
    eli5: "You are investing in countries that are growing very fast. It's riskier than the US, but can grow much quicker."
  }
];

export default function Market() {
  const { profile, investFromWallet } = useUser();
  const [selectedAsset, setSelectedAsset] = useState<typeof MARKET_OPPORTUNITIES[0] | null>(null);
  const [investAmount, setInvestAmount] = useState('');
  const [isInvesting, setIsInvesting] = useState(false);

  const handleInvest = () => {
    const amount = parseFloat(investAmount);
    if (isNaN(amount) || amount <= 0 || !selectedAsset) return;
    if (amount > profile.currentSavings) return; // Cannot invest more than wallet balance
    
    setIsInvesting(true);
    setTimeout(() => {
      investFromWallet(amount, selectedAsset.assetType, selectedAsset.title);
      setIsInvesting(false);
      setSelectedAsset(null);
      setInvestAmount('');
    }, 1500); // Simulate network delay
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 max-w-5xl mx-auto"
    >
      <motion.div variants={itemVariants} className="text-center space-y-4 mb-12">
        <div className="w-16 h-16 bg-gradient-to-br from-primary to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold font-display">Market Simulation</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Practice investing with your virtual wallet balance. Explore curated, high-yield investments from our SEC-licensed partners before committing real money.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {MARKET_OPPORTUNITIES.map((opp) => (
          <motion.div key={opp.id} variants={itemVariants}>
            <Card className={`h-full border ${opp.border} hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group flex flex-col`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${opp.bg} rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 pointer-events-none overflow-hidden`} />
              
              <CardHeader className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${opp.bg} ${opp.color}`}>
                      <opp.icon className="w-6 h-6" />
                    </div>
                    <div className="group/eli5 relative">
                      <div className="p-1.5 bg-secondary/50 rounded-lg cursor-help hover:bg-secondary transition-colors">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">ELI5</span>
                      </div>
                      <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-popover text-popover-foreground text-xs rounded-xl shadow-2xl opacity-0 invisible group-hover/eli5:opacity-100 group-hover/eli5:visible transition-all z-50 border border-border leading-relaxed pointer-events-none">
                        <div className="font-bold mb-1 text-primary">Explain Like I'm 5:</div>
                        {opp.eli5}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold font-display text-foreground">{opp.yield}</div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Est. Return</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">{opp.title}</CardTitle>
                  <div className="group/risk relative">
                    <div className="px-2 py-0.5 bg-secondary/50 rounded text-[10px] font-bold text-muted-foreground cursor-help">
                      {opp.type}
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/risk:opacity-100 group-hover/risk:visible transition-all z-50 border border-border">
                      {opp.type === 'Low Risk' && "Low Risk = Slow & Steady. Like a tortoise winning the race."}
                      {opp.type === 'Medium Risk' && "Medium Risk = Balanced. A mix of safety and growth."}
                      {opp.type === 'High Risk' && "High Risk = Fast but bumpy ride. High potential, but be ready for waves."}
                    </div>
                  </div>
                </div>
                <CardDescription className="text-sm font-medium text-primary">{opp.provider}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {opp.description}
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Min. Investment</div>
                      <div className="font-semibold">{opp.minInvestment}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Risk Level</div>
                      <div className="font-semibold">{opp.type}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      className="w-full group/btn" 
                      variant="default"
                      onClick={() => setSelectedAsset(opp)}
                    >
                      Simulate Buy
                    </Button>
                    <Button 
                      className="w-full group/link" 
                      variant="outline"
                      onClick={() => window.open(opp.link, '_blank')}
                    >
                      Real Platform
                      <ExternalLink className="w-4 h-4 ml-2 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Invest Modal */}
      <AnimatePresence>
        {selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-xl font-bold font-display">Simulate Investment</h3>
                <button onClick={() => setSelectedAsset(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-500/90 leading-relaxed">
                    This is a <strong>Paper Trading Simulation</strong>. No real money will be deducted from your bank. It uses the virtual balance from your VuraNaija wallet.
                  </p>
                </div>

                <div className="bg-muted/50 rounded-xl p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-medium text-muted-foreground">Virtual Balance</span>
                  </div>
                  <span className="text-lg font-bold font-mono">{formatCurrency(profile.currentSavings)}</span>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Amount to Invest in {selectedAsset.title}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <input 
                      type="number" 
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      placeholder="e.g. 10000"
                      className="w-full bg-background border border-input rounded-xl py-3 pl-8 pr-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  {parseFloat(investAmount) > profile.currentSavings && (
                    <p className="text-xs text-red-500 font-medium">Insufficient virtual balance. Please deposit virtual funds first.</p>
                  )}
                </div>

                <Button 
                  className="w-full py-6 text-lg rounded-xl"
                  onClick={handleInvest}
                  disabled={isInvesting || !investAmount || parseFloat(investAmount) <= 0 || parseFloat(investAmount) > profile.currentSavings}
                >
                  {isInvesting ? 'Processing...' : `Confirm Virtual Buy`}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
