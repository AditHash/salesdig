import React, { useState, useEffect, useMemo } from 'react';
import { getMyFootprints, getMyStats } from '../services/track.service';
import { getFootprints, getAnalysisKpis as fetchKpis, getFootprintStats } from '../services/admin.service';
import { useAuth } from '../context/AuthContext';
import {
  Activity, Clock, Search, RefreshCw, Calendar, TrendingUp,
  Users, User, Filter, Download, BarChart2, Zap
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface FootprintData {
  _id: string;
  action: string;
  page: string;
  meta?: string;
  createdAt: string;
  userId?: { _id: string; name: string; email: string } | string;
}

const ACTION_COLORS: Record<string, string> = {
  PERFORM_ANALYSIS: '#0f766e',
  VIEW_ANALYSIS: '#14b8a6',
  VIEW_LIBRARY: '#0891b2',
  VIEW_SERVICES: '#10b981',
  VIEW_ACTIVITY: '#f59e0b',
  VIEW_ADMIN: '#ef4444',
  SELECT_PROGRAM: '#06b6d4',
  DOWNLOAD_REPORT: '#f97316',
  VIEW_HISTORY: '#8b5cf6',
};

const getColor = (action: string) => ACTION_COLORS[action] || '#94a3b8';

const ACTION_BADGE: Record<string, string> = {
  PERFORM_ANALYSIS: 'bg-teal-50 text-teal-700 border-teal-100',
  VIEW_ANALYSIS: 'bg-teal-50 text-teal-600 border-teal-100',
  VIEW_LIBRARY: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  VIEW_SERVICES: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  VIEW_ACTIVITY: 'bg-amber-50 text-amber-700 border-amber-100',
  VIEW_ADMIN: 'bg-rose-50 text-rose-700 border-rose-100',
  SELECT_PROGRAM: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  DOWNLOAD_REPORT: 'bg-orange-50 text-orange-700 border-orange-100',
};

const getBadge = (action: string) => ACTION_BADGE[action] || 'bg-slate-50 text-slate-700 border-slate-100';

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-sm">
    <div>
      <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${color}`}>{label}</p>
      <p className="text-3xl font-extrabold text-slate-900">{value}</p>
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('-600', '-100').replace('-700', '-100')}`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
  </div>
);

