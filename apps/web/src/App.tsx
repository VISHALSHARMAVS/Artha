import React, { useState, useEffect } from 'react';
import { api, DashboardOverview, Account, Category, AuthUser } from './lib/api.js';
import { Sidebar, NavigationTab } from './components/Sidebar.js';
import { DashboardView } from './features/DashboardView.js';
import { TransactionsView } from './features/TransactionsView.js';
import { SplitsView } from './features/SplitsView.js';
import { AccountsView } from './features/AccountsView.js';
import { BudgetsView } from './features/BudgetsView.js';
import { LoansView } from './features/LoansView.js';
import { ReportsView } from './features/ReportsView.js';
import { WhatsAppView } from './features/WhatsAppView.js';
import { LandingPageView } from './features/LandingPageView.js';
import { AuthModal } from './features/AuthModal.js';
import { QuickAddModal } from './components/QuickAddModal.js';
import { AddTransactionModal } from './components/AddTransactionModal.js';
import { OnboardingModal } from './components/OnboardingModal.js';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') || params.get('tab');
    if (viewParam === 'landing') return 'landing';
    if (viewParam && ['dashboard', 'transactions', 'splits', 'whatsapp', 'accounts', 'budgets', 'loans', 'reports'].includes(viewParam)) {
      return viewParam as NavigationTab;
    }
    const token = localStorage.getItem('artha_token');
    const visited = localStorage.getItem('artha_visited');
    if (!token && !visited) {
      return 'landing';
    }
    return 'dashboard';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('artha-theme') as 'light' | 'dark') || 'light';
  });

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dataVersion, setDataVersion] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Modals
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  // Theme synchronization
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
    } else {
      root.removeAttribute('data-theme');
      root.classList.remove('dark');
    }
    localStorage.setItem('artha-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('artha_token');
    if (!token) return;
    try {
      const u = await api.getMe();
      setUser(u);
      // Auto-open onboarding if user has not completed onboarding yet
      const hasOnboarded = localStorage.getItem(`artha_onboarded_${u.id}`);
      if (!hasOnboarded) {
        setIsOnboardingOpen(true);
      }
    } catch {
      localStorage.removeItem('artha_token');
      setUser(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('artha_token');
    setUser(null);
    refreshAllData();
  };

  const refreshAllData = async () => {
    setLoading(true);
    setOverviewError(null);
    try {
      // 12-second timeout to prevent permanent loading hang if server connection drops
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out while loading financial telemetry. Please check your network or server status.')), 12000)
      );

      const fetchDataPromise = Promise.all([
        api.getDashboardOverview(),
        api.getAccounts(),
        api.getCategories(),
      ]);

      const [ovData, accData, catData] = (await Promise.race([
        fetchDataPromise,
        timeoutPromise,
      ])) as [DashboardOverview, Account[], Category[]];

      setOverview(ovData);
      setAccounts(accData);
      setCategories(catData);
      setDataVersion((v) => v + 1);
      setOverviewError(null);
    } catch (err: any) {
      console.error('Data refresh error:', err);
      setOverviewError(err?.message || 'Unable to retrieve financial telemetry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    refreshAllData();
  }, []);

  // Keyboard shortcut: Press 'e' or 'E' anywhere to open Quick Record (Journey B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((e.key === 'e' || e.key === 'E') && !isQuickAddOpen && !isAddTxOpen && !isOnboardingOpen) {
        e.preventDefault();
        setIsQuickAddOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickAddOpen, isAddTxOpen, isOnboardingOpen]);

  if (currentTab === 'landing') {
    return (
      <LandingPageView
        onOpenApp={() => {
          localStorage.setItem('artha_visited', 'true');
          setCurrentTab('dashboard');
        }}
        onOpenWhatsApp={() => {
          localStorage.setItem('artha_visited', 'true');
          setCurrentTab('whatsapp');
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#181818] text-slate-900 dark:text-[#F9FAFB] flex flex-col lg:flex-row transition-colors duration-300 ease-out-expo">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onQuickAdd={() => setIsQuickAddOpen(true)}
        onStartOnboarding={() => setIsOnboardingOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-8 py-6 lg:py-8 max-w-7xl overflow-y-auto">
        {currentTab === 'dashboard' && (
          <DashboardView
            overview={overview}
            loading={loading}
            error={overviewError}
            onRetry={refreshAllData}
            onQuickAdd={() => setIsQuickAddOpen(true)}
            onAddTransaction={() => setIsAddTxOpen(true)}
            onNavigateTab={setCurrentTab}
            onStartOnboarding={() => setIsOnboardingOpen(true)}
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionsView
            onAddTransaction={() => setIsAddTxOpen(true)}
            accounts={accounts}
            categories={categories}
            onRefresh={refreshAllData}
            refreshTrigger={dataVersion}
          />
        )}

        {currentTab === 'splits' && (
          <SplitsView
            accounts={accounts}
            onRefresh={refreshAllData}
            onRecordSplit={() => setIsAddTxOpen(true)}
          />
        )}

        {currentTab === 'whatsapp' && (
          <WhatsAppView
            onTransactionLogged={refreshAllData}
          />
        )}

        {currentTab === 'accounts' && (
          <AccountsView
            accounts={accounts}
            onRefresh={refreshAllData}
          />
        )}

        {currentTab === 'budgets' && (
          <BudgetsView
            categories={categories}
          />
        )}

        {currentTab === 'loans' && (
          <LoansView
            accounts={accounts}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            overview={overview}
          />
        )}
      </main>

      {/* Auth Modal (Multi-User) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(u) => {
          setUser(u);
          refreshAllData();
          // Immediately show financial onboarding upon login/registration
          setIsOnboardingOpen(true);
        }}
      />

      {/* Quick Add Modal (Journey B) */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={refreshAllData}
        accounts={accounts}
        onCreateAccount={() => {
          setIsQuickAddOpen(false);
          setCurrentTab('accounts');
        }}
      />

      {/* Comprehensive Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        onSuccess={refreshAllData}
        accounts={accounts}
        categories={categories}
        onCreateAccount={() => {
          setIsAddTxOpen(false);
          setCurrentTab('accounts');
        }}
      />

      {/* Onboarding Wizard Modal (Journey A) */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        currentUser={user}
        onComplete={() => {
          refreshAllData();
          setCurrentTab('dashboard');
        }}
      />
    </div>
  );
};
