import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { SalesdigBrand } from '../components/SalesdigBrand';

const API = import.meta.env.VITE_BACKEND_URL;

export const SetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await axios.post(`${API}/auth/set-password/${token}`, { password });
      toast.success('Password set! Please log in.');
      const workspace = new URLSearchParams(window.location.search).get('workspace');
      navigate(workspace ? `/login?workspace=${encodeURIComponent(workspace)}` : '/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <SalesdigBrand className="mb-6" />
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-teal-100 rounded-xl"><Lock className="w-5 h-5 text-teal-600" /></div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Set Your Password</h1>
            <p className="text-xs text-slate-400">Choose a strong password for your account</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'New Password', value: password, onChange: setPassword },
            { label: 'Confirm Password', value: confirm, onChange: setConfirm },
          ].map(({ label, value, onChange }) => (
            <div key={label}>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{label}</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} required minLength={6}
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all" />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50 mt-2">
            {loading ? 'Setting password...' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
