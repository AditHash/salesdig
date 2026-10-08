import React from 'react';
import type { ResearchEvidence } from '../services/targets.service';

export const ResearchEvidenceView: React.FC<{ evidence: ResearchEvidence | null; loading?: boolean }> = ({ evidence, loading }) => {
  if (loading) return <p role="status" className="text-sm text-slate-500">Loading research evidence…</p>;
  if (!evidence?.run) return <p className="text-sm text-slate-500">No evidence-backed research yet. Older V1 reports have no synthetic citations.</p>;
  const { run, sources, claims } = evidence;
  const byId = new Map(sources.map(source => [source.id, source]));
  const stale = !!run.endedAt && Date.now() - new Date(run.endedAt).getTime() > 30 * 24 * 60 * 60 * 1000;
  const tokens = Object.values(run.resourceUsage || {}).reduce((sum, item) => sum + (item.totalTokens || 0), 0);
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2 text-xs font-bold">
      <span className={`rounded-full px-2.5 py-1 ${run.status === 'completed' ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-800'}`}>{run.status === 'completed' ? 'Evidence collected' : 'Partial research'}</span>
      {stale && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">Older than 30 days</span>}
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{sources.length} sources · {claims.length} claims</span>
      {tokens > 0 && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{tokens.toLocaleString()} model tokens reported</span>}
    </div>
    {run.endedAt && <p className="text-xs text-slate-500">Research date: {new Date(run.endedAt).toLocaleString()}. Publication and event dates appear only when known.</p>}
    {run.status !== 'completed' && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Research incomplete. Sources below may be useful; no unsupported claims were published.</p>}
    {claims.length === 0 ? <p className="text-sm text-slate-500">No validated claims available.</p> : <div className="space-y-3">{claims.map(claim => <article key={claim.id} className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wide"><span className="text-teal-700">{claim.classification}</span><span className="text-slate-500">{claim.certainty}</span>{claim.eventDate && <span className="text-slate-500">Event: {claim.eventDate}</span>}</div>
      <p className="mt-2 text-sm font-semibold text-slate-800">{claim.statement}</p>
      <div className="mt-3 space-y-2">{claim.evidence.map((reference, index) => {
        const source = byId.get(reference.sourceId);
        return <div key={`${reference.sourceId}-${index}`} className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><p>“{reference.excerpt}”</p>
          {source && <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-bold text-teal-700 underline">{source.title || source.url}</a>}</div>;
      })}</div>
    </article>)}</div>}
    <div><h3 className="text-sm font-bold text-slate-800">Sources</h3>{sources.length === 0 ? <p className="mt-2 text-sm text-slate-500">No readable sources stored.</p> : <ul className="mt-2 space-y-2">{sources.map(source => <li key={source.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm"><a href={source.url} target="_blank" rel="noopener noreferrer" className="font-bold text-teal-700 underline">{source.title || source.url}</a><p className="mt-1 text-xs text-slate-500">Retrieved {new Date(source.retrievedAt).toLocaleString()}{source.publishedAt ? ` · Published ${new Date(source.publishedAt).toLocaleDateString()}` : ' · Publication date unknown'}</p></li>)}</ul>}</div>
  </div>;
};
