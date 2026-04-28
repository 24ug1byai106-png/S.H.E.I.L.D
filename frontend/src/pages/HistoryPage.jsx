import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { 
  Clock, 
  Search, 
  Filter, 
  MapPin, 
  ChevronRight, 
  AlertTriangle, 
  FileImage, 
  Calendar,
  ArrowUpDown,
  Loader2,
  Inbox
} from 'lucide-react';
import { getReports } from '../lib/api';

const cn = (...classes) => classes.filter(Boolean).join(' ');

export const HistoryPage = () => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const data = await getReports(0, 100);
        const mapped = data.map(r => ({
          id: r.id,
          filename: r.original_filename,
          category: r.category,
          damageType: r.damage_type,
          severity: r.severity,
          confidence: r.confidence,
          alertTriggered: r.alert_triggered,
          locationName: r.location_name || 'Unknown Location',
          createdAt: r.created_at ? new Date(r.created_at) : new Date(),
          createdAtStr: r.created_at ? new Date(r.created_at).toLocaleString() : 'Unknown',
        }));
        setReports(mapped);
      } catch (err) {
        console.error('History fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  // Filter & sort
  const filtered = reports
    .filter(r => {
      if (severityFilter !== 'ALL' && r.severity !== severityFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.damageType.toLowerCase().includes(q) ||
          r.locationName.toLowerCase().includes(q) ||
          r.filename.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') return b.createdAt - a.createdAt;
      if (sortOrder === 'oldest') return a.createdAt - b.createdAt;
      if (sortOrder === 'severity') {
        const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
      }
      return 0;
    });

  const severityColorMap = {
    HIGH: 'text-red-400',
    CRITICAL: 'text-red-500',
    MEDIUM: 'text-amber-400',
    LOW: 'text-blue-400',
  };

  const severityBgMap = {
    HIGH: 'bg-red-500/10',
    CRITICAL: 'bg-red-500/15',
    MEDIUM: 'bg-amber-500/10',
    LOW: 'bg-blue-500/10',
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Reports History</h1>
          <p className="text-slate-500 text-sm font-medium">
            Complete archive of all infrastructure analysis reports · {reports.length} total records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#16181d] p-1 rounded-xl border border-white/5">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all",
                  severityFilter === s 
                    ? "bg-brand-orange text-white shadow-lg shadow-brand-orange/20" 
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search & Sort Bar */}
      <GlassCard className="p-4 border-white/5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-brand-orange transition-colors" />
            <input
              type="text"
              placeholder="Search by damage type, location, filename..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#16181d] border border-white/5 rounded-xl py-3 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-brand-orange/50 focus:ring-4 focus:ring-brand-orange/10 transition-all placeholder:text-slate-600"
            />
          </div>
          <button
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : prev === 'oldest' ? 'severity' : 'newest')}
            className="flex items-center gap-2 px-5 py-3 bg-[#16181d] border border-white/5 rounded-xl text-sm text-slate-400 hover:text-white hover:border-brand-orange/30 transition-all"
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {sortOrder === 'newest' ? 'Newest First' : sortOrder === 'oldest' ? 'Oldest First' : 'By Severity'}
            </span>
          </button>
        </div>
      </GlassCard>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-brand-orange animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading report archives...</p>
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-16 text-center border-white/5">
          <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Reports Found</h3>
          <p className="text-sm text-slate-500">
            {searchQuery || severityFilter !== 'ALL' 
              ? 'Try adjusting your filters or search query.' 
              : 'No analysis reports have been submitted yet.'}
          </p>
          <Link to="/" className="inline-block mt-6 text-brand-orange text-xs font-bold hover:underline uppercase tracking-widest">
            Submit First Report →
          </Link>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((report, idx) => (
            <Link key={report.id} to={`/report/${report.id}`} className="block group">
              <GlassCard 
                className="p-0 overflow-hidden border-white/5 hover:border-brand-orange/20 transition-all duration-300"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-stretch">
                  {/* Severity Indicator Strip */}
                  <div className={cn(
                    "w-1.5 shrink-0",
                    report.severity === 'HIGH' || report.severity === 'CRITICAL' ? 'bg-red-500' :
                    report.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'
                  )} />

                  <div className="flex-1 p-5 flex items-center gap-6">
                    {/* Icon */}
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                      severityBgMap[report.severity] || 'bg-white/5'
                    )}>
                      {report.alertTriggered 
                        ? <AlertTriangle className={cn("w-5 h-5", severityColorMap[report.severity])} />
                        : <FileImage className={cn("w-5 h-5", severityColorMap[report.severity] || 'text-slate-400')} />
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-bold text-white group-hover:text-brand-orange transition-colors truncate">
                          {report.damageType}
                        </h3>
                        <Badge level={
                          report.severity === 'HIGH' || report.severity === 'CRITICAL' ? 'Critical' :
                          report.severity === 'MEDIUM' ? 'Moderate' : 'Infrastructure'
                        }>
                          {report.severity}
                        </Badge>
                        {report.alertTriggered && (
                          <span className="text-[8px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                            Alert Fired
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 font-medium">
                          <MapPin className="w-3 h-3 text-brand-orange" />
                          {report.locationName}
                        </span>
                        <span className="flex items-center gap-1 uppercase tracking-widest font-bold">
                          <Filter className="w-3 h-3" />
                          {report.category}
                        </span>
                        <span className="font-mono">{(report.confidence * 100).toFixed(0)}% conf</span>
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {report.createdAt.toLocaleDateString()}
                        </p>
                        <p className="text-[9px] text-slate-600 font-mono mt-0.5">
                          {report.createdAt.toLocaleTimeString()}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-brand-orange group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
