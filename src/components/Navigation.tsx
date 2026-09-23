import React from 'react';
import {
  ShieldCheck,
  Building2,
  Database,
  Lock,
  FileText,
  Activity,
  LogOut,
  ChevronDown,
  PlusCircle,
  Server,
  Layers,
  Search,
  Cpu,
  Zap,
} from 'lucide-react';
import { UserProfile, OrganizationInfo } from '../services/api.ts';

export type ActiveTab = 'dashboard' | 'datasources' | 'graph' | 'search' | 'reasoning' | 'action' | 'rbac' | 'audit' | 'settings' | 'health';

interface NavigationProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  user: UserProfile | null;
  activeTenant: OrganizationInfo | null;
  activeRole: string;
  organizations: Array<{ tenantId: string; organizationName: string; role: string }>;
  onSwitchTenant: (tenantId: string) => void;
  onCreateOrgClick: () => void;
  onLogout: () => void;
  onQuickLoginClick: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  user,
  activeTenant,
  activeRole,
  organizations,
  onSwitchTenant,
  onCreateOrgClick,
  onLogout,
  onQuickLoginClick,
}) => {
  const [orgDropdownOpen, setOrgDropdownOpen] = React.useState(false);

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 text-zinc-200 select-none sticky top-0 z-40">
      {/* Top Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-900 text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold tracking-wider">ACTION & CLOSED-LOOP ENGINE // PHASE 6 ACTIVE</span>
          </div>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400 font-mono">TENANT ISOLATION: STRICT</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400 font-mono">AUDIT ENGINE: HMAC-SHA256 ACTIVE</span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-zinc-400 font-mono">API: /api/v1</span>
          <button
            onClick={onQuickLoginClick}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-mono cursor-pointer underline"
          >
            [Switch Persona]
          </button>
        </div>
      </div>

      {/* Main Bar */}
      <div className="flex items-center justify-between px-6 py-3">
        {/* Brand & Org Switcher */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center text-amber-400 font-mono font-bold shadow-inner">
              IB
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white uppercase font-mono">Industrial Brain</h1>
              <p className="text-[10px] text-zinc-400 tracking-wider">OPERATIONAL INTELLIGENCE LAYER</p>
            </div>
          </div>

          <div className="h-6 w-px bg-zinc-800" />

          {/* Tenant Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="flex items-center space-x-2.5 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-700 hover:border-zinc-600 text-xs transition"
            >
              <Building2 className="w-3.5 h-3.5 text-zinc-400" />
              <div className="text-left">
                <div className="font-medium text-white max-w-[160px] truncate">
                  {activeTenant ? activeTenant.name : 'Select Organization'}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  {activeTenant ? `ID: ${activeTenant.id}` : 'No active tenant'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-1" />
            </button>

            {orgDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-64 rounded bg-zinc-900 border border-zinc-700 shadow-2xl py-1 z-50">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                  Switch Tenant Organization
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {organizations.map((org) => (
                    <button
                      key={org.tenantId}
                      onClick={() => {
                        onSwitchTenant(org.tenantId);
                        setOrgDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-zinc-800 transition ${
                        activeTenant?.id === org.tenantId ? 'bg-zinc-800/80 text-amber-300 font-medium' : 'text-zinc-300'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div>{org.organizationName}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">{org.tenantId}</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-700 font-mono text-zinc-400">
                        {org.role}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-zinc-800 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setOrgDropdownOpen(false);
                      onCreateOrgClick();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-zinc-800 flex items-center space-x-2 font-medium"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Create New Organization</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition ${
              currentTab === 'dashboard'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onSelectTab('datasources')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition ${
              currentTab === 'datasources'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Data Sources</span>
          </button>

          <button
            onClick={() => onSelectTab('graph')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition ${
              currentTab === 'graph'
                ? 'bg-amber-500 text-zinc-950 font-bold border border-amber-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Knowledge Graph</span>
          </button>

          <button
            onClick={() => onSelectTab('search')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition ${
              currentTab === 'search'
                ? 'bg-cyan-500 text-zinc-950 font-bold border border-cyan-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search & Context</span>
          </button>

          <button
            onClick={() => onSelectTab('reasoning')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition ${
              currentTab === 'reasoning'
                ? 'bg-purple-600 text-white font-bold border border-purple-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Reasoning & RCA</span>
          </button>

          <button
            onClick={() => onSelectTab('action')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition ${
              currentTab === 'action'
                ? 'bg-emerald-600 text-white font-bold border border-emerald-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Action & Closed-Loop</span>
          </button>

          <button
            onClick={() => onSelectTab('rbac')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition ${
              currentTab === 'rbac'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>RBAC Matrix</span>
          </button>

          <button
            onClick={() => onSelectTab('audit')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition ${
              currentTab === 'audit'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>

          <button
            onClick={() => onSelectTab('settings')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition ${
              currentTab === 'settings'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Settings & Members</span>
          </button>

          <button
            onClick={() => onSelectTab('health')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition ${
              currentTab === 'health'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>System Health</span>
          </button>
        </nav>

        {/* User Identity & Logout */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-xs font-medium text-zinc-200">{user.fullName}</div>
                <div className="flex items-center justify-end space-x-1.5 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-700/60 font-mono text-amber-300 uppercase">
                    {activeRole}
                  </span>
                  {user.isSuperAdmin && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950/80 border border-red-700/60 font-mono text-red-300 uppercase">
                      ROOT
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Sign out"
                className="p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-red-400 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onQuickLoginClick}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded text-xs transition"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
