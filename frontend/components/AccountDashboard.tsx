import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/api';

export const AccountDashboard: React.FC = () => {
  const [data,setData] = useState<Record<string,number> | null>(null);
  const [error,setError] = useState(false);
  const [refresh,setRefresh] = useState(0);
  useEffect(() => {
    let active=true; setError(false);
    API.get('/targets/dashboard').then(r => { if(active) setData(r.data); }).catch(() => { if(active) setError(true); });
    return () => { active=false; };
  },[refresh]);
  const labels = {accounts:'Active accounts',researchedAccounts:'Researched accounts',activeResearch:'Research in progress',opportunities:'Latest matched opportunities',myDrafts:'My saved drafts'};
  return <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex justify-between gap-3"><h2 className="font-bold text-slate-900">Workspace sales pipeline</h2><Link to="/targets" className="text-sm font-bold text-teal-700">Open target accounts →</Link></div>
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">Could not load totals. <button onClick={() => setRefresh(v => v+1)} className="underline">Retry</button></p> : !data ? <p role="status" className="mt-3 text-sm text-slate-500">Loading account totals…</p> : <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">{Object.entries(labels).map(([key,label]) => <div key={key}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-2xl font-bold text-teal-700">{data[key]}</dd></div>)}</dl>}
    <p className="mt-3 text-xs text-slate-500">Company Settings → target account → research → evidence → offering matches → sales preparation. Totals from saved workspace records.</p>
  </section>;
};
