import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, ExternalLink, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMyReports } from '../services/analysis.service';
import { SavedReport } from '../types';
import {
  getTarget, getTargetHistory, linkTargetReport, researchTarget, updateTarget,
  type TargetAccount, type TargetReport, type TargetRun
} from '../services/targets.service';

const message = (error: any, fallback: string) => error.response?.data?.message || fallback;
const domain = (value: string) => {
  try { return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, ''); }
  catch { return ''; }
};

export const TargetDetailView: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [account, setAccount] = useState<TargetAccount | null>(null);
  const [reports, setReports] = useState<TargetReport[]>([]);
  const [runs, setRuns] = useState<TargetRun[]>([]);
  const [legacy, setLegacy] = useState<SavedReport[]>([]);
  const [draft, setDraft] = useState({ name: '', website: '', industry: '', geography: '', targetingReason: '', notes: '', tags: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [targetResponse, historyResponse] = await Promise.all([getTarget(id), getTargetHistory(id)]);
      const target = targetResponse.data;
      setAccount(target);
      setReports(historyResponse.data.reports); setRuns(historyResponse.data.runs);
      setDraft({ name: target.name, website: target.website, industry: target.industry,
        geography: target.geography, targetingReason: target.targetingReason, notes: target.notes,
        tags: target.tags.join(', ') });
      try { setLegacy((await getMyReports()).data as SavedReport[]); }
      catch { setLegacy([]); }
    } catch (caught: any) { setError(message(caught, 'Could not load account.')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [id]);

  const refreshHistory = async () => {
    const { data } = await getTargetHistory(id);
    setReports(data.reports); setRuns(data.runs);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!account) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { data } = await updateTarget(id, { version: account.version, name: draft.name.trim(),
        website: draft.website.trim(), industry: draft.industry.trim(), geography: draft.geography.trim(),
        targetingReason: draft.targetingReason.trim(), notes: draft.notes.trim(),
        tags: draft.tags.split(',').map(tag => tag.trim()).filter(Boolean) });
      setAccount(data); setNotice('Account saved.');
    } catch (caught: any) { setError(message(caught, 'Could not save account.')); }
    finally { setBusy(false); }
  };

  const setArchived = async (archived: boolean) => {
    if (!account) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { data } = await updateTarget(id, { version: account.version, archived });
      setAccount(data); setNotice(archived ? 'Account archived. Reports remain available.' : 'Account restored.');
    } catch (caught: any) { setError(message(caught, 'Could not update account.')); }
    finally { setBusy(false); }
  };

  const run = async () => {
    setBusy(true); setError(''); setNotice('Research running. This V1 analysis request can take several minutes.');
    try {
      const { data } = await researchTarget(id);
      await refreshHistory();
      setNotice(`Research saved. Open report ${data.reportId} below.`);
    } catch (caught: any) {
      setError(message(caught, 'Research failed. Check run history below.'));
      await refreshHistory().catch(() => undefined);
    } finally { setBusy(false); }
  };

  const link = async (reportId: string) => {
    setBusy(true); setError('');
    try { await linkTargetReport(id, reportId); await refreshHistory(); setNotice('Existing report linked.'); }
    catch (caught: any) { setError(message(caught, 'Could not link report.')); }
    finally { setBusy(false); }
  };

  if (loading) return <p role="status" className="p-8 text-sm text-slate-500">Loading account…</p>;
  if (!account) return <div className="p-8"><Link to="/targets" className="text-sm font-bold text-teal-700">← Target accounts</Link><p role="alert" className="mt-4 text-red-700">{error || 'Account not found.'}</p><button onClick={() => void load()} className="mt-2 text-sm font-bold text-teal-700 underline">Retry</button></div>;

  const canEdit = user?.role === 'admin' || user?.id === account.ownerUserId;
  const linked = new Set(reports.map(report => report.id));
  const candidates = legacy.filter(report => !report.accountId && !linked.has(report._id) && domain(report.companyDomain) === account.normalizedDomain);
  const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500';
  const field = (label: string, key: keyof typeof draft, multiline = false) => <label className="block text-sm font-semibold text-slate-700">{label}{multiline ?
    <textarea value={draft[key]} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} rows={3} className={inputClass} /> :
    <input value={draft[key]} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} className={inputClass} />}</label>;

  return <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
    <button onClick={() => navigate('/targets')} className="flex items-center gap-1 text-sm font-bold text-teal-700"><ArrowLeft className="h-4 w-4" /> Target accounts</button>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="flex items-center gap-2 text-2xl font-black text-slate-900"><Building2 className="h-6 w-6 text-teal-600" />{account.name}</h1>
      <p className="mt-1 text-sm text-slate-500">{account.normalizedDomain} · {account.archivedAt ? 'Archived' : 'Active'} · Owner: {account.ownerName || 'Unassigned'}</p></div>
      <button disabled={busy || !!account.archivedAt} onClick={() => void run()} className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Play className="h-4 w-4" />{busy ? 'Working…' : 'Run company research'}</button></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{notice}</p>}
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-bold text-slate-900">Account overview</h2>
        {canEdit ? <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">{field('Company name', 'name')}{field('Website', 'website')}{field('Industry', 'industry')}{field('Geography', 'geography')}</div>
          {field('Why target this company?', 'targetingReason', true)}{field('Notes', 'notes', true)}{field('Tags, separated by commas', 'tags')}
          <div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Save account</button>
            <button type="button" disabled={busy} onClick={() => void setArchived(!account.archivedAt)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">{account.archivedAt ? 'Restore' : 'Archive'}</button></div>
        </form> : <dl className="space-y-3 text-sm"><div><dt className="font-bold">Industry</dt><dd>{account.industry || 'Unknown'}</dd></div><div><dt className="font-bold">Geography</dt><dd>{account.geography || 'Unknown'}</dd></div><div><dt className="font-bold">Targeting reason</dt><dd>{account.targetingReason || 'None yet'}</dd></div><div><dt className="font-bold">Notes</dt><dd>{account.notes || 'None yet'}</dd></div></dl>}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Research history</h2>
        <p className="mt-1 text-xs text-slate-500">V1 reports remain owned by their creator. Account links keep their history when archived.</p>
        {reports.length === 0 ? <p className="mt-4 text-sm text-slate-500">No reports linked yet.</p> : <div className="mt-4 space-y-2">{reports.map(report => <Link key={report.id} to={`/history/${report.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm hover:bg-slate-50"><span><strong>{report.customerName}</strong><span className="block text-xs text-slate-500">{new Date(report.createdAt).toLocaleString()}</span></span><ExternalLink className="h-4 w-4 text-teal-600" /></Link>)}</div>}
        <h3 className="mt-6 text-sm font-bold text-slate-800">Runs</h3>
        {runs.length === 0 ? <p className="mt-2 text-sm text-slate-500">No research runs yet.</p> : <div className="mt-2 space-y-2">{runs.map(item => <p key={item.id} className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{new Date(item.startedAt).toLocaleString()} · {item.status}{item.error ? ` · ${item.error}` : ''}</p>)}</div>}
      </section>
    </div>
    {candidates.length > 0 && !account.archivedAt && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Link older reports</h2><p className="mt-1 text-sm text-slate-500">Only your existing reports with this exact domain can be linked. Nothing is linked automatically.</p>
      <div className="mt-3 space-y-2">{candidates.map(report => <div key={report._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm"><span>{report.customerName} · {new Date(report.createdAt).toLocaleDateString()}</span><button disabled={busy} onClick={() => void link(report._id)} className="font-bold text-teal-700 disabled:opacity-50">Link report</button></div>)}</div></section>}
  </div>;
};
