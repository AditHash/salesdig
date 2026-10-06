import React, { useEffect, useState } from 'react';
import API from '../api/api';

type Kind = 'offerings' | 'partners' | 'case-studies';
type Status = 'draft' | 'approved';
type CatalogItem = {
  id: string; version: number; archivedAt: string | null; reviewStatus: Status; sourceKind: string;
  name?: string; title?: string; offeringType?: string; description?: string;
  capabilities?: string[]; businessOutcomes?: string[]; relevantIndustries?: string[];
  idealCustomerProfile?: string; credentials?: string[]; clientName?: string;
  summary?: string; outcomes?: string[]; offeringId?: string | null;
};
type ListResponse = { data: CatalogItem[]; page: number; limit: number; total: number };
type Version = { version: number; snapshot: CatalogItem; createdAt: string };

const kinds: { key: Kind; label: string }[] = [
  { key: 'offerings', label: 'Offerings' },
  { key: 'partners', label: 'Partners' },
  { key: 'case-studies', label: 'Case studies' },
];
const emptyForm = (kind: Kind): CatalogItem => kind === 'offerings'
  ? { id: '', version: 0, archivedAt: null, reviewStatus: 'draft', sourceKind: 'seller_supplied', name: '', offeringType: 'service', description: '', capabilities: [], businessOutcomes: [], relevantIndustries: [], idealCustomerProfile: '' }
  : kind === 'partners'
    ? { id: '', version: 0, archivedAt: null, reviewStatus: 'draft', sourceKind: 'seller_supplied', name: '', description: '', credentials: [] }
    : { id: '', version: 0, archivedAt: null, reviewStatus: 'draft', sourceKind: 'seller_supplied', title: '', clientName: '', summary: '', outcomes: [], offeringId: null };
const lines = (text: string) => text.split('\n').map(value => value.trim()).filter(Boolean);
const fieldClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100';

