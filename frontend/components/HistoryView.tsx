import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyReports, deleteReport } from '../services/analysis.service';
import { SavedReport } from '../types';
import { History, Trash2, ExternalLink, Loader2, Cloud, Sparkles, Search, Calendar } from 'lucide-react';

const initials = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

export const HistoryView: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getMyReports()
      .then(res => setReports(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      await deleteReport(id);
      setReports(prev => prev.filter(r => r._id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const filtered = reports.filter(r =>
    r.customerName.toLowerCase().includes(search.toLowerCase()) ||
    r.companyDomain.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-teal-500" /> Analysis History
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{reports.length} saved {reports.length === 1 ? 'report' : 'reports'}</p>
        </div>
      </div>

      {/* Search */}
      {reports.length > 0 && (
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by company or domain…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          />
        </div>
      )}

      {/* Empty */}
      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <History className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">No history yet</h3>
          <p className="text-slate-400 text-sm mb-6">Run your first analysis to see it here.</p>
          <button onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 transition-all">
            Start Analysis
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Company</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell">Domain</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Segment</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Potential</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Programs</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell">Date</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(r => {
                const profile = r.validatedProfile?.verifiedCompany ?? r.validatedProfile ?? {};
                return (
                  <tr key={r._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center text-xs font-black flex-shrink-0">
                          {initials(r.customerName)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{r.customerName}</p>
                          <p className="text-xs text-slate-400">{profile.industry ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs hidden md:table-cell">{r.companyDomain}</td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-xs font-bold text-slate-600">{profile.segment ?? '—'}</span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      {(() => {
                        const score = (profile.salesPotential ?? profile.workmatesPotential)?.overall;
                        if (score == null) return <span className="text-xs text-slate-400">—</span>;
                        const [label, cls] = score >= 70
                          ? ['High', 'text-emerald-700']
                          : score >= 40
                          ? ['Medium', 'text-amber-700']
                          : ['Low', 'text-rose-600'];
                        return (
                          <span className={`flex items-center gap-1.5 text-xs font-semibold ${cls}`}>
                            <Cloud className="w-3.5 h-3.5" />{label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                        <Sparkles className="w-3 h-3" />{r.recommendations.length}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs hidden md:table-cell">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => navigate(`/history/${r._id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-all">
                          <ExternalLink className="w-3.5 h-3.5" /> View
                        </button>
                        <button
                          onClick={e => handleDelete(r._id, e)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                          {deleting === r._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">No results for "{search}"</div>
          )}
        </div>
      )}
    </div>
  );
};
