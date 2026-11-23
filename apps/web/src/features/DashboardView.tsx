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
} from 'lucide-react';

interface DashboardViewProps {
  overview: DashboardOverview | null;
  loading: boolean;
  onQuickAdd: () => void;
  onAddTransaction: () => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  overview,
  loading,
  onQuickAdd,
  onAddTransaction,
  onNavigateTab,
}) => {
  if (loading || !overview) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading financial telemetry...</span>
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
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Financial Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Institutional overview answering your 5 core questions immediately.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeftRight className="w-3.5 h-3.5" />}
            onClick={onAddTransaction}
          >
            Record Transfer
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={onQuickAdd}
            title="Press 'E' on your keyboard anytime to quick record an expense"
          >
            <span>Quick Record</span>
            <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono bg-blue-700/80 dark:bg-blue-800/80 text-blue-100 rounded border border-blue-500/30 font-semibold">
              E
            </kbd>
          </Button>
        </div>
      </div>

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
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-900/80 border">
                STATUS: {safe.status}
              </span>
            </div>
            <p className="text-xs opacity-90 max-w-xl">
              {safe.advisoryMessage}
            </p>
          </div>

          <div className="flex items-baseline gap-6 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-current/20">
            <div>
              <div className="text-[10px] uppercase font-medium opacity-75 tracking-wider">
                Total Safe Capital
              </div>
              <div className="text-2xl font-bold tnum">
                {formatPaise(safe.safeAmountPaise, { includeDecimals: false })}
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
          <span className="ml-auto font-medium">
            Next Payday in {safe.daysUntilSalary} days
          </span>
        </div>
      </div>

      {/* TWO COLUMN SUPPORTING DETAILS: UPCOMING OBLIGATIONS & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Commitments & Bills */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Upcoming Obligations Before Payday
              </h3>
              <p className="text-xs text-slate-500">Committed payments automatically deducted from Safe-to-Spend.</p>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {upcoming_obligations.length} items
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 mt-1">
            {upcoming_obligations.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No upcoming obligations due before your next salary.
              </div>
            ) : (
              upcoming_obligations.map((obl) => (
                <div key={obl.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {obl.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Due in {obl.daysRemaining} days • {obl.dueDate}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900 dark:text-white tnum">
                      {formatPaise(obl.amountPaise)}
                    </div>
                    {obl.categoryName && (
                      <span className="text-[10px] text-slate-400">{obl.categoryName}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Financial Transactions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Recent Transaction Activity
              </h3>
              <p className="text-xs text-slate-500">Verified double-entry ledger postings.</p>
            </div>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 mt-1">
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
                    <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                      {tx.description}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {tx.transaction_date} • {tx.account_name}
                      {tx.type === 'TRANSFER' && ` → ${tx.destination_account_name}`}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`text-xs font-semibold tnum ${
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
      <div className="p-4 bg-slate-100/70 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Total Net Worth Checkpoint
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-white tnum mt-0.5">
            {formatPaise(net_worth.net_worth_paise, { includeDecimals: false })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <span className="text-slate-500">Total Assets:</span>{' '}
            <strong className="text-emerald-600 dark:text-emerald-400 tnum">
              {formatPaise(net_worth.total_assets_paise, { includeDecimals: false })}
            </strong>
          </div>
          <div>
            <span className="text-slate-500">Total Liabilities:</span>{' '}
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
