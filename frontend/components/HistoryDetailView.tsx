import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { downloadReportPdf, getReportById } from '../services/analysis.service';
import { SavedReport, ReportData } from '../types';
import { fromSavedReport } from './analysis/normalise';
import { AnalysisReport } from './analysis/AnalysisReport';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Loader2, Calendar, RefreshCw } from 'lucide-react';
import { getTargetEvidence, type ResearchEvidence } from '../services/targets.service';
import { ResearchEvidenceView } from './ResearchEvidenceView';

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
  const [evidence, setEvidence] = useState<ResearchEvidence | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceReport, setEvidenceReport] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const isOwner = !!user && !!reportOwnerId && user.id === reportOwnerId;
  const isRegenerating = regeneratingId === id;

  useEffect(() => {
    if (!id) return;
    getReportById(id)
      .then(res => {
        const saved: SavedReport = res.data;
        setReportOwnerId(saved.userId);
        setReport(fromSavedReport(saved));
        setEvidenceReport(saved.researchStatus === 'complete' || saved.researchStatus === 'partial');
        if (saved.accountId && saved.researchStatus !== 'legacy') {
          setEvidenceLoading(true);
          void getTargetEvidence(saved.accountId, saved.runId).then(result => setEvidence(result.data))
            .catch(() => setEvidence(null)).finally(() => setEvidenceLoading(false));
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRegenerate = () => {
    if (!id) return;
    onRegenerate(id, (rd) => setReport(rd));
  };

  const downloadEvidencePdf = async () => {
    if (!id) return;
    try {
      const { data } = await downloadReportPdf(id);
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url; link.download = 'Salesdig-evidence-report.pdf'; link.click();
      URL.revokeObjectURL(url);
    } catch { setDownloadError('Could not download PDF. Try again.'); }
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
          {isOwner && !evidenceReport && (
            <button onClick={handleRegenerate} disabled={isRegenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all disabled:opacity-60">
              {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {isRegenerating ? 'Regenerating…' : 'Regenerate'}
            </button>
          )}
        </div>
      </div>

      {evidenceReport ? <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-black text-slate-900">Evidence-backed research</h1><p className="mt-1 text-sm text-slate-500">{report.companyProfile.companyName}. Findings below link to public source excerpts.</p></div><button onClick={() => void downloadEvidencePdf()} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white">Download PDF</button></div>{downloadError && <p role="alert" className="mt-3 text-sm text-red-700">{downloadError}</p>}<div className="mt-5"><ResearchEvidenceView evidence={evidence} loading={evidenceLoading} /></div></section>
        : <AnalysisReport report={report} showDownload={true} onNavigateToLibrary={(name) => { navigate('/library'); }} />}
    </div>
  );
};
