import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllReports } from '../services/analysis.service';
import { FileText, Search, RefreshCw, ExternalLink, Calendar, User } from 'lucide-react';

interface ReportRow {
  _id: string;
  customerName: string;
  companyDomain: string;
  overallConfidence: number;
  createdAt: string;
  userId?: { _id: string; name: string; email: string } | string;
}

export const AdminAnalysesView: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllReports({ page, limit: 20, ...(debouncedSearch && { search: debouncedSearch }) });
      setReports(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, debouncedSearch]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const userName = (r: ReportRow) =>
    typeof r.userId === 'object' && r.userId ? r.userId.name : '—';
  const userEmail = (r: ReportRow) =>
    typeof r.userId === 'object' && r.userId ? r.userId.email : '';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-500" /> All Analyses
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total reports across all users</p>
        </div>
        <button onClick={fetchReports} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-teal-600 transition-all">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search company name or domain…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Company</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">User</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide hidden md:table-cell">Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-16 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />Loading…
                </td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-slate-400">No reports found</td></tr>
              ) : reports.map(r => (
                <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-800">{r.customerName}</p>
                    <p className="text-xs text-slate-400">{r.companyDomain}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-700 text-xs">{userName(r)}</p>
                        <p className="text-[11px] text-slate-400">{userEmail(r)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => navigate(`/history/${r._id}`)}
                      className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-700">{(page - 1) * 20 + 1}–{Math.min(page * 20, total)}</span> of <span className="font-bold text-slate-700">{total}</span>
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:border-teal-300 hover:text-teal-600 disabled:opacity-40 transition-all">
              ← Prev
            </button>
            <span className="text-sm font-bold text-slate-600">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:border-teal-300 hover:text-teal-600 disabled:opacity-40 transition-all">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
