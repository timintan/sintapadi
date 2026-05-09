import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { cn } from '../lib/utils';

export function Layout() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Apply theme class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <div className="flex bg-[var(--bg-main)] min-h-screen transition-colors duration-300">
      {/* MOBILE OVERLAY */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      
      <main className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-300",
        isCollapsed ? "lg:ml-20" : "lg:ml-64",
        "ml-0" // No margin on mobile
      )}>
        {/* HEADER */}
        <header className="h-16 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-4 lg:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black text-[var(--text-main)] tracking-tight uppercase">SINTA PADI</h1>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Provinsi Jawa Tengah • 2026</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-black text-[var(--text-main)] tracking-tight uppercase">SINTA PADI</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={isDark ? "Ganti ke Light Mode" : "Ganti ke Dark Mode"}
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            <div className="hidden sm:flex flex-col items-end">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Status API</p>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-semibold text-[var(--text-muted)]">Online</span>
              </div>
            </div>
            <div className="h-8 w-px bg-[var(--border-color)]"></div>
            <button className="p-2 text-slate-400 hover:text-primary transition-colors">
              <div className="w-8 h-8 rounded-full bg-[var(--bg-input)] border border-[var(--border-color)] flex items-center justify-center">
                <span className="text-xs font-bold text-[var(--text-main)]">SJ</span>
              </div>
            </button>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="p-4 lg:p-8 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
