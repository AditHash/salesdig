import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { login } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, Zap, Shield, BarChart3, BookOpen, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const API = import.meta.env.VITE_BACKEND_URL;

const FEATURES = [
  { icon: Zap, label: 'AI-Powered Research', desc: 'Build a sourced profile of each target company' },
  { icon: BarChart3, label: 'Sales Recommendations', desc: 'Find relevant services and partner products' },
  { icon: Shield, label: 'Strategic Roadmaps', desc: 'Turn account research into a clear engagement plan' },
  { icon: BookOpen, label: 'Saved Reports', desc: 'Review, share, and ask questions about account research' },
];

const LoginPage: React.FC = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [branding, setBranding] = useState({ companyName: 'Workmates', productName: 'Cloud Catalyst', tagline: 'Company research and sales intelligence', primaryColor: '#4f52d3', accentColor: '#f5a623' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    const slug = searchParams.get('workspace') || 'workmates';
    axios.get(`${API}/workspace/branding/${encodeURIComponent(slug)}`)
      .then(({ data }) => {
        setBranding(data);
        document.title = `${data.companyName} · ${data.productName}`;
      })
      .catch(() => undefined);
  }, [searchParams]);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: forgotEmail });
      setForgotSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await login({ email, password });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* LEFT PANEL */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #1e1f4b 0%, #2d2f6b 45%, #1a1c45 100%)' }}
      >
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        {/* 3D orb — top right */}
        <div className="absolute pointer-events-none" style={{
          width: 300, height: 300, borderRadius: '50%',
          top: -80, right: -80,
          background: 'radial-gradient(circle at 35% 30%, #6366f1 0%, #4f52d3 40%, #2d2f6b 70%, transparent 100%)',
          boxShadow: '0 20px 60px rgba(79,82,211,0.5), inset -10px -10px 30px rgba(0,0,0,0.4), inset 6px 6px 16px rgba(255,255,255,0.08)',
          opacity: 0.7,
        }} />

        {/* 3D orb — bottom left (yellow) */}
        <div className="absolute pointer-events-none" style={{
          width: 220, height: 220, borderRadius: '50%',
          bottom: -60, left: -60,
          background: 'radial-gradient(circle at 35% 30%, #fde047 0%, #f5c518 40%, #b8860b 80%, transparent 100%)',
          boxShadow: '0 16px 40px rgba(245,197,24,0.4), inset -8px -8px 20px rgba(0,0,0,0.3), inset 4px 4px 10px rgba(255,255,255,0.2)',
          opacity: 0.55,
        }} />

        {/* 3D orb — mid right small */}
        <div className="absolute pointer-events-none" style={{
          width: 120, height: 120, borderRadius: '50%',
          bottom: 200, right: 50,
          background: 'radial-gradient(circle at 35% 30%, #a5b4fc 0%, #6366f1 60%, transparent 100%)',
          boxShadow: '0 8px 24px rgba(99,102,241,0.4), inset -4px -4px 10px rgba(0,0,0,0.3)',
          opacity: 0.45,
        }} />

        <div />

        {/* Center */}
        <div className="relative z-10 space-y-7">

          {/* Hero glassmorphism card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 100%)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 22,
            padding: '28px 28px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.2)',
            transform: 'perspective(1000px) rotateX(1.5deg)',
          }}>
            <div className="flex items-center gap-4 mb-4">
              <img src="/logo-small.webp" alt="" className="w-14 h-14 object-contain flex-shrink-0" />
              <div>
                <p className="text-xs font-bold tracking-[0.18em] uppercase" style={{ color: '#ffffff' }}>{branding.companyName}</p>
                <h1 className="text-[26px] font-extrabold text-white leading-tight">{branding.productName}</h1>
              </div>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {branding.tagline} — research target accounts and prepare relevant sales conversations.
            </p>
          </div>

          {/* Feature rows */}
          <div className="space-y-2.5">
            {FEATURES.map(({ icon: Icon, label, desc }, i) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                padding: '11px 14px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i % 2 === 0
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.7) 0%, rgba(79,82,211,0.5) 100%)'
                    : 'linear-gradient(135deg, rgba(245,197,24,0.6) 0%, rgba(230,168,0,0.4) 100%)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs" style={{ color: 'rgba(255,255,255,0.22)' }}>
          © 2026 {branding.companyName}. All rights reserved.
        </p>
      </div>

      {/* RIGHT PANEL */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-12"
        style={{ background: 'linear-gradient(160deg, #f0f1ff 0%, #f5f0ff 50%, #fffbf0 100%)' }}
      >
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-white" style={{ backgroundColor: branding.primaryColor }}>{branding.companyName.charAt(0)}</div>
            <p className="text-sm font-bold tracking-widest uppercase" style={{ color: branding.primaryColor }}>{branding.productName}</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold" style={{ color: '#1e1f4b' }}>Welcome back</h2>
            <p className="text-sm mt-1" style={{ color: '#8486b8' }}>Sign in to your {branding.companyName} workspace</p>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid #dde0f5',
            borderRadius: 20,
            padding: 32,
            boxShadow: '0 8px 32px rgba(79,82,211,0.09), inset 0 1px 0 rgba(255,255,255,1)',
          }}>
            {forgotMode ? (
              forgotSent ? (
                <div className="text-center space-y-3">
                  <div className="text-4xl">📬</div>
                  <p className="font-bold text-slate-800">Check your inbox</p>
                  <p className="text-sm text-slate-500">If that email exists, a reset link has been sent.</p>
                  <button onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(''); }}
                    className="text-sm font-bold text-indigo-600 hover:underline mt-2">Back to login</button>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-700 mb-1">Forgot your password?</p>
                    <p className="text-xs text-slate-400 mb-4">Enter your email and we'll send a reset link.</p>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#a0a3c8' }} />
                      <input type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                        placeholder="you@workmates.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                        style={{ border: '1.5px solid #dde0f5', background: '#f7f8ff', color: '#1e1f4b' }} />
                    </div>
                  </div>
                  <button type="submit" disabled={forgotLoading}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all"
                    style={{ background: `linear-gradient(135deg, ${branding.primaryColor} 0%, #7b5ea7 100%)` }}>
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  <button type="button" onClick={() => setForgotMode(false)}
                    className="w-full text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors">
                    Back to login
                  </button>
                </form>
              )
            ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#3a3d6b' }}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#a0a3c8' }} />
                  <input
                    type="email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@workmates.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                    style={{ border: '1.5px solid #dde0f5', background: '#f7f8ff', color: '#1e1f4b' }}
                    onFocus={e => (e.currentTarget.style.borderColor = branding.primaryColor)}
                    onBlur={e => (e.currentTarget.style.borderColor = '#dde0f5')}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold" style={{ color: '#3a3d6b' }}>Password</label>
                  <button type="button" onClick={() => setForgotMode(true)}
                    className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#a0a3c8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-xl text-sm focus:outline-none transition-all"
                    style={{ border: '1.5px solid #dde0f5', background: '#f7f8ff', color: '#1e1f4b' }}
                    onFocus={e => (e.currentTarget.style.borderColor = branding.primaryColor)}
                    onBlur={e => (e.currentTarget.style.borderColor = '#dde0f5')}
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2" tabIndex={-1}>
                    {showPassword ? <EyeOff className="w-4 h-4" style={{ color: '#a0a3c8' }} /> : <Eye className="w-4 h-4" style={{ color: '#a0a3c8' }} />}
                  </button>
                </div>
              </div>

              <button
                type="submit" disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white mt-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                style={{
                  background: `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.accentColor} 100%)`,
                  boxShadow: '0 6px 20px rgba(79,82,211,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verifying...
                  </>
                ) : (
                  <>Sign In <LogIn className="w-4 h-4" /></>
                )}
              </button>
            </form>
            )}
          </div>

          <p className="text-center text-xs mt-6" style={{ color: '#a0a3c8' }}>
            <span>New here? </span><Link to="/register" className="font-bold text-indigo-600 hover:underline">Create a company workspace</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
