import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { motion, useMotionValue, useTransform, useSpring, useMotionTemplate } from 'framer-motion';
import { TrendingUp, ShieldCheck, BrainCircuit, Home } from 'lucide-react';

function TiltCard({ children, className }: { children: React.ReactNode, className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    
    const width = rect.width;
    const height = rect.height;
    
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    const xPct = clientX / width - 0.5;
    const yPct = clientY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
    mouseX.set(clientX);
    mouseY.set(clientY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    mouseX.set(0);
    mouseY.set(0);
  };

  const bg = useMotionTemplate`radial-gradient(
    400px circle at ${mouseX}px ${mouseY}px,
    rgba(255, 255, 255, 0.1),
    transparent 80%
  )`;

  const border = useMotionTemplate`radial-gradient(
    200px circle at ${mouseX}px ${mouseY}px,
    rgba(255, 255, 255, 0.3),
    transparent 80%
  )`;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateY,
        rotateX,
        transformStyle: "preserve-3d",
      }}
      className={`relative transition-all duration-200 ease-out group rounded-3xl ${className}`}
    >
      {/* Border Glow */}
      <motion.div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ 
          background: border,
          padding: '1px',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
        }}
      />
      
      {/* Spotlight Background */}
      <motion.div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: bg }}
      />

      <div style={{ transform: "translateZ(75px)", transformStyle: "preserve-3d" }} className="relative z-10 h-full">
        {children}
      </div>
    </motion.div>
  );
}

function MagneticButton({ children, className }: { children: React.ReactNode, className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current!.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    x.set((clientX - centerX) * 0.3);
    y.set((clientY - centerY) * 0.3);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x, y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Landing() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-16 perspective-1000">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
        className="relative z-10"
      >
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute -top-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl -z-10" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            x: [0, 50, 0],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl -z-10" 
        />
        
        <h1 className="text-5xl md:text-8xl font-bold font-display tracking-tighter mb-6 relative">
          Build Wealth <span className="gradient-text inline-block hover:scale-110 transition-transform cursor-default">Smarter</span>.
          <br />
          Start With <span className="text-emerald-500 dark:text-emerald-400 inline-block hover:scale-110 transition-transform cursor-default">₦10,000</span>.
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
          The intelligent wealth manager that automatically saves, invests, and multiplies your money while you sleep.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link to="/onboarding">
            <Button 
              size="lg" 
              className="text-lg px-10 py-8 relative overflow-hidden group transition-all hover:-translate-y-1 bg-primary hover:bg-primary/90 rounded-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl group-hover:blur-2xl" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              <span className="relative z-10 flex items-center gap-2 font-bold">
                Create Free Account
              </span>
            </Button>
          </Link>
          <Link to="/market">
            <Button variant="outline" size="lg" className="text-lg px-10 py-8 hover:bg-accent hover:-translate-y-1 transition-all rounded-2xl border-2">
              View Market Rates
            </Button>
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl px-4">
        {[
          {
            icon: TrendingUp,
            title: "Automated Wealth Routing",
            desc: "Connect your bank and let our AI automatically sweep, save, and invest your spare cash into high-yield assets.",
            color: "text-blue-500 dark:text-blue-400",
            bg: "bg-blue-500/10"
          },
          {
            icon: ShieldCheck,
            title: "Secure & Regulated Partners",
            desc: "We partner with SEC-licensed fund managers. Your investments are held in secure custodial accounts, ensuring safety and compliance.",
            color: "text-emerald-500 dark:text-emerald-400",
            bg: "bg-emerald-500/10"
          },
          {
            icon: BrainCircuit,
            title: "AI Financial Coach",
            desc: "Receive personalized, data-driven advice based on your real-time spending and investment portfolio.",
            color: "text-amber-500 dark:text-amber-400",
            bg: "bg-amber-500/10"
          }
        ].map((feature, i) => (
          <div key={i} className="h-full">
            <TiltCard className="h-full">
              <div className="h-full p-8 rounded-3xl bg-card border border-border shadow-xl hover:shadow-2xl hover:border-primary/30 transition-all group">
                <div className={`w-16 h-16 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 ${feature.color} group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4 font-display text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">{feature.desc}</p>
              </div>
            </TiltCard>
          </div>
        ))}
      </div>
    </div>
  );
}
