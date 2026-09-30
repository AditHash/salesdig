import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnalysisView } from './components/AnalysisView';
import { LibraryView } from './components/LibraryView';
import { ServicesView } from './components/ServicesView';
import { UsersView } from './components/UsersView';
import { ProfileView } from './components/ProfileView';
import { ActivityView } from './components/ActivityView';
import { HistoryView } from './components/HistoryView';
import { HistoryDetailView } from './components/HistoryDetailView';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminAnalysesView } from './components/AdminAnalysesView';
import { AppTab, ReportData } from './types';
import {
  LayoutDashboard, BookOpen, Briefcase, Activity,
  Shield, LogOut, ChevronLeft, ChevronRight, Menu, History, Users, User, FileText
} from 'lucide-react';
import { logout } from './services/auth.service';
import { regenerateReport } from './services/analysis.service';
import { fromRunResponse } from './components/analysis/normalise';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import { SetPasswordPage } from './pages/SetPasswordPage';
import { RegisterWorkspacePage } from './pages/RegisterWorkspacePage';
import { GuestGuard } from './components/GuestGuard';
import { Toaster, toast } from 'react-hot-toast';
import { ChatPanel } from './components/ChatPanel';
import { WorkspaceSettings, WorkspaceSettingsView } from './components/WorkspaceSettingsView';
import { BrandMark, SalesdigBrand } from './components/SalesdigBrand';
import API from './api/api';

interface RegeneratingState {
  reportId: string;
  onDone: (report: ReportData) => void;
}

const NAV_ITEMS = [
  { tab: AppTab.ANALYSIS, path: '/', label: 'Analysis', icon: LayoutDashboard },
  { tab: AppTab.HISTORY, path: '/history', label: 'History', icon: History },
  { tab: AppTab.SERVICES, path: '/services', label: 'Services', icon: Briefcase },
  { tab: AppTab.LIBRARY, path: '/library', label: 'Library', icon: BookOpen },
  { tab: AppTab.PROFILE, path: '/admin/profile', label: 'My Profile', icon: User },
];

