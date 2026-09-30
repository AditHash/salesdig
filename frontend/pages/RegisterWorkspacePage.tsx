import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api/api';
import { SalesdigBrand } from '../components/SalesdigBrand';

export const RegisterWorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ companyName: '', name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await API.post('/workspace/register', form);
      toast.success(data.message);
      navigate(`/login?workspace=${encodeURIComponent(data.workspace.slug)}`, { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not create the workspace');
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, key: keyof typeof form, type = 'text', minLength?: number) => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <input required type={type} minLength={minLength} maxLength={key === 'companyName' ? 80 : 100}
        value={form[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
    </label>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-lg space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
        <div>
          <SalesdigBrand className="mb-4" />
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Create your company workspace</h1>
          <p className="mt-1 text-sm text-slate-500">Start with the included sales profile, then customize it for your team.</p>
        </div>
        {field('Company name', 'companyName')}
        {field('Your name', 'name')}
        {field('Work email', 'email', 'email')}
        {field('Password (at least 8 characters)', 'password', 'password', 8)}
        <button disabled={loading} className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50">
          {loading ? 'Creating workspace…' : 'Create workspace'}
        </button>
        <p className="text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="font-bold text-teal-600 hover:underline">Sign in</Link></p>
      </form>
    </div>
  );
};
