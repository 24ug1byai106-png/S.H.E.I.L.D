import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ArrowUpRight, 
  Zap, 
  Maximize2,
  PieChart as PieIcon,
  BarChart2,
  BrainCircuit
} from 'lucide-react';
import { getAnalytics } from '../lib/api';
import { GlassCard } from '../components/ui/GlassCard';

// Color Palette from the Image
const COLORS = {
  critical: '#f97316', // Orange
  medium: '#3b82f6',   // Blue
  minor: '#ec4899',    // Pink
  grid: 'rgba(255, 255, 255, 0.05)',
  text: '#64748b'
};

const districtData = [
  { name: 'NORTH', value: 45 },
  { name: 'SOUTH', value: 30 },
  { name: 'CENTRAL', value: 85 },
  { name: 'EAST', value: 40 },
  { name: 'WEST', value: 55 },
];

const severityData = [
  { name: 'CRITICAL', value: 400, color: COLORS.critical },
  { name: 'MEDIUM', value: 300, color: COLORS.medium },
  { name: 'MINOR', value: 300, color: COLORS.minor },
];

const trendData = [
  { name: 'JAN', incidents: 300 },
  { name: 'FEB', incidents: 420 },
  { name: 'MAR', incidents: 350 },
  { name: 'APR', incidents: 500 },
  { name: 'MAY', incidents: 680 },
  { name: 'JUN', incidents: 610 },
  { name: 'JUL', incidents: 750 },
  { name: 'AUG', incidents: 720 },
  { name: 'SEP', incidents: 842 },
  { name: 'OCT', incidents: 910 },
  { name: 'NOV', incidents: 880 },
  { name: 'DEC', incidents: 950 },
];

export const InsightsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState('MONTHLY');

  useEffect(() => {
    const fetch = async () => {
      const data = await getAnalytics();
      setAnalytics(data);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-black text-white tracking-tighter mb-4">City-Wide Insights</h1>
          <p className="text-slate-500 text-lg leading-relaxed font-medium">
            Aggregate intelligence gathered from all reporting nodes. AI-driven predictive 
            modeling highlights critical infrastructure vulnerabilities.
          </p>
        </div>

        {/* AI Brief Card */}
        <div className="w-full lg:w-[450px] bg-brand-orange/5 border border-brand-orange/20 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BrainCircuit className="w-16 h-16 text-brand-orange" />
          </div>
          <div className="flex items-center gap-2 text-brand-orange mb-4">
            <Zap className="w-4 h-4 fill-brand-orange" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">AI Intelligence Brief</span>
          </div>
          <p className="text-white text-lg font-bold leading-snug mb-6">
            <span className="text-brand-orange">Area X</span> shows high infrastructure degradation and requires urgent intervention. Correlation detected between seasonal runoff and pavement distress.
          </p>
          <div className="flex items-center justify-between">
            <button className="text-[10px] font-black text-white underline underline-offset-4 decoration-brand-orange/50 hover:decoration-brand-orange transition-all uppercase tracking-widest">
              Generate Full Directive
            </button>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confidence: 94.2%</span>
          </div>
        </div>
      </div>

      {/* Middle Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Issues by District */}
        <GlassCard className="p-8 border-white/5 flex flex-col h-[400px]">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Issues by District</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">7-Day Volume</p>
            </div>
            <BarChart2 className="w-5 h-5 text-slate-600" />
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districtData}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} 
                  dy={10}
                />
                <Bar 
                  dataKey="value" 
                  fill={COLORS.critical} 
                  radius={[6, 6, 0, 0]} 
                  barSize={32}
                />
                <ReTooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#0f1115', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Severity Mix */}
        <GlassCard className="p-8 border-white/5 flex flex-col h-[400px]">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Severity Mix</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Priority Allocation</p>
            </div>
            <PieIcon className="w-5 h-5 text-slate-600" />
          </div>
          <div className="flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-white tracking-tighter">1.2k</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Reports</span>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {severityData.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{s.name}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Risk Density Heatmap Preview */}
        <GlassCard className="p-8 border-white/5 flex flex-col h-[400px] overflow-hidden">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Risk Density</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Live Geospatial Heatmap</p>
            </div>
            <Maximize2 className="w-5 h-5 text-slate-600 cursor-pointer hover:text-white transition-colors" />
          </div>
          <div className="flex-1 bg-[#16181d] rounded-2xl relative overflow-hidden">
             {/* Mock Heatmap Texture */}
             <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-orange/40 via-transparent to-transparent animate-pulse" />
             <div className="absolute inset-0" style={{ backgroundImage: 'url("https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/12/2418/1544.png")', backgroundSize: 'cover', mixBlendMode: 'luminosity', opacity: 0.2 }} />
             
             {/* Labels overlay */}
             <div className="absolute bottom-4 left-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                  <span className="text-[10px] font-bold text-white">Zone Alpha (92)</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="text-[10px] font-bold text-white">Residential (12)</span>
                </div>
             </div>
             <div className="absolute bottom-4 right-4 h-1.5 w-20 rounded-full bg-gradient-to-r from-blue-500 via-orange-500 to-red-500" />
          </div>
        </GlassCard>
      </div>

      {/* Trend Intelligence Area Chart */}
      <GlassCard className="p-10 border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">Trend Intelligence</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Incident reports vs mitigation speed (Quarterly)</p>
          </div>
          <div className="flex bg-[#16181d] p-1 rounded-xl border border-white/5">
            {['DAILY', 'MONTHLY', 'YEARLY'].map(t => (
              <button 
                key={t}
                onClick={() => setTimeRange(t)}
                className={cn(
                  "px-6 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all",
                  timeRange === t ? "bg-brand-orange text-white shadow-lg shadow-brand-orange/20" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.critical} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={COLORS.critical} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} 
                dy={20}
              />
              <YAxis hide />
              <ReTooltip 
                contentStyle={{ backgroundColor: '#0f1115', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              />
              <Area 
                type="monotone" 
                dataKey="incidents" 
                stroke={COLORS.critical} 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorIncidents)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Bottom Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-10">
        <StatCard 
          icon={<AlertTriangle className="w-5 h-5" />} 
          label="Critical Hazards" 
          value="12" 
          color="bg-red-500/10 text-red-500" 
        />
        <StatCard 
          icon={<Layers className="w-5 h-5" />} 
          label="Active Tasks" 
          value="142" 
          color="bg-orange-500/10 text-orange-500" 
        />
        <StatCard 
          icon={<CheckCircle2 className="w-5 h-5" />} 
          label="Resolved (30d)" 
          value="892" 
          color="bg-blue-500/10 text-blue-500" 
          trend="+14%"
        />
        <StatCard 
          icon={<Clock className="w-5 h-5" />} 
          label="Response Time" 
          value="4.2h" 
          color="bg-emerald-500/10 text-emerald-500" 
        />
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color, trend }) => (
  <GlassCard className="p-6 border-white/5 flex items-center gap-5 group hover:bg-white/5 transition-all">
    <div className={cn("p-4 rounded-2xl", color)}>
      {icon}
    </div>
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
        {trend && (
          <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500">
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-white mt-1">{value}</p>
    </div>
  </GlassCard>
);

const cn = (...classes) => classes.filter(Boolean).join(' ');
