import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import API from '../api/api';
import toast from 'react-hot-toast';

const PasswordInput = ({ value, onChange, placeholder = '••••••••', required = false }: {
    value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
                placeholder={placeholder} required={required} minLength={6}
                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" />
            <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </div>
    );
};

export const ProfileView: React.FC = () => {
    const { user, setUser } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [nameLoading, setNameLoading] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpdateName = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { toast.error('Name cannot be empty'); return; }
        setNameLoading(true);
        try {
            const { data } = await API.patch('/auth/me/name', { name });
            setUser(data);
            toast.success('Name updated successfully');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update name');
        } finally { setNameLoading(false); }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { toast.error('New passwords do not match'); return; }
        setLoading(true);
        try {
            await API.patch('/auth/me/password', { oldPassword, newPassword });
            toast.success('Password changed successfully');
            setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally { setLoading(false); }
    };

    return (
        <div className="p-6 md:p-8 max-w-xl mx-auto pb-20">
            <div className="mb-6">
                <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                    <User className="w-6 h-6 text-indigo-500" /> My Profile
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">Manage your account details</p>
            </div>

            {/* Account Info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Account Info</h3>
                <div className="flex items-center gap-4 mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg flex-shrink-0">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-lg font-extrabold text-slate-900">{user?.name}</p>
                        <p className="text-sm text-slate-500">{user?.email}</p>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 mt-1 inline-block">{user?.role}</span>
                    </div>
                </div>
                <form onSubmit={handleUpdateName} className="grid grid-cols-1 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Full Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Email Address</label>
                        <input type="email" value={user?.email || ''} readOnly
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 cursor-not-allowed" />
                    </div>
                    <button type="submit" disabled={nameLoading || name.trim() === user?.name}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50">
                        {nameLoading ? 'Saving...' : 'Save Name'}
                    </button>
                </form>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-indigo-500" /> Change Password
                </h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Current Password</label>
                        <PasswordInput value={oldPassword} onChange={setOldPassword} placeholder="Enter current password" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">New Password</label>
                        <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="New password (min 6 chars)" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Confirm New Password</label>
                        <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm new password" required />
                    </div>
                    <button type="submit" disabled={loading}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50 mt-2">
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};
