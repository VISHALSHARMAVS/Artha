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
} from 'lucide-react';
import { AuthUser } from '../lib/api.js';

export type NavigationTab = 'dashboard' | 'transactions' | 'accounts' | 'budgets' | 'loans' | 'reports' | 'whatsapp';

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
    { id: 'whatsapp', label: 'WhatsApp Bot', icon: <MessageSquare className="w-4 h-4 text-emerald-500" /> },
    { id: 'accounts', label: 'Accounts', icon: <Landmark className="w-4 h-4" /> },
    { id: 'budgets', label: 'Budgets', icon: <PiggyBank className="w-4 h-4" /> },
    { id: 'loans', label: 'Loans & EMI', icon: <TrendingDown className="w-4 h-4" /> },
    { id: 'reports', label: 'Net Worth & Analytics', icon: <LineChart className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 h-screen sticky top-0">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              A
            </div>
            <div>
              <span className="font-semibold tracking-tight text-slate-900 dark:text-white text-base">
                Artha
              </span>
              <span className="ml-1.5 text-[10px] uppercase font-semibold tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/50">
                PRO
              </span>
            </div>
          </div>

          <button
            onClick={onToggleTheme}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Action Button */}
        <div className="p-4">
          <button
            onClick={onQuickAdd}
            className="w-full h-10 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-all shadow-subtle focus:ring-2 focus:ring-offset-1 focus:ring-blue-600"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Record</span>
            <kbd className="ml-auto hidden xl:inline-block px-1.5 py-0.5 text-[10px] font-mono uppercase bg-slate-800 dark:bg-blue-700 text-slate-300 dark:text-blue-100 rounded">
              E
            </kbd>
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
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
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
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {user ? (
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/50 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {user.full_name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {user.email}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-md transition-colors border border-blue-200 dark:border-blue-900/60"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}

          <button
            onClick={onStartOnboarding}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Re-run Onboarding</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden flex items-center justify-between px-4 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            A
          </div>
          <span className="font-semibold text-slate-900 dark:text-white text-sm">Artha</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onQuickAdd}
            className="h-8 px-2.5 flex items-center gap-1.5 bg-blue-600 text-white rounded text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
          <button
            onClick={onOpenAuth}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            title={user ? user.full_name : 'Sign In'}
          >
            <UserIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleTheme}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around h-14 px-2">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors ${
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
