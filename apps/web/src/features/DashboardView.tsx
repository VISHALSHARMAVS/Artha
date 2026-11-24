import React from 'react';
import { DashboardOverview, formatPaise } from '../lib/api.js';
import { MetricCard } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { CategoryIcon } from '../components/CategoryIcon.js';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  ShieldCheck,
  Plus,
  ArrowLeftRight,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Compass,
  Hourglass,
  Clock,
  Coins,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

interface DashboardViewProps {
  overview: DashboardOverview | null;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onQuickAdd: () => void;
  onAddTransaction: () => void;
  onNavigateTab: (tab: any) => void;
  onStartOnboarding?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  overview,
  loading,
  error,
  onRetry,
  onQuickAdd,
  onAddTransaction,
  onNavigateTab,
  onStartOnboarding,
}) => {
  if (loading && !overview) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
        </div>

        {/* Status / Loading notice */}
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-lg text-xs text-blue-700 dark:text-blue-300">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Synchronizing real-time financial telemetry...</span>
        </div>

        {/* 4 Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-xl border border-slate-200 dark:border-[#313131] bg-white dark:bg-[#1F1F1F] space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-slate-200 dark:bg-[#272727] rounded" />
                <div className="w-4 h-4 bg-slate-200 dark:bg-[#272727] rounded" />
              </div>
              <div className="h-7 w-36 bg-slate-300 dark:bg-[#313131] rounded" />
              <div className="h-3 w-40 bg-slate-100 dark:bg-[#272727]/60 rounded" />
            </div>
          ))}
        </div>

        {/* Banner Skeleton */}
        <div className="h-32 rounded-xl border border-slate-200 dark:border-[#313131] bg-white dark:bg-[#1F1F1F]" />

        {/* Split Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 rounded-xl border border-slate-200 dark:border-[#313131] bg-white dark:bg-[#1F1F1F]" />
          <div className="h-72 rounded-xl border border-slate-200 dark:border-[#313131] bg-white dark:bg-[#1F1F1F]" />
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-[#1F1F1F] shadow-sm text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Telemetry Connection Error
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {error || 'Unable to retrieve live financial telemetry from your accounts.'}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          {onRetry && (
            <Button
              variant="primary"
              size="sm"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={onRetry}
            >
              Retry Telemetry Sync
            </Button>
          )}
          {onStartOnboarding && (
            <Button
              variant="outline"
              size="sm"
              icon={<Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
              onClick={onStartOnboarding}
            >
              Start Financial Setup
            </Button>
          )}
        </div>
      </div>
    );
  }

  const { answers, upcoming_obligations, recent_transactions, net_worth } = overview;
  const safe = answers.safe_to_spend;

  const getSafeStatusColor = () => {
    switch (safe.status) {
      case 'HEALTHY':
        return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60';
      case 'MODERATE':
        return 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60';
      case 'TIGHT':
        return 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60';
      case 'DEFICIT':
        return 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-200/80 dark:border-red-800/60';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="max-w-[680px]">
          <h1 className="heading-4 sm:heading-3 tracking-tight hero-heading-light dark:hero-heading-dark">
            Financial dashboard
          </h1>
          <p className="caption-1 text-slate-500 dark:text-slate-400 mt-1 max-w-[680px]">
            Institutional financial telemetry answering your five core wealth questions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onStartOnboarding && (
            <Button
              variant="outline"
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
              onClick={onStartOnboarding}
              className="border-blue-200 dark:border-[#313131] text-blue-700 dark:text-blue-300 bg-blue-50/50 hover:bg-blue-100 dark:bg-[#272727]"
              title="Configure your salary, bank balance, and monthly recurring bills"
            >
              Financial setup
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeftRight className="w-3.5 h-3.5" />}
            onClick={onAddTransaction}
          >
            Record transfer
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={onQuickAdd}
          >
            Quick record
          </Button>
        </div>
      </div>

      {/* First-time baseline onboarding prompt banner (flat surface per Rule B4) */}
      {answers.total_liquid_paise === 0 && answers.income_mtd_paise === 0 && onStartOnboarding && (
        <div className="p-4 sm:p-5 rounded-xl border border-blue-200 dark:border-[#313131] bg-blue-50/60 dark:bg-[#1F1F1F] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-lg shadow-sm shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="title-4 text-slate-900 dark:text-white">
                Set up your financial baseline
              </h3>
              <p className="caption-2 text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Configure your starting bank account, liquid balance, monthly salary, and recurring obligations in three quick steps to power Artha's five core financial questions.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={onStartOnboarding}
            className="shrink-0 whitespace-nowrap self-start sm:self-center shadow-sm"
          >
            Start financial setup
          </Button>
        </div>
      )}

      {/* CORE MANDATE 5 QUESTIONS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Question 1: How much money do I currently have? */}
        <MetricCard
          label="1. Total Liquid Balance"
          value={formatPaise(answers.total_liquid_paise, { includeDecimals: false })}
          subtitle="Available bank cash minus credit liabilities"
          icon={<Wallet className="w-4 h-4" />}
          badge={<Badge variant="neutral">Verified</Badge>}
          onClick={() => onNavigateTab('accounts')}
        />

        {/* Question 2: How much did I earn this month? */}
        <MetricCard
          label="2. Realized Inflow (MTD)"
          value={formatPaise(answers.income_mtd_paise, { includeDecimals: false, signed: true })}
          subtitle="Direct salary & consulting income"
          icon={<ArrowUpRight className="w-4 h-4 text-emerald-600" />}
          highlight="income"
          badge={<Badge variant="income">Inflow</Badge>}
        />

        {/* Question 3: How much did I spend this month? */}
        <MetricCard
          label="3. Realized Outflow (MTD)"
          value={formatPaise(answers.expense_mtd_paise, { includeDecimals: false })}
          subtitle={`Savings Rate: ${answers.savings_rate_percent}%`}
          icon={<ArrowDownLeft className="w-4 h-4 text-red-600" />}
          highlight="expense"
          badge={<Badge variant="expense">Outflow</Badge>}
          onClick={() => onNavigateTab('transactions')}
        />

        {/* Question 4 Summary: Upcoming obligations */}
        <MetricCard
          label="4. Upcoming Obligations"
          value={formatPaise(safe.upcomingObligationsTotalPaise, { includeDecimals: false })}
          subtitle={`${upcoming_obligations.length} commitments before salary`}
          icon={<Calendar className="w-4 h-4 text-amber-600" />}
          badge={<Badge variant="warning">{safe.daysUntilSalary} Days</Badge>}
        />
      </div>

      {/* Question 5 Hero Banner: How much can I safely spend? */}
      <div className={`p-5 rounded-lg border ${getSafeStatusColor()} transition-all shadow-subtle`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <h2 className="text-sm font-semibold tracking-wide uppercase">
                5. Safe-to-Spend Computation
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 dark:bg-[#1F1F1F]/80 border">
                STATUS: {safe.status}
              </span>
            </div>
            <p className="text-xs opacity-90 max-w-xl">
              {safe.advisoryMessage}
            </p>
          </div>

          <div className="flex items-baseline gap-6 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-current/20">
            <div>
              <div className="text-[10px] uppercase font-medium opacity-75 tracking-wider flex items-center gap-1">
                <span>Guilt-Free Capital</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">100% Free</span>
              </div>
              <div className="text-2xl font-bold tnum">
                {formatPaise(safe.guiltFreePaise ?? safe.safeAmountPaise, { includeDecimals: false })}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-medium opacity-75 tracking-wider">
                Safe Daily Velocity
              </div>
              <div className="text-2xl font-bold tnum text-blue-600 dark:text-blue-400">
                {formatPaise(safe.dailySafePaise, { includeDecimals: false })}
                <span className="text-xs font-normal opacity-75 ml-0.5">/day</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-current/15 flex flex-wrap items-center gap-y-2 gap-x-6 text-[11px] opacity-80">
          <span>
            Liquid Balance: <strong className="tnum">{formatPaise(answers.total_liquid_paise, { includeDecimals: false })}</strong>
          </span>
          <span>
            — Deducted Obligations: <strong className="tnum">{formatPaise(safe.upcomingObligationsTotalPaise, { includeDecimals: false })}</strong>
          </span>
          <span>
            — Emergency Reserve: <strong className="tnum">{formatPaise(safe.emergencyReserveBufferPaise, { includeDecimals: false })}</strong>
          </span>
          {safe.hourlyWagePaise && safe.hourlyWagePaise > 0 ? (
            <span className="text-blue-700 dark:text-blue-300 font-medium">
              ⚡ Life Energy: <strong>{formatPaise(safe.hourlyWagePaise, { includeDecimals: false })}/hr</strong> wage
            </span>
          ) : null}
          <span className="ml-auto font-medium">
            Next Payday in {safe.daysUntilSalary} days
          </span>
        </div>
      </div>

      {/* FINANCIAL FREEDOM SUITE (Morgan Housel, Ramit Sethi, George Clason) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Freedom Runway Gauge */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-[#313131] bg-white dark:bg-[#1F1F1F] shadow-subtle flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 title-5 text-slate-500 uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Freedom runway</span>
            </div>
            <div className="heading-5 text-slate-900 dark:text-white tnum flex items-baseline gap-1">
              <span>{safe.freedomRunwayMonths || 0}</span>
              <span className="caption-2 text-slate-500">months</span>
            </div>
            <p className="caption-5 text-slate-500 dark:text-slate-400">
              ≈ {safe.freedomRunwayDays || 0} days living without earning
            </p>
          </div>
          <div className="p-3 rounded-full bg-blue-50 dark:bg-[#272727] text-blue-600 dark:text-blue-400">
            <Hourglass className="w-5 h-5" />
          </div>
        </div>

        {/* Pay Yourself First Allocation */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-[#313131] bg-white dark:bg-[#1F1F1F] shadow-subtle flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 title-5 text-slate-500 uppercase tracking-wider">
              <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Pay yourself first</span>
            </div>
            <div className="heading-5 text-slate-900 dark:text-white tnum flex items-baseline gap-1">
              <span>{answers.savings_rate_percent}%</span>
              <span className="caption-2 text-slate-500">retained</span>
            </div>
            <p className="caption-5 text-slate-500 dark:text-slate-400">
              Net saved: {formatPaise(answers.net_savings_mtd_paise, { includeDecimals: false })} MTD
            </p>
          </div>
          <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Institutional Net Worth */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-[#313131] bg-white dark:bg-[#1F1F1F] shadow-subtle flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 title-5 text-slate-500 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Total net worth</span>
            </div>
            <div className="heading-5 text-slate-900 dark:text-white tnum">
              {formatPaise(net_worth.net_worth_paise, { includeDecimals: false })}
            </div>
            <p className="caption-5 text-slate-500 dark:text-slate-400">
              Assets: {formatPaise(net_worth.total_assets_paise, { includeDecimals: false })} · Debts: {formatPaise(net_worth.total_liabilities_paise, { includeDecimals: false })}
            </p>
          </div>
          <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TWO COLUMN SUPPORTING DETAILS: UPCOMING OBLIGATIONS & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Commitments & Bills */}
        <div className="bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#313131] rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#313131]">
            <div>
              <h3 className="title-4 text-slate-900 dark:text-white">
                Upcoming obligations before payday
              </h3>
              <p className="caption-2 text-slate-500">Committed payments automatically deducted from safe-to-spend.</p>
            </div>
            <span className="caption-4 text-slate-500">
              {upcoming_obligations.length} items
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-[#313131] mt-1">
            {upcoming_obligations.length === 0 ? (
              <div className="py-8 text-center caption-2 text-slate-400">
                No upcoming obligations due before your next salary.
              </div>
            ) : (
              upcoming_obligations.map((obl) => (
                <div key={obl.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-[#272727] text-amber-600 border border-amber-200 dark:border-[#313131] flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="title-5 text-slate-900 dark:text-white">
                        {obl.title}
                      </div>
                      <div className="caption-5 text-slate-500">
                        Due in {obl.daysRemaining} days • {obl.dueDate}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="title-4 text-slate-900 dark:text-white tnum">
                      {formatPaise(obl.amountPaise)}
                    </div>
                    {obl.categoryName && (
                      <span className="caption-5 text-slate-400">{obl.categoryName}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Financial Transactions */}
        <div className="bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#313131] rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#313131]">
            <div>
              <h3 className="title-4 text-slate-900 dark:text-white">
                Recent transaction activity
              </h3>
              <p className="caption-2 text-slate-500">Verified double-entry ledger postings.</p>
            </div>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="caption-4 font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 active:scale-[0.98] transition-all"
            >
              <span>View all</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-[#313131] mt-1">
            {recent_transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CategoryIcon
                    iconName={tx.category_icon}
                    type={tx.type}
                    colorHex={tx.category_color}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="body-6 text-slate-900 dark:text-white truncate">
                      {tx.description}
                    </div>
                    <div className="caption-5 text-slate-500">
                      {tx.transaction_date} • {tx.account_name}
                      {tx.type === 'TRANSFER' && ` → ${tx.destination_account_name}`}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`title-5 tnum ${
                      tx.type === 'INCOME'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : tx.type === 'EXPENSE'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                    {formatPaise(tx.amount_paise)}
                  </div>
                  <Badge variant={tx.type.toLowerCase() as any}>
                    {tx.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Net Worth Summary Strip */}
      <div className="p-4 bg-slate-100/70 dark:bg-[#1F1F1F] rounded-xl border border-slate-200 dark:border-[#313131] flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="caption-5 uppercase tracking-wider text-slate-500">
            Total net worth checkpoint
          </span>
          <div className="heading-6 text-slate-900 dark:text-white tnum mt-0.5">
            {formatPaise(net_worth.net_worth_paise, { includeDecimals: false })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 caption-4">
          <div>
            <span className="text-slate-500">Total assets:</span>{' '}
            <strong className="text-emerald-600 dark:text-emerald-400 tnum">
              {formatPaise(net_worth.total_assets_paise, { includeDecimals: false })}
            </strong>
          </div>
          <div>
            <span className="text-slate-500">Total liabilities:</span>{' '}
            <strong className="text-red-600 dark:text-red-400 tnum">
              {formatPaise(net_worth.total_liabilities_paise, { includeDecimals: false })}
            </strong>
          </div>
          <div>
            <span className="text-slate-500">Investments:</span>{' '}
            <strong className="text-blue-600 dark:text-blue-400 tnum">
              {formatPaise(net_worth.investments_paise, { includeDecimals: false })}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};
