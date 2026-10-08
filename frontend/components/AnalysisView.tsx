import React, { useState } from 'react';
import { AccountDashboard } from './AccountDashboard';
import { Building2, Globe, Zap, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { runAnalysis } from '../services/analysis.service';
import { RunAnalysisResponse, ReportData } from '../types';
import { fromRunResponse } from './analysis/normalise';
import { AnalysisReport } from './analysis/AnalysisReport';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Props {
  awsFundingEnabled?: boolean;
  onNavigateToLibrary: (term: string) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  report: ReportData | null;
  setReport: (v: ReportData | null) => void;
  error: string | null;
  setError: (v: string | null) => void;
  stepIdx: number;
  setStepIdx: (v: number) => void;
  stepTimer: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
}

const STEPS = [
  'Researching company profile…',
  'Mapping technology stack…',
  'Finding decision makers…',
  'Analysing competitive gaps…',
  'Preparing sales recommendations…',
  'Building strategic roadmap…',
  'Finalising intelligence brief…',
];

export const AnalysisView: React.FC<Props> = ({
  awsFundingEnabled = true,
  onNavigateToLibrary,
  loading, setLoading,
  report, setReport,
  error, setError,
  stepIdx, setStepIdx,
  stepTimer,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');

  const startStepCycle = () => {
    let i = 0;
    const iv = setInterval(() => {
      i = (i + 1) % STEPS.length;
      setStepIdx(i);
    }, 3500);
    stepTimer.current = iv;
    return iv;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setError(null);
    setReport(null);
    setLoading(true);
    setStepIdx(0);
    const iv = startStepCycle();
    try {
      const res = await runAnalysis({ customerName: customerName.trim(), companyDomain: companyDomain.trim() });
      const data: RunAnalysisResponse = res.data;
      const rd = fromRunResponse(data);
      setReport(rd);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.response?.data?.message ?? 'Analysis failed. Please try again.');
    } finally {
      clearInterval(iv);
      stepTimer.current = null;
      setLoading(false);
    }
  };

  const reset = () => { setReport(null); setCustomerName(''); setCompanyDomain(''); setError(null); };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <AccountDashboard />

      {/* Input card */}
      {!report && (
        <div className="text-center space-y-6 py-12 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-teal-100 shadow-sm">
            <Sparkles className="w-4 h-4 text-teal-500" />
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wide">ACCOUNT INTELLIGENCE</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Company Intelligence<br />
            <span className="text-gradient">for Sales Teams</span>
          </h1>
          <p className="text-slate-500 text-base leading-relaxed max-w-xl mx-auto">
            Enter a company name and domain. Our AI research pipeline builds an account profile, maps decision makers, identifies relevant services{awsFundingEnabled ? ' and funding programs' : ''}, and prepares a strategic roadmap.
          </p>
        </div>
      )}

      <div className={`mx-auto transition-all duration-500 ${report ? 'max-w-full' : 'max-w-2xl'}`}>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Company Name</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Infosys"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Company Domain</label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. infosys.com"
                  value={companyDomain}
                  onChange={e => setCompanyDomain(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {report && (
                <button type="button" onClick={reset}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-bold transition-all">
                  <RefreshCw className="w-4 h-4" /> New
                </button>
              )}
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-teal-600 text-white text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {loading ? 'Running…' : 'Run Analysis'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-5">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
            <div className="absolute inset-0 rounded-full border-4 border-teal-600 border-t-transparent animate-spin" />
            <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700 animate-pulse">{STEPS[stepIdx]}</p>
            <p className="text-xs text-slate-400 mt-1">Multi-agent pipeline running with web search…</p>
          </div>
          <div className="flex justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= stepIdx ? 'bg-teal-600 w-6' : 'bg-slate-200 w-3'}`} />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-700 font-medium">
          ⚠ {error}
        </div>
      )}

      {/* Report */}
      {report && !loading && <AnalysisReport report={report} showDownload={true} onNavigateToLibrary={onNavigateToLibrary} />}
    </div>
  );
};