export const SellerCatalogView: React.FC = () => {
  const [kind, setKind] = useState<Kind>('offerings');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<CatalogItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [offerings, setOfferings] = useState<CatalogItem[]>([]);

  const load = async (currentKind = kind, currentPage = page, archived = includeArchived) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get<ListResponse>(`/seller/${currentKind}`, { params: { page: currentPage, limit: 10, includeArchived: archived } });
      setItems(data.data);
      setTotal(data.total);
    } catch (caught: any) {
      setError(caught.response?.data?.message || 'Could not load seller catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(kind, page, includeArchived); }, [kind, page, includeArchived]);
  useEffect(() => {
    if (kind !== 'case-studies') return;
    let cancelled = false;
    const loadOfferings = async () => {
      try {
        const all: CatalogItem[] = [];
        let current = 1;
        let count = 0;
        do {
          const { data } = await API.get<ListResponse>('/seller/offerings', { params: { page: current, limit: 50, includeArchived: true } });
          all.push(...data.data);
          count = data.total;
          current += 1;
        } while (all.length < count);
        if (!cancelled) setOfferings(all);
      } catch {
        if (!cancelled) setError('Could not load offerings for case study links.');
      }
    };
    void loadOfferings();
    return () => { cancelled = true; };
  }, [kind]);

  const changeKind = (next: Kind) => { setKind(next); setPage(1); setForm(null); setVersions(null); setNotice(''); };
  const change = (key: keyof CatalogItem, value: unknown) => setForm(current => current ? { ...current, [key]: value } : null);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError('');
    const payload: Record<string, unknown> = { reviewStatus: form.reviewStatus };
    if (kind === 'offerings') Object.assign(payload, {
      name: form.name, offeringType: form.offeringType, description: form.description,
      capabilities: form.capabilities, businessOutcomes: form.businessOutcomes,
      relevantIndustries: form.relevantIndustries, idealCustomerProfile: form.idealCustomerProfile,
    });
    if (kind === 'partners') Object.assign(payload, { name: form.name, description: form.description, credentials: form.credentials });
    if (kind === 'case-studies') Object.assign(payload, {
      title: form.title, clientName: form.clientName, summary: form.summary,
      outcomes: form.outcomes, offeringId: form.offeringId || null,
    });
    try {
      if (form.id) await API.patch(`/seller/${kind}/${form.id}`, { ...payload, version: form.version });
      else await API.post(`/seller/${kind}`, payload);
      setForm(null);
      setVersions(null);
      setNotice('Catalog item saved. Seller claims remain labelled as seller supplied.');
      await load();
    } catch (caught: any) {
      setError(caught.response?.data?.message || 'Could not save catalog item.');
    } finally {
      setSaving(false);
    }
  };

  const archive = async (item: CatalogItem) => {
    setError('');
    try {
      await API.patch(`/seller/${kind}/${item.id}`, { version: item.version, archived: !item.archivedAt });
      setNotice(item.archivedAt ? 'Item restored.' : 'Item archived. Its history remains available.');
      await load();
    } catch (caught: any) {
      setError(caught.response?.data?.message || 'Could not change archive status.');
    }
  };

  const showVersions = async (item: CatalogItem) => {
    setError('');
    try {
      const { data } = await API.get<{ data: Version[] }>(`/seller/${kind}/${item.id}/versions`);
      setVersions(data.data);
    } catch (caught: any) {
      setError(caught.response?.data?.message || 'Could not load item history.');
    }
  };

  const text = (label: string, key: keyof CatalogItem, multiline = false) => (
    <label className="block text-sm font-semibold text-slate-700">{label}
      {multiline
        ? <textarea rows={3} value={String(form?.[key] ?? '')} onChange={event => change(key, event.target.value)} className={fieldClass} />
        : <input value={String(form?.[key] ?? '')} onChange={event => change(key, event.target.value)} className={fieldClass} />}
    </label>
  );
  const list = (label: string, key: keyof CatalogItem) => (
    <label className="block text-sm font-semibold text-slate-700">{label} <span className="font-normal text-slate-500">(one per line)</span>
      <textarea rows={3} value={((form?.[key] as string[]) ?? []).join('\n')} onChange={event => change(key, lines(event.target.value))} className={fieldClass} />
    </label>
  );

  return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Seller catalog">
    <div>
      <h2 className="text-lg font-bold text-slate-900">Seller catalog</h2>
      <p className="mt-1 text-sm text-slate-500">Record offerings, partner claims, and case studies. Only approved active offerings can be used for future matching.</p>
    </div>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Catalog sections">
      {kinds.map(entry => <button key={entry.key} type="button" role="tab" aria-selected={kind === entry.key} onClick={() => changeKind(entry.key)}
        className={`rounded-lg px-3 py-2 text-sm font-semibold ${kind === entry.key ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{entry.label}</button>)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={includeArchived} onChange={event => { setIncludeArchived(event.target.checked); setPage(1); }} /> Show archived</label>
      <button type="button" onClick={() => { setForm(emptyForm(kind)); setVersions(null); setError(''); }} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white">Add {kind === 'case-studies' ? 'case study' : kind === 'partners' ? 'partner' : 'offering'}</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" onClick={() => void load()} className="font-bold underline">Retry list</button></p>}
    {notice && <p role="status" className="text-sm text-teal-700">{notice}</p>}
    {loading ? <p className="text-sm text-slate-500">Loading {kind}…</p> : items.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No {kind} yet. Add seller-supplied information to start.</p> :
      <div className="space-y-2">{items.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
        <div><p className="font-semibold text-slate-900">{item.name || item.title}</p><p className="text-xs text-slate-500">{item.reviewStatus} · {item.sourceKind.replace('_', ' ')} · version {item.version}{item.archivedAt ? ' · archived' : ''}</p></div>
        <div className="flex gap-3 text-sm font-semibold text-teal-700">
          <button type="button" onClick={() => { setForm(item); setVersions(null); setError(''); }}>Edit</button>
          <button type="button" onClick={() => void showVersions(item)}>History</button>
          <button type="button" onClick={() => void archive(item)}>{item.archivedAt ? 'Restore' : 'Archive'}</button>
        </div>
      </div>)}</div>}
    <div className="flex items-center justify-between text-sm text-slate-500">
      <span>{total} item{total === 1 ? '' : 's'}</span>
      <div className="flex gap-3"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">Previous</button><span>Page {page}</span><button type="button" disabled={page * 10 >= total} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Next</button></div>
    </div>
    {versions && <div className="rounded-xl bg-slate-50 p-4 text-sm"><h3 className="font-bold text-slate-900">Saved versions</h3><ul className="mt-2 space-y-1 text-slate-600">{versions.map(entry => <li key={entry.version}>Version {entry.version} · {new Date(entry.createdAt).toLocaleString()} · {entry.snapshot.reviewStatus}</li>)}</ul></div>}
    {form && <form onSubmit={save} className="space-y-4 rounded-xl border border-teal-200 bg-teal-50/30 p-4">
      <h3 className="font-bold text-slate-900">{form.id ? 'Edit' : 'Add'} {kind === 'case-studies' ? 'case study' : kind === 'partners' ? 'partner' : 'offering'}</h3>
      {kind === 'offerings' && <div className="grid gap-4 md:grid-cols-2">
        {text('Name', 'name')}
        <label className="block text-sm font-semibold text-slate-700">Type<select value={form.offeringType} onChange={event => change('offeringType', event.target.value)} className={fieldClass}>{['product', 'service', 'consulting', 'managed_service'].map(type => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}</select></label>
        <div className="md:col-span-2">{text('Description', 'description', true)}</div>
        {list('Capabilities', 'capabilities')}{list('Business outcomes', 'businessOutcomes')}
        {list('Relevant industries', 'relevantIndustries')}{text('Ideal customer profile', 'idealCustomerProfile', true)}
      </div>}
      {kind === 'partners' && <div className="grid gap-4 md:grid-cols-2">{text('Partner name', 'name')}{text('Description', 'description', true)}{list('Credentials or relationship claims', 'credentials')}</div>}
      {kind === 'case-studies' && <div className="grid gap-4 md:grid-cols-2">
        {text('Case study title', 'title')}{text('Client name (optional)', 'clientName')}
        <div className="md:col-span-2">{text('Summary', 'summary', true)}</div>
        {list('Seller-reported outcomes', 'outcomes')}
        <label className="block text-sm font-semibold text-slate-700">Linked offering<select value={form.offeringId || ''} onChange={event => change('offeringId', event.target.value || null)} className={fieldClass}><option value="">None</option>{offerings.map(offering => <option key={offering.id} value={offering.id}>{offering.name}{offering.archivedAt ? ' (archived)' : ''}</option>)}</select></label>
      </div>}
      <label className="block text-sm font-semibold text-slate-700">Review status<select value={form.reviewStatus} onChange={event => change('reviewStatus', event.target.value)} className={fieldClass}><option value="draft">Draft</option><option value="approved">Approved</option></select></label>
      <p className="text-xs text-slate-500">Claims entered here are seller supplied. Approve only information your team has checked.</p>
      <div className="flex gap-3"><button type="submit" disabled={saving} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save item'}</button><button type="button" onClick={() => setForm(null)} className="text-sm font-semibold text-slate-600">Cancel</button></div>
    </form>}
  </section>;
};
