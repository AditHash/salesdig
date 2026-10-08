import React, { useEffect, useState } from 'react';
import API from '../api/api';
import type { OpportunityResult } from '../services/targets.service';

const kinds = { pitch_short: '30-second pitch', pitch_long: 'Longer pitch', cold_email: 'Cold-email draft', discovery: 'Discovery questions', meeting_brief: 'Meeting brief', objections: 'Objection handling', roadmap: 'Engagement roadmap' };
type Kind = keyof typeof kinds;
interface Draft { id: string; kind: Kind; content: string; version: number; createdAt: string; sourceSnapshot: { runId: string; offeringVersion: number; offering: { name: string }; evidence: Array<{ id: string; url: string; excerpt: string; classification: string; certainty: string; retrieved_at: string; published_at: string | null }> } }

export const SalesPreparationView: React.FC<{ accountId: string; archived: boolean; result: OpportunityResult | null }> = ({ accountId, archived, result }) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [edits, setEdits] = useState<Record<string,string>>({});
  const [opportunityId, setOpportunityId] = useState('');
  const [kind, setKind] = useState<Kind>('pitch_short');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const opportunities = result?.opportunities ?? [];
  useEffect(() => {
    let active = true;
    API.get<{drafts: Draft[]}>(`/targets/${accountId}/drafts`).then(({data}) => { if(active) setDrafts(data.drafts); })
      .catch(() => { if(active) setError('Could not load drafts. Reload account to retry.'); }).finally(() => { if(active) setLoading(false); });
    return () => { active = false; };
  }, [accountId]);
  const generate = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const {data} = await API.post<Draft>(`/targets/${accountId}/drafts`, { opportunityId: opportunityId || opportunities[0]?.id, kind });
      setDrafts(current => [data,...current]); setNotice('Draft saved. Review and edit before using it.');
    } catch(e: any) { setError(e.response?.data?.message || 'Could not create draft.'); }
    finally { setBusy(false); }
  };
  const save = async (draft: Draft) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const {data} = await API.patch<Draft>(`/targets/${accountId}/drafts/${draft.id}`, { content: edits[draft.id] ?? draft.content, version: draft.version });
      setDrafts(current => current.map(item => item.id === draft.id ? data : item)); setNotice('Draft revision saved.');
    } catch(e: any) { setError(e.response?.data?.message || 'Could not save draft.'); }
    finally { setBusy(false); }
  };
  const exportData = async () => {
    setBusy(true); setError('');
    try {
      const {data} = await API.get(`/targets/${accountId}/export`, {responseType: 'blob'});
      const url = URL.createObjectURL(data); const link = document.createElement('a');
      link.href=url; link.download=`salesdig-account-${accountId}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
    } catch { setError('Could not export account.'); } finally { setBusy(false); }
  };
  return <section id="sales-preparation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-bold text-slate-900">Sales preparation</h2><button disabled={busy} onClick={() => void exportData()} className="text-sm font-bold text-teal-700">Export account with evidence (JSON)</button></div>
    <p className="text-sm text-slate-500">Prepare from a selected opportunity. Templates frame needs as discovery questions. Drafts are private to you; nothing is sent. Inspect sources and review your edits before use.</p>
    <p className="text-sm text-slate-600">For account questions, open “Ask Salesdig” while on this account page.</p>
    {!opportunities.length ? <p className="text-sm text-slate-500">Research account and match approved offerings to prepare drafts.</p> : <div className="flex flex-wrap gap-3">
      <select aria-label="Opportunity for preparation" value={opportunityId || opportunities[0]?.id} onChange={e => setOpportunityId(e.target.value)} className="max-w-full rounded-lg border p-2 text-sm">{opportunities.map(o => <option key={o.id} value={o.id}>{o.offeringName} — {o.title}</option>)}</select>
      <select aria-label="Draft type" value={kind} onChange={e => setKind(e.target.value as Kind)} className="rounded-lg border p-2 text-sm">{Object.entries(kinds).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
      <button disabled={busy || archived} onClick={() => void generate()} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Create saved draft</button>
    </div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{notice && <p role="status" className="text-sm text-teal-700">{notice}</p>}
    {loading ? <p role="status">Loading drafts…</p> : !drafts.length ? <p className="text-sm text-slate-500">No saved drafts yet.</p> : drafts.map(d => <details key={d.id} className="rounded-xl border border-slate-200 p-3">
      <summary className="cursor-pointer font-semibold text-slate-800">{kinds[d.kind]} · {d.sourceSnapshot.offering.name} · revision {d.version}</summary>
      <label className="mt-3 block text-sm">Your draft<textarea aria-label={`${kinds[d.kind]} content`} rows={9} maxLength={20000} value={edits[d.id] ?? d.content} onChange={e => setEdits(current => ({...current,[d.id]:e.target.value}))} className="mt-1 w-full rounded-lg border p-3" /></label>
      <button disabled={busy || archived || !(edits[d.id] ?? d.content).trim()} onClick={() => void save(d)} className="mt-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Save revision</button>
      <p className="mt-3 text-xs text-slate-500">Research {d.sourceSnapshot.runId} · offering version {d.sourceSnapshot.offeringVersion}. Source snapshot stays fixed after edits and research refreshes. User edits are unverified.</p>
      <details className="mt-2 text-sm"><summary className="cursor-pointer">Supporting evidence and uncertainty</summary>{d.sourceSnapshot.evidence.map((e,i) => <blockquote key={i} className="mt-2 border-l-2 border-teal-200 pl-3"><a href={/^https?:\/\//i.test(e.url) ? e.url : undefined} target="_blank" rel="noreferrer" className="text-teal-700 underline">Source</a> · {e.classification} · {e.certainty}<p>{e.excerpt}</p><p className="text-xs text-slate-500">Claim {e.id} · retrieved {new Date(e.retrieved_at).toLocaleDateString()} · published {e.published_at ? new Date(e.published_at).toLocaleDateString() : 'unknown'}</p></blockquote>)}</details>
    </details>)}
  </section>;
};
