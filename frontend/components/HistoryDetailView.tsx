import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReportById } from '../services/analysis.service';
import { SavedReport, ReportData } from '../types';
import { fromSavedReport } from './analysis/normalise';
import { AnalysisReport } from './analysis/AnalysisReport';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Loader2, Calendar, RefreshCw } from 'lucide-react';

interface Props {
  onRegenerate: (reportId: string, onDone: (r: ReportData) => void) => void;
  regeneratingId: string | null;
}

export const HistoryDetailView: React.FC<Props> = ({ onRegenerate, regeneratingId }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState<ReportData | null>(null);
  const [reportOwnerId, setReportOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isOwner = !!user && !!reportOwnerId && user.id === reportOwnerId;
  const isRegenerating = regeneratingId === id;

  useEffect(() => {
    if (!id) return;
    getReportById(id)
      .then(res => {
        const saved: SavedReport = res.data;
        setReportOwnerId(saved.userId);
        setReport(fromSavedReport(saved));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRegenerate = () => {
    if (!id) return;
    onRegenerate(id, (rd) => setReport(rd));
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
    </div>
  );

  if (error || !report) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-slate-500 mb-4">Report not found.</p>
      <button onClick={() => navigate('/history')} className="text-teal-600 font-bold text-sm hover:underline">
        ← Back to History
      </button>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-20 space-y-5">
      {/* Back + meta bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button onClick={() => navigate('/history')}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to History
        </button>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {report.createdAt && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(report.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {/* {report.meta && (
            <span className="flex items-center gap-1 font-bold text-emerald-600">
              <DollarSign className="w-3.5 h-3.5" />
              ${report.meta.annualSpendUsed.toLocaleString()} est. spend
            </span>
          )} */}
          {isOwner && (
            <button onClick={handleRegenerate} disabled={isRegenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all disabled:opacity-60">
              {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {isRegenerating ? 'Regenerating…' : 'Regenerate'}
            </button>
          )}
        </div>
      </div>

      <AnalysisReport report={report} showDownload={true} onNavigateToLibrary={(name) => { navigate('/library'); }} />
    </div>
  );
};
