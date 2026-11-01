/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertCircle,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  CheckSquare,
  Contact,
  Kanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Megaphone,
  MessageSquare,
  Search,
  Settings,
  Shield,
  Trash2,
  UserCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { CrmProvider, useCrm } from './context/CrmContext';
import { CrmModuleRoute, UserRole } from './types/crm';
import { LoginView } from './components/LoginView';
import { DashboardModule } from './components/DashboardModule';
import { UserManagementModule } from './components/UserManagementModule';
import {
  ContactsDirectoryView,
  LeadsManagerView,
  SalesPipelineView,
} from './components/LeadsAndImportModule';
import {
  CampaignManagerView,
  FollowUpManagerView,
  WhatsAppCenterView,
} from './components/WhatsAppAndCampaignsModule';
import {
  PartnershipManagerView,
  ProblemsAndIssuesView,
  RecycleBinView,
  ReportsAndAnalyticsView,
  SettingsAndBackupView,
  TasksAndActivitiesView,
  TeamManagementView,
} from './components/OperationsAndAdminModule';

const SIDEBAR_MODULES: {
  id: CrmModuleRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
}[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    allowedRoles: ['ADMIN', 'MANAGER', 'STAFF'],
  },
  {
    id: 'leads',
    label: 'Leads Manager',
    icon: Building2,
    allowedRoles: ['ADMIN', 'MANAGER', 'STAFF'],
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: Contact,
    allowedRoles: ['ADMIN', 'MANAGER', 'STAFF'],
  },
  {
    id: 'pipeline',
    label: 'Sales Pipeline',
    icon: Kanban,
    allowedRoles: ['ADMIN', 'MANAGER', 'STAFF'],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp Center',
    icon: MessageSquare,
    allowedRoles: ['ADMIN', 'MANAGER', 'STAFF'],
  },
  {
    id: 'campaigns',
    label: 'Campaign Manager',
    icon: Megaphone,
    allowedRoles: ['ADMIN', 'MANAGER'],
  },
  {
    id: 'followups',
    label: 'Follow-up Manager',
    icon: CalendarClock,
    allowedRoles: ['ADMIN', 'MANAGER', 'STAFF'],
  },
  {
    id: 'partnerships',
    label: 'Partnership Manager',
    icon: Briefcase,
    allowedRoles: ['ADMIN', 'MANAGER'],
  },
  {
    id: 'tasks',
    label: 'Tasks & Activities',
    icon: CheckSquare,
    allowedRoles: ['ADMIN', 'MANAGER', 'STAFF'],
  },
  {
    id: 'issues',
    label: 'Problems & Issues',
    icon: AlertCircle,
    allowedRoles: ['ADMIN', 'MANAGER', 'STAFF'],
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    icon: BarChart3,
    allowedRoles: ['ADMIN', 'MANAGER'],
  },
  {
    id: 'user_management',
    label: 'User Management',
    icon: UserCog,
    allowedRoles: ['ADMIN'],
  },
  {
    id: 'team',
    label: 'Team Overview',
    icon: Users,
    allowedRoles: ['ADMIN', 'MANAGER'],
  },
  {
    id: 'recycle',
    label: 'Recycle Bin',
    icon: Trash2,
    allowedRoles: ['ADMIN', 'MANAGER'],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    allowedRoles: ['ADMIN', 'MANAGER', 'STAFF'],
  },
];

const VALID_CRM_ROUTES = new Set<CrmModuleRoute>(
  SIDEBAR_MODULES.map((m) => m.id)
);