const ADMIN_ITEMS = [
  { tab: AppTab.WORKSPACE, path: '/admin/workspace', label: 'Company Settings', icon: Briefcase },
  { tab: AppTab.ACTIVITY, path: '/activity', label: 'Activity', icon: Activity },
  { tab: AppTab.ADMIN, path: '/admin/users', label: 'User Management', icon: Users },
  { tab: AppTab.ADMIN_ANALYSES, path: '/admin/analyses', label: 'All Analyses', icon: FileText },
];

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');
  const { user, setUser, loading } = useAuth();
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings | null>(null);
  const [workspaceSettingsLoaded, setWorkspaceSettingsLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setWorkspaceSettings(null);
      setWorkspaceSettingsLoaded(false);
      return;
    }
    let active = true;
    setWorkspaceSettingsLoaded(false);
    API.get<WorkspaceSettings>('/workspace/current')
      .then(({ data }) => { if (active) setWorkspaceSettings(data); })
      .catch(() => { if (active) setWorkspaceSettings(null); })
      .finally(() => { if (active) setWorkspaceSettingsLoaded(true); });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    document.title = 'Salesdig — Company Intelligence for Sales';
  }, []);

  // Analysis state lifted here so it survives tab switches
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<ReportData | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisStepIdx, setAnalysisStepIdx] = useState(0);
  const analysisStepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [analysisPrefill, setAnalysisPrefill] = useState<{ customerName: string; companyDomain: string } | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const regenerateCallbacks = useRef<Map<string, (r: ReportData) => void>>(new Map());

  const handleGlobalRegenerate = useCallback(async (reportId: string, onDone: (r: ReportData) => void) => {
    if (regeneratingId) return;
    setRegeneratingId(reportId);
    regenerateCallbacks.current.set(reportId, onDone);
    const toastId = toast.loading('Regenerating analysis…');
    try {
      const res = await regenerateReport(reportId);
      const rd = fromRunResponse(res.data);
      onDone(rd);
      toast.success('Analysis regenerated!', { id: toastId });
    } catch {
      toast.error('Regeneration failed.', { id: toastId });
    } finally {
      setRegeneratingId(null);
      regenerateCallbacks.current.delete(reportId);
    }
  }, [regeneratingId]);

  const handleRegenerate = (customerName: string, companyDomain: string) => {
    setAnalysisPrefill({ customerName, companyDomain });
    navigate('/');
  };
  const isAdmin = user?.role === 'admin';

  const getActiveTab = (pathname: string): AppTab => {
    if (pathname === '/services') return AppTab.SERVICES;
    if (pathname === '/library') return AppTab.LIBRARY;
    if (pathname === '/activity') return AppTab.ACTIVITY;
    if (pathname === '/admin/users') return AppTab.ADMIN;
    if (pathname === '/admin/analyses') return AppTab.ADMIN_ANALYSES;
    if (pathname === '/admin/workspace') return AppTab.WORKSPACE;
    if (pathname === '/admin/profile') return AppTab.PROFILE;
    if (pathname === '/history') return AppTab.HISTORY;
    return AppTab.ANALYSIS;
  };

  const activeTab = getActiveTab(location.pathname);

  const changeTab = (tab: AppTab, path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleNavigateToLibrary = (programName: string) => {
    setLibrarySearchTerm(programName);
    navigate('/library');
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<GuestGuard><LoginPage /></GuestGuard>} />
          <Route path="/register" element={<GuestGuard><RegisterWorkspacePage /></GuestGuard>} />
          <Route path="/set-password/:token" element={<SetPasswordPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </>
    );
  }

  const fundingEnabled = workspaceSettings?.enabledRecommendations.awsFunding !== false && workspaceSettings?.primaryCloudProvider === 'AWS';
  const primaryColor = workspaceSettings?.primaryColor === '#4f52d3'
    ? '#0f766e'
    : workspaceSettings?.primaryColor || '#0f766e';
  const baseNavItems = NAV_ITEMS.filter(item => item.tab !== AppTab.LIBRARY || fundingEnabled);
  const navItems = isAdmin ? [...baseNavItems, ...ADMIN_ITEMS] : baseNavItems;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center px-4 py-5 border-b border-slate-200 ${collapsed ? 'justify-center' : ''}`}>
        {collapsed
          ? <BrandMark className="h-9 w-9" />
          : <div className="min-w-0">
              <SalesdigBrand />
              <p className="ml-[52px] -mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Company intelligence</p>
            </div>
        }
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ tab, path, label, icon: Icon }) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => changeTab(tab, path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${active
                  ? 'text-white shadow-md'
                  : 'text-slate-600 hover:bg-white hover:text-teal-800'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              style={active ? { backgroundColor: primaryColor } : undefined}
              title={collapsed ? label : undefined}
            >
              <div className="relative flex-shrink-0">
                <Icon className="w-5 h-5" />
                {tab === AppTab.ANALYSIS && analysisLoading && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse border-2 border-white" />
                )}
              </div>
              {!collapsed && <span>{label}</span>}
              {!collapsed && tab === AppTab.ANALYSIS && analysisLoading && activeTab !== AppTab.ANALYSIS && (
                <span className="ml-auto text-[10px] font-bold text-teal-400 animate-pulse">Running…</span>
              )}
              {!collapsed && active && !analysisLoading && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-[#dde0f5] space-y-2">
        {!collapsed && user && (
          <div className="px-3 py-2 rounded-xl bg-white/60 border border-slate-200">
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
            <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-teal-700">
                <Shield className="w-3 h-3" /> Admin
              </span>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-red-500 hover:bg-red-50 transition-all ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Toaster position="top-right" />

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 relative
          ${collapsed ? 'w-[68px]' : 'w-60'}
        `}
        style={{ background: 'linear-gradient(160deg, #f8fafc 0%, #f0fdfa 100%)', borderRight: '1px solid #e2e8f0' }}
      >
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center text-teal-700 hover:bg-teal-700 hover:text-white transition-all z-10 shadow-md border border-teal-200"
          style={{ backgroundColor: '#f0fdfa' }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="w-60 flex flex-col h-full shadow-2xl" style={{ background: 'linear-gradient(160deg, #f8fafc 0%, #f0fdfa 100%)' }}>
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile only) */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100">
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-center leading-tight">
            <p className="text-sm font-extrabold text-slate-900">Salesdig</p>
            <p className="text-[10px] text-slate-500">Company intelligence</p>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-500">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Global regenerating banner */}
        {regeneratingId && (
          <div className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-xs font-bold flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Regenerating analysis in background — you can navigate freely…
          </div>
        )}
        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<AnalysisView
              awsFundingEnabled={fundingEnabled}
              onNavigateToLibrary={handleNavigateToLibrary}
              loading={analysisLoading} setLoading={setAnalysisLoading}
              report={analysisReport} setReport={setAnalysisReport}
              error={analysisError} setError={setAnalysisError}
              stepIdx={analysisStepIdx} setStepIdx={setAnalysisStepIdx}
              stepTimer={analysisStepTimer}
            />} />
            <Route path="/services" element={<ServicesView companyName={workspaceSettings?.companyName} services={workspaceSettings?.salesServices} showDefaultCatalog={workspaceSettings?.companyName === 'Workmates'} />} />
            <Route path="/library" element={!workspaceSettingsLoaded
              ? <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading workspace settings"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600" /></div>
              : !fundingEnabled
                ? <Navigate to="/" replace />
                : <LibraryView initialSearchTerm={librarySearchTerm} />
            } />
            <Route path="/activity" element={<ProtectedRoute adminOnly><ActivityView /></ProtectedRoute>} />
            <Route path="/history" element={<HistoryView />} />
            <Route path="/history/:id" element={<HistoryDetailView onRegenerate={handleGlobalRegenerate} regeneratingId={regeneratingId} />} />
            <Route path="/admin/users" element={<ProtectedRoute adminOnly><UsersView /></ProtectedRoute>} />
            <Route path="/admin/analyses" element={<ProtectedRoute adminOnly><AdminAnalysesView /></ProtectedRoute>} />
            <Route path="/admin/workspace" element={<ProtectedRoute adminOnly><WorkspaceSettingsView onSaved={setWorkspaceSettings} /></ProtectedRoute>} />
            <Route path="/admin/profile" element={<ProfileView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <ChatPanel primaryColor={primaryColor} />
    </div>
  );
};

export default App;
