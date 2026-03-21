import { ReactNode, isValidElement, cloneElement, ReactElement } from 'react';
import { Navbar } from './Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { MouseSpotlight } from '@/components/ui/MouseSpotlight';
import { ParticleTrail } from '@/components/ui/ParticleTrail';

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30 relative overflow-hidden transition-colors duration-300">
      <MouseSpotlight />
      <ParticleTrail />
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {isValidElement(children) ? cloneElement(children as ReactElement<any>, { location, key: location.pathname }) : children}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="border-t border-border py-8 mt-auto relative z-10">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} VuraNaija. Built for Nigerian Youth.</p>
        </div>
      </footer>
    </div>
  );
}
