import React from 'react';
import { AgentCompanyProfile, AnalysisMeta } from '../../../types';
import { Cloud, TrendingUp, TrendingDown, Minus, Globe, ExternalLink, Mail, CheckCircle, XCircle } from 'lucide-react';

const initials = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const segmentColor: Record<string, string> = {
  Enterprise: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  SMB: 'bg-blue-100 text-blue-700 border-blue-200',
  Startup: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Unknown: 'bg-slate-100 text-slate-600 border-slate-200',
};

const cloudColor: Record<string, string> = {
  AWS: 'bg-orange-100 text-orange-700 border-orange-200',
  Azure: 'bg-blue-100 text-blue-700 border-blue-200',
  GCP: 'bg-green-100 text-green-700 border-green-200',
  Hybrid: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'On-Prem': 'bg-slate-100 text-slate-700 border-slate-200',
  Unknown: 'bg-slate-100 text-slate-500 border-slate-200',
};

interface Props {
  profile: AgentCompanyProfile;
  meta?: AnalysisMeta;
}

export const CompanyOverview: React.FC<Props> = ({ profile, meta }) => (
  <section className="space-y-5">
    {/* Hero card */}
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white p-6 md:p-8">
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, #14b8a6 0%, transparent 60%), radial-gradient(circle at 20% 80%, #0891b2 0%, transparent 50%)' }} />
      <div className="relative z-10 flex flex-col md:flex-row md:items-start gap-5">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl font-black flex-shrink-0">
          {initials(profile.companyName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">{profile.companyName}</h2>
            {profile.websiteUrl && (
              <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${segmentColor[profile.segment] ?? segmentColor.Unknown}`}>
              {profile.segment}
            </span>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-white/10 border-white/20 text-white">
              {profile.industry}
            </span>
            {(profile.salesPotential || profile.workmatesPotential) ? (() => {
              const score = (profile.salesPotential || profile.workmatesPotential)!.overall;
              const [label, cls] = score >= 70
                ? ['High Potential', 'bg-emerald-100 text-emerald-700 border-emerald-200']
                : score >= 40
                ? ['Medium Potential', 'bg-amber-100 text-amber-700 border-amber-200']
                : ['Low Potential', 'bg-rose-100 text-rose-700 border-rose-200'];
              return (
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${cls}`}>
                  <Cloud className="w-3 h-3" />{label}
                </span>
              );
            })() : null}
            {profile.isAwsCustomer && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-orange-500/20 border-orange-400/40 text-orange-300">
                AWS Customer ✓
              </span>
            )}
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{profile.description}</p>
        </div>
      </div>

      {/* Cloud evidence */}
      {profile.cloudEvidence && (
        <div className="relative z-10 mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-teal-300">Cloud Evidence: </span>{profile.cloudEvidence}
        </div>
      )}

      {/* Meta warnings */}
      {meta?.warnings && meta.warnings.length > 0 && (
        <div className="relative z-10 mt-3 flex flex-wrap gap-2">
          {meta.warnings.map((w, i) => (
            <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300">
              ⚠ {w}
            </span>
          ))}
        </div>
      )}
    </div>

    {/* Mail Provider (detected from MX records) */}
    {profile.domainIntel && (
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-teal-500" />
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mail Provider (detected from MX records)</h3>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-1.5">
            {profile.domainIntel.hasMx
              ? <CheckCircle className="w-4 h-4 text-emerald-500" />
              : <XCircle className="w-4 h-4 text-rose-400" />}
            <span className={`text-xs font-semibold ${profile.domainIntel.hasMx ? 'text-emerald-600' : 'text-rose-500'}`}>
              {profile.domainIntel.hasMx ? 'Active mail domain' : 'No MX records found'}
            </span>
          </div>
          {profile.domainIntel.emailProvider && profile.domainIntel.emailProvider !== 'Unknown' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Provider</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-cyan-50 border-cyan-200 text-cyan-700">
                {profile.domainIntel.emailProvider}
              </span>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Stats row */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs text-slate-400 mb-1">Employees (Approx)</p>
        <p className="text-2xl font-black text-sky-600">{profile.numberOfEmployees != null ? `~${profile.numberOfEmployees.toLocaleString()}` : '—'}</p>
    
          
           <p className="text-[11px] text-slate-400 mt-0.5">headcount</p>
      </div>
      {[
        { label: 'Pain Points', value: (profile.painPoints ?? []).length, sub: 'identified', color: 'text-rose-500' },
        { label: 'Competitors Mapped', value: (profile.competitorAnalysis ?? []).length, sub: 'analysed', color: 'text-teal-600' },
        { label: 'Tech Categories', value: (profile.techStack ?? []).length, sub: 'detected', color: 'text-cyan-600' },
      ].map(s => (
        <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 mb-1">{s.label}</p>
          <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
        </div>
      ))}
    </div>

    {/* Financial health — always shown */}
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Financial Health</h3>
      {(profile.revenueData ?? []).length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left pb-2 text-xs font-bold text-slate-400 uppercase">Year</th>
                <th className="text-left pb-2 text-xs font-bold text-slate-400 uppercase">Revenue</th>
                <th className="text-left pb-2 text-xs font-bold text-slate-400 uppercase hidden sm:table-cell">CAC</th>
                <th className="text-left pb-2 text-xs font-bold text-slate-400 uppercase">Trend</th>
                <th className="text-left pb-2 text-xs font-bold text-slate-400 uppercase hidden md:table-cell">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(profile.revenueData ?? []).map((r, i) => (
                <tr key={i}>
                  <td className="py-2.5 font-bold text-slate-700">{r.year}</td>
                  <td className="py-2.5 font-bold text-slate-900">{r.amount}</td>
                  <td className="py-2.5 text-slate-500 hidden sm:table-cell">{r.cac ?? '—'}</td>
                  <td className="py-2.5">
                    {r.trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                    {r.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                    {r.trend === 'flat' && <Minus className="w-4 h-4 text-slate-400" />}
                    {!r.trend && <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-2.5 hidden md:table-cell">
                    {r.sourceUrls?.[0] && (
                      <a href={r.sourceUrls[0]} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-teal-500 hover:underline">
                        <Globe className="w-3 h-3" /> Reference
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="text-sm text-slate-400 italic">Revenue data not disclosed</p>}
    </div>

    {/* Pain points + known issues — always shown */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
        <h3 className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-3">Pain Points</h3>
        {(profile.painPoints ?? []).length > 0 ? (
          <ul className="space-y-2">
            {(profile.painPoints ?? []).map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-rose-900">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />{p}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-rose-400 italic">No issues identified</p>}
      </div>
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
        <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3">Known Issues</h3>
        {(profile.knownIssues ?? []).length > 0 ? (
          <ul className="space-y-2">
            {(profile.knownIssues ?? []).map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />{p}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-amber-400 italic">No known issues</p>}
      </div>
    </div>
  </section>
);