const UserSummarySection = ({ userSummary, allUsers, selectedUser, setSelectedUser }: {
  userSummary: { id?: string; name: string; email: string; count: number; lastSeen: string }[];
  allUsers: { id: string; name: string; email: string }[];
  selectedUser: string;
  setSelectedUser: (v: string) => void;
}) => {
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 8;
  const visible = showAll ? userSummary : userSummary.slice(0, LIMIT);
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Users Overview ({userSummary.length})</p>
        {userSummary.length > LIMIT && (
          <button onClick={() => setShowAll(s => !s)} className="text-xs font-bold text-teal-500 hover:underline">
            {showAll ? 'Show less' : `Show all ${userSummary.length}`}
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {visible.map(u => (
          <button
            key={u.email}
            onClick={() => {
              const found = allUsers.find(au => au.email === u.email);
              setSelectedUser(found ? (selectedUser === found.id ? 'all' : found.id) : 'all');
            }}
            className={`text-left p-4 rounded-xl border transition-all ${
              allUsers.find(au => au.email === u.email)?.id === selectedUser
                ? 'bg-teal-50 border-teal-300 shadow-sm'
                : 'bg-white border-slate-200 hover:border-teal-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{u.name}</p>
                <p className="text-xs text-slate-400 truncate">{u.email}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const AnalysisMetaCard = ({ meta }: { meta: string }) => (
  <div className="mt-2 rounded-xl border border-teal-100 bg-teal-50/50 px-3 py-2">
    <p className="text-xs font-semibold text-teal-800">{meta}</p>
  </div>
);

export const ActivityView: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const [footprints, setFootprints] = useState<FootprintData[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Chart stats from backend (no record cap)
  const [stats, setStats] = useState<{
    totalEvents: number;
    activityByDay: { day: string; count: number }[];
    pageDistribution: { name: string; value: number }[];
    actionBreakdown: { action: string; count: number }[];
    uniqueActions: number;
    actions: string[];
    userSummary: { id: string; name: string; email: string; count: number; lastSeen: string }[];
  }>({ totalEvents: 0, activityByDay: [], pageDistribution: [], actionBreakdown: [], uniqueActions: 0, actions: [], userSummary: [] });
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; email: string }[]>([]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [tab, selectedUser, actionFilter, dateFrom, dateTo, debouncedSearch]);

  // Fetch paginated feed
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const params = {
          page,
          limit: 20,
          ...(actionFilter !== 'all' && { action: actionFilter }),
          ...(selectedUser !== 'all' && tab === 'all' && { userId: selectedUser }),
          ...(dateFrom && { dateFrom }),
          ...(dateTo && { dateTo }),
          ...(debouncedSearch && { search: debouncedSearch }),
        };
        const res = tab === 'mine'
          ? await getMyFootprints(params)
          : await getFootprints(params);
        setFootprints(res.data.data);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [tab, page, actionFilter, selectedUser, dateFrom, dateTo, debouncedSearch]);

  // Fetch chart stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = tab === 'mine'
          ? await getMyStats()
          : await getFootprintStats();
        const d = res.data;
        // Format dates for display
        d.activityByDay = d.activityByDay.map((r: any) => ({
          ...r,
          day: new Date(r.day + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        }));
        setStats(d);
        if (tab === 'all' && d.userSummary) {
          setAllUsers(d.userSummary.map((u: any) => ({ id: u.id, name: u.name, email: u.email })));
        }
      } catch (e) { console.error(e); }
    };
    fetchStats();
  }, [tab]);

  // Chart data from backend stats
  const actionBreakdown = useMemo(() =>
    stats.actionBreakdown.map(a => ({ action: a.action.replace(/_/g, ' '), count: a.count, fill: getColor(a.action) })),
    [stats.actionBreakdown]
  );

  const PIE_COLORS = ['#0f766e', '#0891b2', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

  const grouped = useMemo(() => {
    const groups: Record<string, FootprintData[]> = {};
    footprints.forEach(fp => {
      const d = new Date(fp.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      if (!groups[d]) groups[d] = [];
      groups[d].push(fp);
    });
    return groups;
  }, [footprints]);

  const uniqueActions = stats.uniqueActions;
  const mostUsed = actionBreakdown[0]?.action || '—';

  // ── Analysis KPIs (from backend) ─────────────────────────────
  const [analysisKpis, setAnalysisKpis] = useState<{
    total: number; thisMonth: number; thisWeek: number;
    daily: { day: string; count: number }[];
    monthly: { month: string; count: number }[];
    perUser: { name: string; email: string; count: number }[];
  }>({ total: 0, thisMonth: 0, thisWeek: 0, daily: [], monthly: [], perUser: [] });

  useEffect(() => {
    if (tab !== 'all') return;
    fetchKpis().then(res => {
      const d = res.data;
      // Format dates for display
      d.daily = d.daily.map((r: any) => ({
        ...r,
        day: new Date(r.day + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }));
      d.monthly = d.monthly.map((r: any) => ({
        ...r,
        month: new Date(r.month + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      }));
      setAnalysisKpis(d);
    }).catch(console.error);
  }, [tab]);

  const clearFilters = () => { setActionFilter('all'); setSelectedUser('all'); setDateFrom(''); setDateTo(''); setSearch(''); };

  const exportCSV = async () => {
    try {
      const params = {
        export: 'true' as const,
        ...(actionFilter !== 'all' && { action: actionFilter }),
        ...(selectedUser !== 'all' && tab === 'all' && { userId: selectedUser }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
        ...(debouncedSearch && { search: debouncedSearch }),
      };
      const res = tab === 'mine' ? await getMyFootprints(params) : await getFootprints(params);
      const rows: FootprintData[] = res.data.data;

      const headers = ['Date', 'Time', 'User', 'Email', 'Action', 'Page', 'Meta'];
      const lines = rows.map(fp => {
        const d = new Date(fp.createdAt);
        const userName = typeof fp.userId === 'object' && fp.userId ? fp.userId.name : (user?.name || '');
        const userEmail = typeof fp.userId === 'object' && fp.userId ? fp.userId.email : (user?.email || '');
        return [
          d.toLocaleDateString(),
          d.toLocaleTimeString(),
          userName,
          userEmail,
          fp.action,
          fp.page,
          (fp.meta || '').replace(/\n/g, ' ').replace(/,/g, ';'),
        ].map(v => `"${v}"`).join(',');
      });

      const csv = [headers.join(','), ...lines].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  
  const hasFilters = actionFilter !== 'all' || selectedUser !== 'all' || dateFrom || dateTo || search;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-teal-500" /> Activity Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Track usage patterns and platform interactions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:text-teal-600 hover:border-teal-200 transition-all"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={async () => {
              setLoading(true);
              try {
                const params = { page, limit: 20, ...(actionFilter !== 'all' && { action: actionFilter }), ...(selectedUser !== 'all' && tab === 'all' && { userId: selectedUser }), ...(dateFrom && { dateFrom }), ...(dateTo && { dateTo }), ...(debouncedSearch && { search: debouncedSearch }) };
                const res = tab === 'mine' ? await getMyFootprints(params) : await getFootprints(params);
                setFootprints(res.data.data); setTotal(res.data.total); setTotalPages(res.data.totalPages);
              } finally { setLoading(false); }
            }}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-teal-600 hover:border-teal-200 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      {isAdmin && (
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-6">
          <button
            onClick={() => setTab('mine')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'mine' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <User className="w-4 h-4 inline mr-1.5" />My Activity
          </button>
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'all' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users className="w-4 h-4 inline mr-1.5" />All Users
          </button>
        </div>
      )}

      {/* Analysis KPIs — admin only */}
      {tab === 'all' && (
        <div className="mb-6 space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Analyses Run" value={analysisKpis.total} icon={Zap} color="text-teal-600" />
            <StatCard label="Analyses This Month" value={analysisKpis.thisMonth} icon={Calendar} color="text-cyan-600" />
            <StatCard label="Analyses This Week" value={analysisKpis.thisWeek} icon={TrendingUp} color="text-emerald-600" />
          </div>

          {/* Daily trend */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-teal-500" /> Analyses — Last 30 Days
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={analysisKpis.daily} barSize={10}>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly trend + per user */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-500" /> Monthly Trend — Last 12 Months
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={analysisKpis.monthly} barSize={16}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="count" fill="#0891b2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" /> Analyses per User
              </p>
              {analysisKpis.perUser.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No data</p>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {analysisKpis.perUser.map((u, i) => (
                    <div key={u.email} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{u.name}</p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                      <span className="text-sm font-extrabold text-teal-600 flex-shrink-0">{u.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin: User Summary Cards */}
      {tab === 'all' && stats.userSummary.length > 0 && (
        <UserSummarySection
          userSummary={stats.userSummary}
          allUsers={allUsers}
          selectedUser={selectedUser}
          setSelectedUser={setSelectedUser}
        />
      )}

      {/* General Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Events" value={total} icon={Activity} color="text-teal-600" />
        <StatCard label="Unique Actions" value={uniqueActions} icon={TrendingUp} color="text-cyan-600" />
        <StatCard label="Current Page" value={`${page} / ${totalPages}`} icon={Calendar} color="text-emerald-600" />
        <StatCard label="Top Action" value={mostUsed} icon={Filter} color="text-amber-600" />
      </div>

      {/* Charts */}
      {stats.activityByDay.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Bar — Activity by Day */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-700 mb-4">Activity — Last 14 Days</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.activityByDay} barSize={18}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie — Page Distribution */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-700 mb-4">Page Distribution</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={stats.pageDistribution} cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {stats.pageDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Horizontal Bar — Action Breakdown */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-700 mb-4">Action Breakdown</p>
            <ResponsiveContainer width="100%" height={Math.max(160, actionBreakdown.length * 36)}>
              <BarChart data={actionBreakdown} layout="vertical" barSize={16}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="action" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={140} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {actionBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search actions, pages, meta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
          />
        </div>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
        >
          <option value="all">All Actions</option>
          {stats.actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {tab === 'all' && (
          <select
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          >
            <option value="all">All Users</option>
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        )}
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          title="To date"
        />
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-500 text-sm font-bold hover:bg-red-100 transition-all"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Activity Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-teal-500 animate-spin" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <Activity className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">No activity found</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />{date}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="space-y-2">
                {items.map(fp => (
                  <div key={fp._id} className="bg-white rounded-xl border border-slate-100 p-4 hover:border-teal-100 hover:shadow-sm transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: getColor(fp.action) + '20' }}>
                          <Activity className="w-4 h-4" style={{ color: getColor(fp.action) }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${getBadge(fp.action)}`}>
                              {fp.action}
                            </span>
                            <span className="text-slate-300 text-xs">→</span>
                            <span className="px-2 py-0.5 bg-slate-50 text-slate-600 text-xs font-semibold rounded-md border border-slate-200">
                              {fp.page}
                            </span>
                            {tab === 'all' && typeof fp.userId === 'object' && fp.userId && (
                              <span className="px-2 py-0.5 bg-teal-50 text-teal-600 text-xs font-semibold rounded-md border border-teal-100">
                                {fp.userId.name}
                              </span>
                            )}
                          </div>
                          {fp.meta && (
                            fp.action === 'PERFORM_ANALYSIS'
                              ? <AnalysisMetaCard meta={fp.meta} />
                              : (
                                <div className="mt-1">
                                  <p className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 line-clamp-2">{fp.meta}</p>
                                </div>
                              )
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(fp.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-700">{(page - 1) * 20 + 1}–{Math.min(page * 20, total)}</span> of <span className="font-bold text-slate-700">{total}</span> events
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:border-teal-300 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              ← Prev
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${page === p ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-600'}`}
                  >{p}</button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:border-teal-300 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
