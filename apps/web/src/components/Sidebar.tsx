import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Landmark,
  PiggyBank,
  TrendingDown,
  LineChart,
  Plus,
  Sun,
  Moon,
  Sparkles,
  MessageSquare,
  User as UserIcon,
  LogOut,
  Users,
} from 'lucide-react';
import { AuthUser } from '../lib/api.js';

export type NavigationTab = 'dashboard' | 'transactions' | 'splits' | 'whatsapp' | 'accounts' | 'budgets' | 'loans' | 'reports';

interface SidebarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onQuickAdd: () => void;
  onStartOnboarding: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  user?: AuthUser | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  onQuickAdd,
  onStartOnboarding,
  theme,
  onToggleTheme,
  user,
  onOpenAuth,
  onLogout,
}) => {
  const navItems: Array<{ id: NavigationTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-4 h-4" /> },
    { id: 'splits', label: 'Splits and dues', icon: <Users className="w-4 h-4 text-indigo-500" /> },
    { id: 'whatsapp', label: 'WhatsApp bot', icon: <MessageSquare className="w-4 h-4 text-emerald-500" /> },
    { id: 'accounts', label: 'Accounts', icon: <Landmark className="w-4 h-4" /> },
    { id: 'budgets', label: 'Budgets', icon: <PiggyBank className="w-4 h-4" /> },
    { id: 'loans', label: 'Loans and EMI', icon: <TrendingDown className="w-4 h-4" /> },
    { id: 'reports', label: 'Net worth and analytics', icon: <LineChart className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-[#313131] bg-white dark:bg-[#181818] shrink-0 h-screen sticky top-0 transition-colors duration-300 ease-out-expo">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200 dark:border-[#313131]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              A
            </div>
            <div>
              <span className="title-3 font-semibold tracking-tight text-slate-900 dark:text-white">
                Artha
              </span>
              <span className="ml-1.5 text-[10px] uppercase font-semibold tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/50">
                PRO
              </span>
            </div>
          </div>

          <button
            onClick={onToggleTheme}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-[#272727] active:scale-[0.98] transition-all duration-300 ease-out-expo focus-visible:ring-2 focus-visible:ring-blue-500"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="p-3 space-y-2">
          <button
            onClick={onQuickAdd}
            className="w-full py-2 px-3 button-md flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-md transition-all duration-300 ease-out-expo shadow-subtle active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
          >
            <Plus className="w-4 h-4" />
            <span>Quick record</span>
          </button>

          <button
            onClick={onStartOnboarding}
            className="w-full py-1.5 px-3 button-sm flex items-center justify-between bg-blue-50 hover:bg-blue-100 dark:bg-[#272727] dark:hover:bg-[#313131] text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-[#313131] rounded-md transition-all duration-300 ease-out-expo shadow-sm active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            title="Configure or re-run your financial setup"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Financial setup</span>
            </div>
            <span className="caption-5 px-1.5 py-0.5 rounded bg-blue-200/60 dark:bg-[#313131] text-blue-800 dark:text-blue-200 font-mono">
              Setup
            </span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 title-4 rounded-md transition-all duration-300 ease-out-expo active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isActive
                    ? 'bg-slate-100 dark:bg-[#272727] text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#272727]/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom User / Onboarding Trigger */}
        <div className="p-3 border-t border-slate-200 dark:border-[#313131] space-y-2">
          {user ? (
            <div className="p-2 rounded-md bg-slate-50 dark:bg-[#272727] border border-slate-200/70 dark:border-[#313131] flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="caption-3 text-slate-900 dark:text-white truncate">
                  {user.full_name}
                </p>
                <p className="caption-5 text-slate-500 dark:text-slate-400 truncate">
                  {user.email}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-500 active:scale-[0.98] transition-all duration-300 ease-out-expo rounded-md focus-visible:ring-2 focus-visible:ring-rose-500"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 button-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-[#272727] hover:bg-blue-100 dark:hover:bg-[#313131] rounded-md transition-all duration-300 ease-out-expo border border-blue-200 dark:border-[#313131] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign in / register</span>
            </button>
          )}

          <button
            onClick={onStartOnboarding}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 caption-4 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#272727] rounded-md active:scale-[0.98] transition-all duration-300 ease-out-expo"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Re-run onboarding</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden flex items-center justify-between px-4 h-14 bg-white/95 dark:bg-[#181818]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#313131] sticky top-0 z-40 transition-colors duration-300 ease-out-expo">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            A
          </div>
          <span className="title-4 font-semibold text-slate-900 dark:text-white">Artha</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onStartOnboarding}
            className="py-1 px-2 flex items-center gap-1 bg-blue-50 dark:bg-[#272727] text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-[#313131] rounded-md caption-4 active:scale-[0.98] transition-all duration-300 ease-out-expo"
            title="Financial setup"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Setup</span>
          </button>
          <button
            onClick={onQuickAdd}
            className="py-1 px-2.5 flex items-center gap-1.5 bg-blue-600 text-white rounded-md caption-3 shadow-sm active:scale-[0.98] transition-all duration-300 ease-out-expo"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
          <button
            onClick={onOpenAuth}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-[0.98] transition-all duration-300 ease-out-expo"
            title={user ? user.full_name : 'Sign in'}
          >
            <UserIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleTheme}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 active:scale-[0.98] transition-all duration-300 ease-out-expo"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#181818]/95 backdrop-blur-md border-t border-slate-200 dark:border-[#313131] flex items-center justify-around h-14 px-2 transition-colors duration-300 ease-out-expo">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium active:scale-[0.98] transition-all duration-300 ease-out-expo ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className="p-0.5">{item.icon}</span>
              <span className="truncate max-w-[56px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
