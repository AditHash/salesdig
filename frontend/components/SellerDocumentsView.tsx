import React, { useEffect, useState } from 'react';
import API from '../api/api';

type Document = {
  id: string; filename: string; mimeType: string; currentVersion: number;
  status: 'queued' | 'processing' | 'ready' | 'failed'; attempts: number;
  errorMessage: string | null; updatedAt: string;
};
type Suggestion = {
  id: string; itemKind: 'offering' | 'partner' | 'case_study'; payload: Record<string, unknown>;
  evidenceExcerpt: string; status: 'pending' | 'accepted' | 'rejected'; acceptedItemId: string | null;
};
type ListResponse = { data: Document[]; page: number; total: number };

const kinds: Record<Suggestion['itemKind'], string> = {
  offering: 'Offering', partner: 'Partner', case_study: 'Case study',
};
const labels: Record<string, string> = {
  name: 'Name', offeringType: 'Offering type', description: 'Description', capabilities: 'Capabilities',
  businessOutcomes: 'Business outcomes', relevantIndustries: 'Relevant industries',
  idealCustomerProfile: 'Ideal customer profile', credentials: 'Credentials', title: 'Title',
  clientName: 'Client name', summary: 'Summary', outcomes: 'Outcomes', offeringId: 'Offering ID',
};
const fieldClass = 'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-400';
const message = (error: any, fallback: string) => error.response?.data?.message || fallback;

