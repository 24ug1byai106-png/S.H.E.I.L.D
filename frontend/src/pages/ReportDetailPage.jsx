import React from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ArrowLeft, CheckCircle2, AlertOctagon, Info, Calendar, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

import { getReportById } from '../lib/api';

export const ReportDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();

  const normalizeData = (raw) => {
    if (!raw) return null;
    return {
      id: raw.id || raw.report_id,
      timestamp: raw.created_at || raw.analyzed_at || new Date().toISOString(),
      analysis: {
        damageType: raw.damage_type,
        severityScore: typeof raw.confidence === 'string' ? parseFloat(raw.confidence) / 100 : raw.confidence,
        riskLevel: raw.severity,
        explanation: raw.recommendation || raw.explanation,
      },
      image_path: raw.image_path,
      detections: raw.detections
    };
  };

  const [data, setData] = React.useState(normalizeData(location.state?.reportData));
  const [isLoading, setIsLoading] = React.useState(!data);

  React.useEffect(() => {
    if (!data) {
      const fetchReport = async () => {
        try {
          const report = await getReportById(id);
          setData(normalizeData(report));
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchReport();
    }
  }, [id, data]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <div>Report not found.</div>;

  const preview = location.state?.imagePreview || (data.image_path ? `http://localhost:8000/uploads/${data.image_path.split(/[\\/]/).pop()}` : 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80');

  const severityColor = 
    data.analysis.riskLevel === 'High' ? 'text-brand-red bg-brand-red/10' :
    data.analysis.riskLevel === 'Medium' ? 'text-yellow-400 bg-yellow-400/10' :
    'text-emerald-400 bg-emerald-400/10';

  const severityBorder = 
    data.analysis.riskLevel === 'High' ? 'border-brand-red/30' :
    data.analysis.riskLevel === 'Medium' ? 'border-yellow-400/30' :
    'border-emerald-400/30';

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <Link to="/dashboard" className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors group">
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Image & Quick Stats */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-2 overflow-hidden border-white/10">
            <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-black/50 group">
              <img 
                src={preview} 
                alt="Analyzed Building" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              {/* Fake AI detection bounding boxes */}
              {data.analysis.riskLevel === 'High' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="absolute top-1/4 left-1/3 w-32 h-32 border-2 border-brand-red bg-brand-red/10 rounded-sm z-10"
                >
                  <span className="absolute -top-6 left-0 bg-brand-red text-white text-xs px-2 py-0.5 rounded font-bold">
                    Crack Detected (92%)
                  </span>
                </motion.div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Info className="w-5 h-5 text-brand-orange mr-2" />
              AI Diagnostic Summary
            </h3>
            <p className="text-slate-300 leading-relaxed text-lg">
              {data.analysis.explanation}
            </p>
          </GlassCard>
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          <GlassCard className={`border ${severityBorder} relative overflow-hidden`}>
            {/* Background glow based on severity */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mr-10 -mt-10 ${severityColor} opacity-50`} />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-slate-400 text-sm font-medium mb-1">Risk Level</p>
                  <h2 className="text-3xl font-bold tracking-tight text-white">{data.analysis.riskLevel}</h2>
                </div>
                <Badge level={data.analysis.riskLevel} className="scale-110 origin-top-right">{data.analysis.riskLevel}</Badge>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Severity Score</span>
                    <span className="font-bold text-white">{(data.analysis.severityScore * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${data.analysis.severityScore * 100}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        data.analysis.riskLevel === 'High' ? 'bg-brand-red' : 
                        data.analysis.riskLevel === 'Medium' ? 'bg-yellow-500' : 
                        'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-slate-400 text-sm font-medium mb-1">Detected Issue</p>
                  <p className="text-lg font-medium text-white flex items-center">
                    {data.analysis.riskLevel === 'High' ? <AlertOctagon className="w-5 h-5 text-brand-red mr-2" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2" />}
                    {data.analysis.damageType}
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="border-white/10 space-y-4">
            <div className="flex items-center text-sm">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mr-4 shrink-0">
                <Activity className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-400">Report ID</p>
                <p className="font-mono text-white tracking-wider">{data.id.toUpperCase()}</p>
              </div>
            </div>
            
            <div className="flex items-center text-sm">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mr-4 shrink-0">
                <Calendar className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-400">Timestamp</p>
                <p className="text-white">{new Date(data.timestamp).toLocaleString()}</p>
              </div>
            </div>
          </GlassCard>

          <Button variant="primary" className="w-full" onClick={() => window.print()}>
            Export PDF Report
          </Button>
          {data.analysis.riskLevel === 'High' && (
            <Button variant="danger" className="w-full">
              Dispatch Inspection Team
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
