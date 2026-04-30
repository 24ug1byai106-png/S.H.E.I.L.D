import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UploadCloud, 
  Activity, 
  BarChart, 
  Bell, 
  Map as MapIcon, 
  History, 
  Search, 
  User, 
  Shield, 
  CircleDot
} from 'lucide-react';
import { cn } from '../lib/utils';
import logo from '../assets/logo.jpg';
import { motion, AnimatePresence } from 'framer-motion';
import { getAlerts } from '../lib/api';

export const Layout = () => {
  const location = useLocation();
  const [alerts, setAlerts] = useState([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await getAlerts();
        setAlerts(data);
      } catch (err) {
        console.error("Alert fetch failed", err);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Upload Report', path: '/', icon: UploadCloud },
    { name: 'Live Map', path: '/live-map', icon: MapIcon },
    { name: 'Insights', path: '/insights', icon: BarChart },
    { name: 'Reports History', path: '/history', icon: History },
  ];

  const unreadCount = alerts.length;

  return (
    <div className="flex min-h-screen w-full bg-[#0a0b0d] text-slate-100 overflow-hidden relative font-sans">
      
      {/* Sidebar Navigation (Shield Theme) */}
      <aside className="w-[260px] flex flex-col border-r border-white/5 bg-[#0f1115] relative z-20">
        <div className="p-8 pb-10 flex flex-col items-center gap-4">
          <img src={logo} alt="S.H.I.E.L.D. Logo" className="w-24 h-24 object-contain rounded-full border-2 border-brand-orange shadow-2xl shadow-brand-orange/30 animate-in zoom-in duration-700" />
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black tracking-[0.2em] text-white">S.H.I.E.L.D.</span>
            <div className="h-0.5 w-12 bg-brand-orange mt-1 rounded-full" />
          </div>
        </div>

        <div className="px-8 mb-6">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Command Center</p>
          <p className="text-xs font-medium text-slate-400">City Operator</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 relative group",
                  isActive ? "text-brand-orange bg-brand-orange/5" : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-bar"
                    className="absolute left-0 top-2 bottom-2 w-1 bg-brand-orange rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5", isActive ? "text-brand-orange" : "text-slate-500 group-hover:text-slate-300")} />
                <span className="text-sm font-semibold tracking-tight">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center gap-2">
               <CircleDot className="w-3 h-3 text-emerald-500 animate-pulse" />
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Status: Optimal</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Latency: 14ms</p>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-orange to-brand-red flex items-center justify-center font-bold text-xs text-white">
            GV
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">Gov Official</p>
            <p className="text-[10px] text-slate-500 truncate">Emergency Response</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 h-screen overflow-hidden flex flex-col">
        
        {/* Shield Top Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-[#0a0b0d]/80 backdrop-blur-md">
          
          <div className="flex-1 max-w-xl">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-brand-orange transition-colors" />
              <input 
                type="text" 
                placeholder="Search data points..." 
                className="w-full bg-[#16181d] border border-white/5 rounded-full py-2.5 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-brand-orange/50 focus:ring-4 focus:ring-brand-orange/10 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
             <button 
              onClick={() => setShowNotificationPanel(!showNotificationPanel)}
              className="relative p-2 text-slate-400 hover:text-white transition-colors"
             >
               <Bell className="w-5 h-5" />
               {unreadCount > 0 && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0a0b0d]" />}
             </button>
             <button className="w-9 h-9 rounded-full bg-[#16181d] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-brand-orange/50 transition-all">
               <User className="w-5 h-5" />
             </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-auto p-10 relative custom-scrollbar">
          <Outlet />
        </div>

        {/* Global Notifications Panel (floating) */}
        <AnimatePresence>
          {showNotificationPanel && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="fixed top-24 right-8 w-96 bg-[#0f1115] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[3000] overflow-hidden"
            >
              <div className="p-5 border-b border-white/5 bg-red-500/5 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-red-400">Emergency Broadcasts</h3>
                <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">{alerts.length} New</span>
              </div>
              <div className="max-h-[450px] overflow-y-auto">
                {alerts.map(alert => (
                  <Link 
                    key={alert.id} 
                    to={`/report/${alert.report_id}`} 
                    className="block p-5 border-b border-white/5 hover:bg-white/5 transition-all group"
                    onClick={() => setShowNotificationPanel(false)}
                  >
                    <div className="flex justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      <span className="text-[10px] font-black text-red-500">{alert.payload.risk_level}</span>
                    </div>
                    <p className="text-sm font-bold text-white group-hover:text-brand-orange transition-colors">{alert.payload.location_name}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{alert.payload.ai_explanation}</p>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