export const SellerDocumentsView: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Document | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Record<string, unknown>>>({});
  const [file, setFile] = useState<File | null>(null);
  const [replacement, setReplacement] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async (currentPage = page) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get<ListResponse>('/seller-documents', { params: { page: currentPage, limit: 10 } });
      setDocuments(data.data);
      setTotal(data.total);
      if (selected) setSelected(data.data.find(document => document.id === selected.id) ?? null);
    } catch (caught: any) {
      setError(message(caught, 'Could not load seller documents.'));
    } finally { setLoading(false); }
  };

  const loadSuggestions = async (document: Document) => {
    setError('');
    try {
      const { data } = await API.get<{ document: Document; data: Suggestion[] }>(`/seller-documents/${document.id}/suggestions`);
      setSelected(data.document);
      setSuggestions(data.data);
      setDrafts(Object.fromEntries(data.data.map(suggestion => [suggestion.id, suggestion.payload])));
    } catch (caught: any) { setError(message(caught, 'Could not load document suggestions.')); }
  };

  useEffect(() => { void load(page); }, [page]);
  useEffect(() => {
    if (!documents.some(document => document.status === 'queued' || document.status === 'processing')) return;
    const timer = window.setInterval(() => { void load(page); }, 5000);
    return () => window.clearInterval(timer);
  }, [documents, page]);
  useEffect(() => {
    if (selected?.status === 'ready') void loadSuggestions(selected);
  }, [selected?.id, selected?.status, selected?.currentVersion]);

  const validateFile = (candidate: File | null): string | null => {
    if (!candidate) return 'Choose a text or Markdown file.';
    if (candidate.size === 0 || candidate.size > 20 * 1024) return 'File must contain 1–20 KB of text.';
    if (!/\.(txt|md)$/i.test(candidate.name)) return 'Use a .txt or .md file.';
    return null;
  };
  const fileHeaders = (candidate: File, version?: number) => ({
    'Content-Type': 'application/octet-stream',
    'X-Document-Name': encodeURIComponent(candidate.name),
    'X-Document-Type': candidate.name.toLowerCase().endsWith('.md') ? 'text/markdown' : 'text/plain',
    ...(version ? { 'X-Document-Version': String(version) } : {}),
  });

  const upload = async () => {
    const invalid = validateFile(file);
    if (invalid || !file) { setError(invalid || 'Choose a file.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await API.post('/seller-documents', await file.arrayBuffer(), { headers: fileHeaders(file) });
      setFile(null);
      setNotice('Document queued for extraction. Suggestions need your review before use.');
      setPage(1);
      await load(1);
    } catch (caught: any) { setError(message(caught, 'Could not upload document.')); }
    finally { setBusy(false); }
  };

  const replace = async () => {
    const invalid = validateFile(replacement);
    if (invalid || !replacement || !selected) { setError(invalid || 'Choose a file.'); return; }
    setBusy(true); setError('');
    try {
      await API.put(`/seller-documents/${selected.id}`, await replacement.arrayBuffer(), { headers: fileHeaders(replacement, selected.currentVersion) });
      setReplacement(null); setSuggestions([]); setDrafts({});
      setNotice('Document replaced. Prior chunks removed; new extraction queued.');
      await load();
    } catch (caught: any) { setError(message(caught, 'Could not replace document.')); }
    finally { setBusy(false); }
  };

  const retry = async (document: Document) => {
    setBusy(true); setError('');
    try { await API.post(`/seller-documents/${document.id}/retry`); setNotice('Extraction queued again.'); await load(); }
    catch (caught: any) { setError(message(caught, 'Could not retry document.')); }
    finally { setBusy(false); }
  };

  const remove = async (document: Document) => {
    if (!window.confirm(`Delete ${document.filename} and its extracted suggestions?`)) return;
    setBusy(true); setError('');
    try {
      await API.delete(`/seller-documents/${document.id}`);
      setSelected(null); setSuggestions([]); setNotice('Document deleted. Derived catalog items were retired.');
      await load();
    } catch (caught: any) { setError(message(caught, 'Could not delete document.')); }
    finally { setBusy(false); }
  };

  const download = async (document: Document) => {
    setError('');
    try {
      const { data } = await API.get(`/seller-documents/${document.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const link = window.document.createElement('a');
      link.href = url; link.download = document.filename; link.click();
      URL.revokeObjectURL(url);
    } catch (caught: any) { setError(message(caught, 'Could not download document.')); }
  };

  const changeDraft = (id: string, key: string, value: unknown) => {
    setDrafts(current => ({ ...current, [id]: { ...current[id], [key]: value } }));
  };
  const review = async (suggestion: Suggestion, decision: 'accept' | 'reject') => {
    if (!selected) return;
    setBusy(true); setError('');
    try {
      await API.patch(`/seller-documents/${selected.id}/suggestions/${suggestion.id}`, {
        decision, ...(decision === 'accept' ? { payload: drafts[suggestion.id] } : {}),
      });
      setNotice(decision === 'accept' ? 'Suggestion saved as a draft catalog item. Review and approve it in Seller catalog.' : 'Suggestion rejected.');
      await loadSuggestions(selected);
    } catch (caught: any) { setError(message(caught, 'Could not review suggestion.')); }
    finally { setBusy(false); }
  };

  return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Seller documents">
    <div><h2 className="text-lg font-bold text-slate-900">Seller documents</h2>
      <p className="mt-1 text-sm text-slate-500">Upload UTF-8 .txt or .md files up to 20 KB. AI suggests catalog entries; your team reviews every suggestion.</p></div>
    <div className="flex flex-wrap items-center gap-3">
      <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={event => setFile(event.target.files?.[0] ?? null)} className="max-w-full text-sm text-slate-600" />
      <button type="button" disabled={busy} onClick={() => void upload()} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Upload document</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" onClick={() => void load()} className="font-bold underline">Retry list</button></p>}
    {notice && <p role="status" className="text-sm text-teal-700">{notice}</p>}
    {loading ? <p className="text-sm text-slate-500">Loading documents…</p> : documents.length === 0 ?
      <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No seller documents yet.</p> :
      <div className="space-y-2">{documents.map(document => <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
        <div><p className="font-semibold text-slate-900">{document.filename}</p><p className="text-xs text-slate-500">Version {document.currentVersion} · {document.status}{document.errorMessage ? ` · ${document.errorMessage}` : ''}</p></div>
        <div className="flex gap-3 text-sm font-semibold text-teal-700">
          <button type="button" onClick={() => { setSelected(document); void loadSuggestions(document); }}>Review</button>
          <button type="button" onClick={() => void download(document)}>Download</button>
          {document.status === 'failed' && <button type="button" disabled={busy} onClick={() => void retry(document)}>Retry</button>}
          <button type="button" disabled={busy} onClick={() => void remove(document)} className="text-red-700">Delete</button>
        </div>
      </div>)}</div>}
    <div className="flex justify-between text-sm text-slate-500"><span>{total} document{total === 1 ? '' : 's'}</span><div className="flex gap-3"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button type="button" disabled={page * 10 >= total} onClick={() => setPage(page + 1)}>Next</button></div></div>
    {selected && <div className="space-y-4 rounded-xl border border-teal-200 bg-teal-50/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-slate-900">Review: {selected.filename}</h3><button type="button" onClick={() => setSelected(null)} className="text-sm font-semibold text-slate-600">Close</button></div>
      <div className="flex flex-wrap items-center gap-3"><input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={event => setReplacement(event.target.files?.[0] ?? null)} className="max-w-full text-sm text-slate-600" /><button type="button" disabled={busy} onClick={() => void replace()} className="rounded-xl border border-teal-600 px-3 py-2 text-sm font-bold text-teal-700">Replace file</button></div>
      {selected.status !== 'ready' ? <p className="text-sm text-slate-500">Suggestions available when extraction finishes.</p> : suggestions.length === 0 ? <p className="text-sm text-slate-500">No supported suggestions found.</p> :
        <div className="space-y-4">{suggestions.map(suggestion => <div key={suggestion.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div><p className="text-sm font-bold text-slate-900">{kinds[suggestion.itemKind]} · {suggestion.status}</p><p className="mt-1 text-xs text-slate-500">Document excerpt: “{suggestion.evidenceExcerpt}”</p></div>
          {suggestion.status === 'pending' && <div className="grid gap-3 md:grid-cols-2">{Object.entries(drafts[suggestion.id] || suggestion.payload).map(([key, value]) => <label key={key} className="block text-xs font-semibold text-slate-600">{labels[key] || key}
            {Array.isArray(value) ? <textarea rows={2} value={value.join('\n')} onChange={event => changeDraft(suggestion.id, key, event.target.value.split('\n').map(item => item.trim()).filter(Boolean))} className={fieldClass} /> :
              <textarea rows={key === 'description' || key === 'summary' ? 3 : 1} value={String(value ?? '')} onChange={event => changeDraft(suggestion.id, key, event.target.value)} className={fieldClass} />}
          </label>)}</div>}
          {suggestion.status === 'pending' && <div className="flex gap-3"><button type="button" disabled={busy} onClick={() => void review(suggestion, 'accept')} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-bold text-white">Accept as draft</button><button type="button" disabled={busy} onClick={() => void review(suggestion, 'reject')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">Reject</button></div>}
        </div>)}</div>}
    </div>}
  </section>;
};
