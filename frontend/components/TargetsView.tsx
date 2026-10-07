import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search } from 'lucide-react';
import { createTarget, listTargets, type TargetAccount } from '../services/targets.service';

const errorMessage = (error: any, fallback: string) => error.response?.data?.message || fallback;

export const TargetsView: React.FC = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<TargetAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await listTargets(page, query, includeArchived);
      setAccounts(data.data); setTotal(data.total);
    } catch (caught: any) { setError(errorMessage(caught, 'Could not load target accounts.')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [page, query, includeArchived]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const { data } = await createTarget({ name: name.trim(), website: website.trim() });
      navigate(`/targets/${data.id}`);
    } catch (caught: any) { setError(errorMessage(caught, 'Could not create account.')); }
    finally { setSaving(false); }
  };

  return <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
    <div><h1 className="flex items-center gap-2 text-2xl font-black text-slate-900"><Building2 className="h-6 w-6 text-teal-600" /> Target accounts</h1>
      <p className="mt-1 text-sm text-slate-500">Keep prospects and their research together in your workspace.</p></div>
    <form onSubmit={create} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_auto] md:items-end">
      <label className="text-sm font-semibold text-slate-700">Company name<input value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={160} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-teal-500" placeholder="Example Company" /></label>
      <label className="text-sm font-semibold text-slate-700">Website or domain<input value={website} onChange={event => setWebsite(event.target.value)} required maxLength={500} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-teal-500" placeholder="example.com" /></label>
      <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? 'Creating…' : 'Create account'}</button>
    </form>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error} <button onClick={() => void load()} className="font-bold underline">Retry</button></p>}
    <div className="flex flex-wrap items-center gap-3">
      <form onSubmit={event => { event.preventDefault(); setPage(1); setQuery(search.trim()); }} className="flex max-w-sm flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search accounts" className="w-full py-2.5 text-sm outline-none" /><button className="text-sm font-bold text-teal-700">Search</button></form>
      <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={includeArchived} onChange={event => { setPage(1); setIncludeArchived(event.target.checked); }} /> Show archived</label>
    </div>
    {loading ? <p role="status" className="text-sm text-slate-500">Loading target accounts…</p> : accounts.length === 0 ?
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No target accounts found. Add a company above to begin.</div> :
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {accounts.map(account => <button key={account.id} onClick={() => navigate(`/targets/${account.id}`)} className="flex w-full items-center justify-between gap-4 border-b border-slate-100 p-4 text-left hover:bg-slate-50 last:border-0">
          <span><span className="block font-bold text-slate-900">{account.name}</span><span className="text-xs text-slate-500">{account.normalizedDomain}{account.industry ? ` · ${account.industry}` : ''}</span></span>
          <span className="text-right text-xs text-slate-500">{account.archivedAt ? 'Archived' : 'Active'}<span className="block">{account.ownerName || 'Unassigned'}</span></span>
        </button>)}
      </div>}
    <div className="flex items-center justify-between text-sm text-slate-500"><span>{total} account{total === 1 ? '' : 's'}</span><div className="flex gap-3"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">Previous</button><span>Page {page}</span><button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Next</button></div></div>
  </div>;
};
