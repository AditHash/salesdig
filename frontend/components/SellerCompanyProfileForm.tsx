import React, { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import API from '../api/api';

export interface SellerCompanyProfile {
  companyName: string;
  website: string;
  companyDescription: string;
  industriesServed: string[];
  idealCustomerProfile: string;
  differentiators: string[];
  onboardingStatus: 'not_started' | 'in_progress' | 'complete';
  version: number;
  updatedAt: string | null;
}

const lines = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean);
const fieldClass = 'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100';

export const SellerCompanyProfileForm: React.FC<{ onSaved: (profile: SellerCompanyProfile) => void }> = ({ onSaved }) => {
  const [profile, setProfile] = useState<SellerCompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get<SellerCompanyProfile>('/workspace/current/company-profile');
      setProfile(data);
    } catch (caught: any) {
      setError(caught.response?.data?.message || 'Could not load seller company profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const update = <K extends keyof SellerCompanyProfile>(key: K, value: SellerCompanyProfile[K]) => {
    setProfile(current => current ? { ...current, [key]: value } : current);
    setError('');
    setNotice('');
  };

  const save = async (status: 'in_progress' | 'complete') => {
    if (!profile) return;
    if (profile.companyName.trim().length < 2 || profile.companyName.length > 80) {
      setError('Company name must be 2–80 characters.'); return;
    }
    if (profile.companyDescription.length > 1000 || profile.idealCustomerProfile.length > 1000) {
      setError('Description and ideal customer profile must be at most 1,000 characters each.'); return;
    }
    if (status === 'complete' && (!profile.website.trim() || !profile.companyDescription.trim())) {
      setError('Add a website and company description before completing onboarding.'); return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await API.patch<SellerCompanyProfile>('/workspace/current/company-profile', {
        companyName: profile.companyName,
        website: profile.website,
        companyDescription: profile.companyDescription,
        industriesServed: profile.industriesServed,
        idealCustomerProfile: profile.idealCustomerProfile,
        differentiators: profile.differentiators,
        onboardingStatus: status,
        version: profile.version,
      });
      setProfile(data);
      onSaved(data);
      setNotice(status === 'complete' ? 'Company profile complete. You can edit it anytime.' : 'Draft saved.');
    } catch (caught: any) {
      setError(caught.response?.data?.message || 'Could not save seller company profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading seller company profile…</section>;
  if (!profile) return <section className="rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-700" role="alert">{error}<button type="button" onClick={() => void load()} className="ml-3 font-bold underline">Retry</button></section>;

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Seller company profile">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Seller company profile</h2>
        <p className="mt-1 text-sm text-slate-500">Describe your team for sales research. {profile.onboardingStatus === 'complete' ? 'Complete · editable anytime' : profile.onboardingStatus === 'in_progress' ? 'Draft in progress' : 'Start with the details you know; save a draft anytime.'}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">Company name
          <input value={profile.companyName} maxLength={80} onChange={event => update('companyName', event.target.value)} className={`${fieldClass} mt-1.5`} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">Website
          <input value={profile.website} maxLength={255} placeholder="https://example.com" onChange={event => update('website', event.target.value)} className={`${fieldClass} mt-1.5`} />
        </label>
        <label className="block text-sm font-semibold text-slate-700 md:col-span-2">Company description
          <textarea rows={3} value={profile.companyDescription} maxLength={1000} onChange={event => update('companyDescription', event.target.value)} className={`${fieldClass} mt-1.5`} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">Industries served <span className="font-normal text-slate-500">(one per line)</span>
          <textarea rows={4} value={profile.industriesServed.join('\n')} onChange={event => update('industriesServed', lines(event.target.value))} className={`${fieldClass} mt-1.5`} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">Differentiators <span className="font-normal text-slate-500">(one per line)</span>
          <textarea rows={4} value={profile.differentiators.join('\n')} onChange={event => update('differentiators', lines(event.target.value))} className={`${fieldClass} mt-1.5`} />
        </label>
        <label className="block text-sm font-semibold text-slate-700 md:col-span-2">Ideal customer profile
          <textarea rows={3} value={profile.idealCustomerProfile} maxLength={1000} onChange={event => update('idealCustomerProfile', event.target.value)} className={`${fieldClass} mt-1.5`} />
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-teal-700">{notice}</p>}
      <div className="flex flex-wrap gap-3">
        {profile.onboardingStatus !== 'complete' && <button type="button" disabled={saving} onClick={() => void save('in_progress')} className="inline-flex items-center gap-2 rounded-xl border border-teal-600 px-5 py-3 text-sm font-bold text-teal-700 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save draft'}</button>}
        <button type="button" disabled={saving} onClick={() => void save('complete')} className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50">{profile.onboardingStatus === 'complete' ? 'Save profile' : 'Complete profile'}</button>
      </div>
    </section>
  );
};
