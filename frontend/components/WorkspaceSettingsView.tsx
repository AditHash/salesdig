import React, { useEffect, useState } from 'react';
import { Building2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../api/api';
import { SellerCompanyProfileForm } from './SellerCompanyProfileForm';
import { SellerCatalogView } from './SellerCatalogView';
import { SellerDocumentsView } from './SellerDocumentsView';

export interface WorkspaceSettings {
  companyName: string;
  productName: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  companyDescription: string;
  primaryCloudProvider: string;
  salesServices: string[];
  partnerProducts: string[];
  enabledRecommendations: { awsFunding: boolean; partnerProducts: boolean };
}

const lines = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean);
const applySalesdigDefaults = (settings: WorkspaceSettings): WorkspaceSettings => ({
  ...settings,
  productName: 'Salesdig',
  primaryColor: settings.primaryColor.toLowerCase() === '#4f52d3' ? '#0f766e' : settings.primaryColor,
  accentColor: settings.accentColor.toLowerCase() === '#f5a623' ? '#14b8a6' : settings.accentColor,
});

export const WorkspaceSettingsView: React.FC<{ onSaved: (settings: WorkspaceSettings) => void }> = ({ onSaved }) => {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get<WorkspaceSettings>('/workspace/current')
      .then(({ data }) => setSettings(applySalesdigDefaults(data)))
      .catch(() => toast.error('Could not load company settings'))
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof WorkspaceSettings>(key: K, value: WorkspaceSettings[K]) => {
    setSettings(current => current ? { ...current, [key]: value } : current);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const { data } = await API.patch<WorkspaceSettings>('/workspace/current/preferences', {
        tagline: settings.tagline,
        primaryColor: settings.primaryColor,
        accentColor: settings.accentColor,
        primaryCloudProvider: settings.primaryCloudProvider,
        salesServices: settings.salesServices,
        partnerProducts: settings.partnerProducts,
        enabledRecommendations: settings.enabledRecommendations,
      });
      const brandedSettings = applySalesdigDefaults(data);
      setSettings(brandedSettings);
      onSaved(brandedSettings);
      toast.success('Company settings saved');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not save company settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading company settings…</div>;
  if (!settings) return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 pb-20 md:p-8">
      <SellerCompanyProfileForm onSaved={() => undefined} />
      <div className="rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-700" role="alert">
        Other company settings are unavailable. Reload this page to retry.
        <button type="button" className="ml-3 font-bold underline" onClick={() => window.location.reload()}>Retry</button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 pb-20 md:p-8">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
          <Building2 className="h-6 w-6 text-teal-500" /> Company Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">Customize your workspace identity and the sales context used for research.</p>
      </header>

      <SellerCompanyProfileForm onSaved={profile => {
        setSettings(current => current ? { ...current, companyName: profile.companyName, companyDescription: profile.companyDescription } : current);
        onSaved({ ...settings, companyName: profile.companyName, companyDescription: profile.companyDescription });
      }} />
      <SellerCatalogView />
      <SellerDocumentsView />
      <form onSubmit={save} className="space-y-6">
      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Tagline</span>
          <input value={settings.tagline} onChange={event => update('tagline', event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
        </label>
        <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-800">Product</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">Salesdig</p>
          <p className="mt-1 text-xs text-slate-600">Workspace settings personalize your team’s sales context while the product identity stays consistent.</p>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Primary cloud provider</span>
          <select value={settings.primaryCloudProvider} onChange={event => update('primaryCloudProvider', event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100">
            {['AWS', 'Microsoft Azure', 'Google Cloud', 'Multi-cloud', 'Other'].map(provider => <option key={provider}>{provider}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <span>Primary color</span>
          <input type="color" value={settings.primaryColor} onChange={event => update('primaryColor', event.target.value)} className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-white p-1" />
          <span className="font-mono text-xs text-slate-500">{settings.primaryColor}</span>
        </label>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <span>Accent color</span>
          <input type="color" value={settings.accentColor} onChange={event => update('accentColor', event.target.value)} className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-white p-1" />
          <span className="font-mono text-xs text-slate-500">{settings.accentColor}</span>
        </label>
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Sales services (one per line)</span>
          <textarea rows={8} value={settings.salesServices.join('\n')} onChange={event => update('salesServices', lines(event.target.value))}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
        </label>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Partner products (one per line)</span>
            <textarea rows={4} value={settings.partnerProducts.join('\n')} onChange={event => update('partnerProducts', lines(event.target.value))}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={settings.enabledRecommendations.awsFunding} onChange={event => update('enabledRecommendations', { ...settings.enabledRecommendations, awsFunding: event.target.checked })} />
            Include AWS funding recommendations
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={settings.enabledRecommendations.partnerProducts} onChange={event => update('enabledRecommendations', { ...settings.enabledRecommendations, partnerProducts: event.target.checked })} />
            Include partner product recommendations
          </label>
        </div>
      </section>

      <button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50">
        <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save company settings'}
      </button>
      </form>
    </div>
  );
};