function parseRouteFromLocation(): CrmModuleRoute {
  if (typeof window === 'undefined') return 'dashboard';
  // Support pathname (/leads), hash (#/leads), or ?route=leads
  const params = new URLSearchParams(window.location.search);
  const queryRoute = params.get('route') as CrmModuleRoute | null;
  if (queryRoute && VALID_CRM_ROUTES.has(queryRoute)) {
    return queryRoute;
  }
  const hashClean = window.location.hash.replace(/^#\/?/, '').split('/')[0] as CrmModuleRoute;
  if (hashClean && VALID_CRM_ROUTES.has(hashClean)) {
    return hashClean;
  }
  const pathClean = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/').pop() as CrmModuleRoute;
  if (pathClean && VALID_CRM_ROUTES.has(pathClean)) {
    return pathClean;
  }
  return 'dashboard';
}

const EnterpriseCrmShell: React.FC = () => {
  const {
    currentUser,
    visibleLeads,
    deletedLeads,
    followUps,
    issues,
    notifications,
    markAllNotificationsRead,
    logout,
  } = useCrm();

  const [activeRoute, setActiveRouteState] = useState<CrmModuleRoute>(() =>
    parseRouteFromLocation()
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const setActiveRoute = useCallback((nextRoute: CrmModuleRoute) => {
    setActiveRouteState(nextRoute);
    if (typeof window !== 'undefined') {
      const targetPath = nextRoute === 'dashboard' ? '/' : `/${nextRoute}`;
      if (window.location.pathname !== targetPath) {
        try {
          window.history.pushState({ route: nextRoute }, '', targetPath);
        } catch {
          // Ignore pushState restrictions in sandboxed environments
        }
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setActiveRouteState(parseRouteFromLocation());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (!currentUser) {
    return <LoginView />;
  }

  // Filter sidebar modules strictly by the authenticated user's database role
  const allowedModules = SIDEBAR_MODULES.filter((m) =>
    m.allowedRoles.includes(currentUser.role)
  );

  // Ensure current route is allowed for the user's role
  const effectiveRoute = allowedModules.some((m) => m.id === activeRoute)
    ? activeRoute
    : 'dashboard';

  const activeModuleMeta =
    allowedModules.find((m) => m.id === effectiveRoute) || allowedModules[0];

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const globalSearchMatches = globalSearch.trim()
    ? visibleLeads
        .filter((l) => {
          const q = globalSearch.toLowerCase();
          return (
            l.showroomName.toLowerCase().includes(q) ||
            l.leadCode.toLowerCase().includes(q) ||
            l.formattedPhone.toLowerCase().includes(q) ||
            l.city.toLowerCase().includes(q)
          );
        })
        .slice(0, 5)
    : [];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Fixed Sidebar (260px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-[#0B1F3A] text-white border-r border-slate-800 shrink-0">
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold tracking-tight font-display text-white">
              ORA CRM
            </div>
            <div className="text-[11px] text-blue-200">
              By ORACLIME · Enterprise HVAC CRM
            </div>
          </div>
        </div>

        {/* Role-Scoped Module Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {allowedModules.map((mod) => {
            const Icon = mod.icon;
            const isActive = effectiveRoute === mod.id;
            const countBadge =
              mod.id === 'leads'
                ? visibleLeads.length
                : mod.id === 'followups'
                ? followUps.filter((f) => f.status !== 'Completed').length
                : mod.id === 'issues'
                ? issues.filter((i) => i.status !== 'Resolved').length
                : mod.id === 'recycle'
                ? deletedLeads.length
                : null;

            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setActiveRoute(mod.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{mod.label}</span>
                </span>
                {countBadge !== null && countBadge > 0 && (
                  <span className="font-mono text-[11px] tabular-nums opacity-85">
                    {countBadge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Signed-in User Footer */}
        <div className="p-4 border-t border-slate-800 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <div className="font-semibold text-white truncate">
                {currentUser.name}
              </div>
              <div className="text-[11px] text-blue-200 truncate">
                {currentUser.email} · {currentUser.role}
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
              title="Sign Out of ORA CRM"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 bg-[#0B1F3A] text-white flex flex-col h-full p-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="text-base font-bold font-display">ORA CRM</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-3 space-y-1 overflow-y-auto">
              {allowedModules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => {
                      setActiveRoute(mod.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
                      effectiveRoute === mod.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{mod.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <div
            className="flex-1 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Section 6: Updated SaaS Top Navigation Bar (Role Selector Dropdown Completely Removed) */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="px-6 py-3 flex items-center justify-between gap-6">
            {/* Left Zone: Breadcrumb Trail */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="text-sm font-medium text-slate-500 truncate">
                <span>ORA CRM</span>
                <span className="mx-2 text-slate-300">/</span>
                <span className="font-bold text-slate-900">
                  {activeModuleMeta.label}
                </span>
              </div>
            </div>

            {/* Center Zone: Global Search */}
            <div className="hidden md:block relative w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Global search showroom, Lead ID, mobile..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
              />
              {globalSearchMatches.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 z-40 text-xs">
                  {globalSearchMatches.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setActiveRoute('leads');
                        setGlobalSearch('');
                      }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-semibold text-slate-900 truncate">
                        {m.showroomName}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {m.leadCode}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Zone: Notifications, Logged-in User Name, Account Settings & Logout */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Notifications Bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen((prev) => !prev);
                    setProfileMenuOpen(false);
                  }}
                  className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg relative cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-1.5 right-1.5" />
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 text-xs space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="font-bold text-slate-900">
                        Notifications ({notifications.length})
                      </span>
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          className="text-[11px] text-blue-700 hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1.5">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-slate-500">
                          No new notifications.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-2 rounded-lg border ${
                              n.read
                                ? 'bg-slate-50 border-slate-100 text-slate-600'
                                : 'bg-blue-50/50 border-blue-200 text-slate-900'
                            }`}
                          >
                            <div className="font-semibold">{n.title}</div>
                            <div className="text-[11px] mt-0.5">{n.message}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Logged-in User Profile & Account Settings Menu (Read-only Role Display) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen((prev) => !prev);
                    setNotificationsOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#0B1F3A]" />
                  <span className="font-semibold text-slate-900 truncate max-w-[140px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#0B1F3A] border-l border-slate-300 pl-2">
                    {currentUser.role}
                  </span>
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 text-xs space-y-2">
                    <div className="pb-2 border-b border-slate-200">
                      <div className="font-bold text-slate-900">{currentUser.name}</div>
                      <div className="text-slate-500 truncate">{currentUser.email}</div>
                      <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B1F3A]">
                        <Shield className="w-3 h-3" />
                        <span>Assigned Database Role: {currentUser.role}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveRoute('settings');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-2 hover:bg-slate-100 rounded-lg flex items-center gap-2 font-medium text-slate-700 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>User Profile / Account Settings</span>
                    </button>

                    {currentUser.role === 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRoute('user_management');
                          setProfileMenuOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-2 hover:bg-slate-100 rounded-lg flex items-center gap-2 font-medium text-slate-700 cursor-pointer"
                      >
                        <UserCog className="w-3.5 h-3.5" />
                        <span>User Management System</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-2.5 py-2 hover:bg-red-50 rounded-lg flex items-center gap-2 font-semibold text-red-700 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Direct Logout Button */}
              <button
                type="button"
                onClick={() => logout()}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-red-700 bg-slate-100 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Active Module Viewport */}
        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto">
          {effectiveRoute === 'dashboard' && (
            <DashboardModule onNavigate={setActiveRoute} />
          )}
          {effectiveRoute === 'leads' && <LeadsManagerView />}
          {effectiveRoute === 'contacts' && <ContactsDirectoryView />}
          {effectiveRoute === 'pipeline' && <SalesPipelineView />}
          {effectiveRoute === 'whatsapp' && <WhatsAppCenterView />}
          {effectiveRoute === 'campaigns' && <CampaignManagerView />}
          {effectiveRoute === 'followups' && <FollowUpManagerView />}
          {effectiveRoute === 'partnerships' && <PartnershipManagerView />}
          {effectiveRoute === 'tasks' && <TasksAndActivitiesView />}
          {effectiveRoute === 'issues' && <ProblemsAndIssuesView />}
          {effectiveRoute === 'reports' && <ReportsAndAnalyticsView />}
          {effectiveRoute === 'user_management' && <UserManagementModule />}
          {effectiveRoute === 'team' && <TeamManagementView />}
          {effectiveRoute === 'recycle' && <RecycleBinView />}
          {effectiveRoute === 'settings' && <SettingsAndBackupView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <CrmProvider>
      <EnterpriseCrmShell />
    </CrmProvider>
  );
}
