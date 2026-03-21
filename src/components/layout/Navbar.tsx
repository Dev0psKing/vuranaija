import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Menu, X, TrendingUp, ShieldCheck, BookOpen, BrainCircuit, LayoutDashboard, PieChart, Calculator, Store, FileText, Plane, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const mainNavItems = [
    { name: 'Home', path: '/', icon: TrendingUp },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Portfolio', path: '/portfolio', icon: PieChart },
    { name: 'Market', path: '/market', icon: Store },
    { name: 'Simulator', path: '/simulator', icon: Calculator },
  ];

  const moreNavItems = [
    { name: 'Health', path: '/health', icon: ShieldCheck },
    { name: 'Coach', path: '/coach', icon: BrainCircuit },
    { name: 'Debt', path: '/debt', icon: Calculator },
    { name: 'Japa', path: '/japa', icon: Plane },
    { name: 'Learn', path: '/learn', icon: BookOpen },
    { name: 'Ledger', path: '/transactions', icon: FileText },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl transition-colors duration-300">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center space-x-2 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl md:text-2xl tracking-tight text-foreground hidden sm:block">
            Vura<span className="gradient-text">Naija</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center space-x-1 flex-1 justify-center">
          {mainNavItems.map((item) => (
            <Link key={item.path} to={item.path} className="shrink-0">
              <Button
                variant="ghost"
                className={cn(
                  "text-sm font-semibold transition-all duration-300 rounded-xl px-3",
                  location.pathname === item.path ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="w-4 h-4 mr-1.5" />
                {item.name}
              </Button>
            </Link>
          ))}

          {/* More Dropdown */}
          <div className="relative" ref={moreRef}>
            <Button
              variant="ghost"
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className={cn(
                "text-sm font-semibold transition-all duration-300 rounded-xl px-3",
                moreNavItems.some(item => location.pathname === item.path) ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              More
              <ChevronDown className={cn("w-4 h-4 ml-1 transition-transform", isMoreOpen && "rotate-180")} />
            </Button>

            <AnimatePresence>
              {isMoreOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
                >
                  <div className="p-1">
                    {moreNavItems.map((item) => (
                      <Link key={item.path} to={item.path} onClick={() => setIsMoreOpen(false)}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start text-sm font-medium rounded-lg px-3 py-2",
                            location.pathname === item.path ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          )}
                        >
                          <item.icon className="w-4 h-4 mr-2" />
                          {item.name}
                        </Button>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="hidden lg:flex items-center space-x-3 shrink-0">
          <ThemeToggle />
          <Link to="/onboarding">
            <Button variant="default" className="rounded-xl shadow-lg shadow-primary/20 whitespace-nowrap">Get Started</Button>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button className="p-2 text-foreground" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-b border-border bg-background"
          >
            <div className="flex flex-col p-4 space-y-2">
              {[...mainNavItems, ...moreNavItems].map((item) => (
                <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start",
                      location.pathname === item.path ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Button>
                </Link>
              ))}
              <div className="pt-4 border-t border-border">
                <Link to="/onboarding" onClick={() => setIsOpen(false)}>
                  <Button className="w-full">Get Started</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
