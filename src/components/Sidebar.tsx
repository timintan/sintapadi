import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  Sun, 
  Factory, 
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Menu,
  Wheat
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: ClipboardCheck, label: 'Identifikasi Panen', path: '/identifikasi' },
  { 
    icon: Sun, 
    label: 'Pengeringan', 
    path: '/pengeringan',
    subItems: [
      { label: 'Tahap 1', path: '/pengeringan/tahap1' },
      { label: 'Tahap 2', path: '/pengeringan/tahap2' },
    ]
  },
  { icon: Factory, label: 'Penggilingan', path: '/penggilingan' },
  { icon: SettingsIcon, label: 'Pengaturan', path: '/settings' },
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const [expandedMenu, setExpandedMenu] = React.useState<string | null>('Pengeringan');

  return (
    <aside className={cn(
      "h-screen fixed left-0 top-0 bg-slate-900 text-slate-300 flex flex-col shrink-0 z-50 transition-all duration-300",
      isCollapsed ? "w-20" : "w-64",
      "lg:translate-x-0",
      isMobileOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* HEADER */}
      <div className={cn(
        "p-6 border-b border-slate-800 flex items-center justify-between",
        isCollapsed ? "px-5" : "px-6"
      )}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex-shrink-0 w-9 h-9 bg-primary rounded-lg flex items-center justify-center font-bold text-yellow-400 shadow-lg shadow-primary/20">
            <Wheat className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="whitespace-nowrap"
            >
              <h1 className="font-bold text-white tracking-tight leading-tight uppercase">SINTA PADI</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Jawa Tengah</p>
            </motion.div>
          )}
        </div>
        
        {/* COLLAPSE BUTTON (Desktop) */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* CLOSE BUTTON (Mobile) */}
        <button 
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
        {menuItems.map((item) => (
          <div key={item.path} className="space-y-1">
            {item.subItems ? (
              <div className="relative group">
                <button
                  onClick={() => {
                    if (isCollapsed) setIsCollapsed(false);
                    setExpandedMenu(expandedMenu === item.label ? null : item.label);
                  }}
                  className={cn(
                    "w-full flex items-center px-3 py-2.5 rounded-md transition-all group",
                    expandedMenu === item.label ? "text-white" : "text-slate-400 hover:text-white",
                    isCollapsed && "justify-center px-0"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 group-hover:text-primary transition-colors" />
                    {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown className={cn("w-4 h-4 ml-auto transition-transform", expandedMenu === item.label && "rotate-180")} />
                  )}
                </button>
                {expandedMenu === item.label && !isCollapsed && (
                  <div className="pl-11 space-y-1 mt-1">
                    {item.subItems.map((sub) => (
                      <NavLink
                        key={sub.path}
                        to={sub.path}
                        className={({ isActive }) => cn(
                          "block px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                          isActive 
                            ? "text-primary border-l-2 border-primary pl-4" 
                            : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        {sub.label}
                      </NavLink>
                    ))}
                  </div>
                )}
                {/* TOOLTIP ON COLLAPSED */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] border border-slate-700">
                    {item.label}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative group">
                <NavLink
                  to={item.path}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all group",
                    isCollapsed && "justify-center px-0",
                    isActive 
                      ? "bg-slate-800 text-white" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className="w-5 h-5 group-hover:text-primary transition-colors" />
                  {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                </NavLink>
                {/* TOOLTIP ON COLLAPSED */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] border border-slate-700">
                    {item.label}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className={cn(
        "p-4 mt-auto border-t border-slate-800 overflow-hidden",
        isCollapsed && "px-0 flex justify-center"
      )}>
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex-shrink-0 w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-400">
            SJ
          </div>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="overflow-hidden"
            >
              <p className="text-sm font-semibold text-white truncate">Surveyor Jateng</p>
              <p className="text-[10px] text-slate-500 truncate">Online Sync Active</p>
            </motion.div>
          )}
        </div>
      </div>
    </aside>
  );
}
