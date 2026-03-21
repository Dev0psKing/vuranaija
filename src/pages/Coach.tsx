import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/context/UserContext';
import { generateFinancialAdvice, chatWithCoach } from '@/lib/ai';
import { AIInsight } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BrainCircuit, AlertTriangle, TrendingUp, CheckCircle, Loader2, ArrowLeft, Send, User, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Coach() {
  const { profile, healthScore, simulation, portfolio, aiInsight, setAiInsight } = useUser();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing your financial data...");
  const [error, setError] = useState<string | null>(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', parts: { text: string }[] }[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isPidgin, setIsPidgin] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async (forceRefresh: boolean = false) => {
    if (!profile.monthlyIncome || !healthScore) return;
    
    setLoading(true);
    setLoadingMessage(forceRefresh ? "Generating fresh insights..." : "Analyzing your financial data...");
    setError(null);
    if (forceRefresh) setAiInsight(null); // Clear old one to show loading state
    try {
      const result = await generateFinancialAdvice(
        profile, 
        healthScore, 
        simulation, 
        portfolio,
        (attempt) => {
          setLoadingMessage(`High demand. Retrying analysis... (Attempt ${attempt})`);
        },
        forceRefresh
      );
      setAiInsight(result);
    } catch (err) {
      console.error(err);
      setError("Our AI service is momentarily unreachable. However, your Financial Health Score and Investment Simulator are fully operational.");
    } finally {
      setLoading(false);
    }
  };

  const [chatLoadingMessage, setChatLoadingMessage] = useState<string | null>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isChatting || !healthScore) return;

    const newUserMessage = { role: 'user' as const, parts: [{ text: inputMessage }] };
    const newMessages = [...chatMessages, newUserMessage];
    
    setChatMessages(newMessages);
    setInputMessage('');
    setIsChatting(true);
    setChatLoadingMessage(null);

    try {
      const responseText = await chatWithCoach(
        newMessages, 
        profile, 
        healthScore, 
        portfolio,
        isPidgin,
        (attempt) => {
          setChatLoadingMessage(`High demand. Retrying... (Attempt ${attempt})`);
        }
      );
      setChatMessages([...newMessages, { role: 'model', parts: [{ text: responseText }] }]);
    } catch (err) {
      setChatMessages([...newMessages, { role: 'model', parts: [{ text: "Sorry, I encountered an error. Please try again." }] }]);
    } finally {
      setIsChatting(false);
      setChatLoadingMessage(null);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Auto-generate if not present
  useEffect(() => {
    if (!aiInsight && profile.monthlyIncome && healthScore && !loading && !error) {
      handleGenerate(false);
    }
  }, [aiInsight, profile.monthlyIncome, healthScore, loading, error]);

  if (!profile.monthlyIncome) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Profile Incomplete</h2>
        <p className="text-muted-foreground mb-8">Please complete your profile to access the AI Coach.</p>
        <Button onClick={() => window.location.href = '/onboarding'}>Complete Profile</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Link to="/dashboard">
          <Button variant="ghost" className="gap-2 pl-0 hover:pl-2 transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-gradient-to-br from-primary to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/30">
          <BrainCircuit className="w-10 h-10 text-white animate-pulse" />
        </div>
        <h1 className="text-5xl font-bold font-display tracking-tight">AI Financial Coach</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-medium">
          Get personalized, data-driven advice based on your unique financial profile, goals, and Nigerian market realities.
        </p>
      </div>

      {!aiInsight && !loading && !error && (
        <div className="flex justify-center mt-8">
          <Button size="lg" onClick={() => handleGenerate(false)} className="px-10 py-8 text-xl shadow-xl shadow-primary/30 rounded-2xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 hover:-translate-y-1 transition-all duration-300">
            Generate Analysis <span className="ml-2">✨</span>
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-muted-foreground animate-pulse">{loadingMessage}</p>
        </div>
      )}

      {error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-amber-500/30 bg-amber-500/5 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
            <CardContent className="flex flex-col md:flex-row items-start md:items-center gap-6 p-6">
              <div className="p-3 bg-amber-500/10 rounded-full shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="font-bold text-amber-500 text-lg">Coach Unavailable</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  {error}
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => handleGenerate(true)} 
                className="border-amber-500/30 hover:bg-amber-500/10 text-amber-500 hover:text-amber-400 whitespace-nowrap shrink-0"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {aiInsight && (
        <div className="flex justify-end mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleGenerate(true)} 
            disabled={loading}
            className="gap-2 border-primary/20 hover:bg-primary/10 text-primary"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh Advice
          </Button>
        </div>
      )}

      {aiInsight && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Key Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {aiInsight.insights.map((text, i) => (
              <Card key={i} className="bg-primary/5 border-primary/10 hover:bg-primary/10 transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> Insight {i + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Risks & Roadmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="text-amber-500 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Behavioral Risks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {aiInsight.risks.map((risk, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 text-xs font-bold shrink-0">
                        {i + 1}
                      </span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardHeader>
                <CardTitle className="text-emerald-500 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" /> 90-Day Roadmap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:h-full before:w-[2px] before:bg-emerald-500/20">
                  {Object.entries(aiInsight.roadmap).map(([month, item], i) => (
                    <div key={month} className="relative pl-8">
                      <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center z-10">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      </div>
                      <h4 className="font-bold text-emerald-400 capitalize mb-1">Month {i + 1}</h4>
                      {typeof item === 'string' ? (
                        <p className="text-sm text-muted-foreground">{item}</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-white">{(item as any).objective}</p>
                          {(item as any).actions && Array.isArray((item as any).actions) && (
                            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                              {(item as any).actions.map((act: string, j: number) => (
                                <li key={j}>{act}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Chat Interface */}
          <Card className="border-primary/20 bg-card shadow-xl">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-primary" /> Ask Your Coach
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Have specific questions about inflation, Japa planning, or your portfolio? Ask below.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-lg border border-border">
                  <button 
                    onClick={() => setIsPidgin(false)}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${!isPidgin ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    English
                  </button>
                  <button 
                    onClick={() => setIsPidgin(true)}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${isPidgin ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Pidgin
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-4 opacity-50">
                    <BrainCircuit className="w-12 h-12" />
                    <p>I'm ready to answer your financial questions.</p>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary/20 text-primary' : 'bg-gradient-to-br from-primary to-purple-600 text-white'}`}>
                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <BrainCircuit className="w-4 h-4" />}
                      </div>
                      <div className={`px-4 py-3 rounded-2xl max-w-[80%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.parts[0].text}</p>
                      </div>
                    </div>
                  ))
                )}
                {isChatting && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shrink-0">
                      <BrainCircuit className="w-4 h-4 text-white" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-muted rounded-tl-sm flex items-center gap-2">
                      {chatLoadingMessage ? (
                        <span className="text-xs text-muted-foreground animate-pulse">{chatLoadingMessage}</span>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                        </>
                      )}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-border bg-muted/30">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask about T-Bills, inflation, or your goals..."
                    className="flex-1 bg-background border border-input rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={isChatting}
                  />
                  <Button type="submit" disabled={!inputMessage.trim() || isChatting} className="rounded-xl px-4">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
