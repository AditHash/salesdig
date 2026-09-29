import React, { useState, useEffect } from 'react';
import { getUsers, createUser, blockUser, resetPassword, resendInvite } from '../services/admin.service';
import { Users, Plus, X, Ban, CheckCircle, RefreshCw, Search, Eye, EyeOff, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserData {
    _id: string; name: string; email: string; role: string;
    lastLogin?: string; createdAt: string; isBlocked?: boolean; hasPassword?: boolean;
}

const PasswordInput = ({ value, onChange, placeholder = '••••••••', required = false, minLength = 0 }: {
    value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; minLength?: number;
}) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
                placeholder={placeholder} required={required} minLength={minLength}
                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" />
            <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </div>
    );
};

const AddUserModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) => {
    const [form, setForm] = useState({ name: '', email: '', role: 'user' });
    const [loading, setLoading] = useState(false);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900">Add New User</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>
                <form onSubmit={async e => {
                    e.preventDefault(); setLoading(true);
                    try { await createUser(form); toast.success('User created — invite email sent'); onCreated(); onClose(); }
                    catch (err: any) { toast.error(err.response?.data?.message || 'Failed to create user'); }
                    finally { setLoading(false); }
                }} className="p-6 space-y-4">
                    {[['Full Name', 'text', 'name'], ['Email Address', 'email', 'email']].map(([label, type, key]) => (
                        <div key={key}>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{label}</label>
                            <input type={type} required value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" />
                        </div>
                    ))}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Role</label>
                        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <p className="text-xs text-slate-400">An invite email will be sent to the user to set their password.</p>
                    <button type="submit" disabled={loading}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50 mt-2">
                        {loading ? 'Sending invite...' : 'Send Invite'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export const UsersView: React.FC = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [confirmBlock, setConfirmBlock] = useState<UserData | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try { const res = await getUsers(); setUsers(res.data); }
        catch { toast.error('Failed to load users'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleBlock = async (u: UserData) => {
        try { await blockUser(u._id, !u.isBlocked); toast.success(`User ${u.isBlocked ? 'activated' : 'deactivated'}`); setConfirmBlock(null); fetchUsers(); }
        catch { toast.error('Failed to update status'); }
    };

    const handleReset = async (id: string, pw: string) => {
        try { await resetPassword(id, pw); toast.success('Password updated'); }
        catch { toast.error('Failed to update password'); }
    };

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto pb-20">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                        <Users className="w-6 h-6 text-indigo-500" /> User Management
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Manage platform access and user accounts</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" />
                </div>
                <button onClick={fetchUsers} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 transition-all">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all">
                    <Plus className="w-4 h-4" /> Add User
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide">User</th>
                                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Role</th>
                                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Joined</th>
                                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Last Login</th>
                                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                                <th className="px-5 py-3.5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(u => (
                                <tr key={u._id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-800">{u.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-slate-500 hidden md:table-cell">{u.email}</td>
                                    <td className="px-5 py-4">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-slate-400 text-xs hidden lg:table-cell">{fmt(u.createdAt)}</td>
                                    <td className="px-5 py-4 text-slate-400 text-xs hidden lg:table-cell">{u.lastLogin ? fmt(u.lastLogin) : '—'}</td>
                                    <td className="px-5 py-4">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${u.isBlocked ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {u.isBlocked ? 'Inactive' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2 justify-end">
                                            {!u.hasPassword && (
                                                <button onClick={async () => {
                                                    try { await resendInvite(u._id); toast.success('Invite resent'); }
                                                    catch { toast.error('Failed to resend invite'); }
                                                }} title="Resend Invite"
                                                    className="p-1.5 rounded-lg border bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100 transition-all">
                                                    <Mail className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button onClick={() => setConfirmBlock(u)} title={u.isBlocked ? 'Activate User' : 'Deactivate User'}
                                                className={`p-1.5 rounded-lg border transition-all ${u.isBlocked ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-red-50 text-red-500 border-red-100 hover:bg-red-100'}`}>
                                                {u.isBlocked ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-sm">No users found.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
            <p className="text-xs text-slate-400 mt-3">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>

            {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onCreated={fetchUsers} />}
            {confirmBlock && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-slate-900 text-lg mb-2">
                            {confirmBlock.isBlocked ? 'Activate User?' : 'Deactivate User?'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                            {confirmBlock.isBlocked
                                ? `${confirmBlock.name} will regain access to the platform.`
                                : `${confirmBlock.name} will lose access to the platform immediately.`}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmBlock(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all">Cancel</button>
                            <button
                                onClick={() => handleBlock(confirmBlock)}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${confirmBlock.isBlocked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}
                            >
                                {confirmBlock.isBlocked ? 'Yes, Activate' : 'Yes, Deactivate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
