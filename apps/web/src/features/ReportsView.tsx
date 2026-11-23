import React, { useState, useEffect } from 'react';
import { api, formatPaise, DashboardOverview } from '../lib/api.js';
import { Card } from '../components/ui/Card.js';
import { CategoryIcon } from '../components/CategoryIcon.js';
import { LineChart, ArrowUpRight, ArrowDownLeft, ShieldCheck, PieChart, Layers } from 'lucide-react';

interface ReportsViewProps {
  overview: DashboardOverview | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ overview }) => {
  const [cashFlow, setCashFlow] = useState<Array<{
    monthYear: string;
    monthLabel: string;
    incomePaise: number;
    expensePaise: number;
    netSavingsPaise: number;
  }>>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Array<{
    categoryId: string;
    categoryName: string;
    iconName: string;
    colorHex: string;
    totalPaise: number;
    percentage: number;
    transactionCount?: number;
  }>>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      try {
        const [cfData, catData] = await Promise.all([
          api.getCashFlowHistory(6),
          api.getCategoryBreakdown(),
        ]);
        setCashFlow(cfData);
        setCategoryBreakdown(catData);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const netWorth = overview?.net_worth;
  const hasNetWorth = netWorth && (netWorth.total_assets_paise > 0 || netWorth.total_liabilities_paise > 0 || netWorth.net_worth_paise !== 0);
  const hasAnyCashFlow = cashFlow.some((cf) => cf.incomePaise > 0 || cf.expensePaise > 0);
  const maxFlow = Math.max(
    ...cashFlow.map((cf) => Math.max(cf.incomePaise, cf.expensePaise)),
    10000000
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Net Worth & Financial Analytics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Deterministic cash flow telemetry, asset distribution, and historical balance sheets.
        </p>
      </div>

      {/* Net Worth Hero Strip */}
      {hasNetWorth ? (
        <div className="p-6 bg-slate-900 text-white rounded-lg shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                Consolidated Institutional Net Worth
              </span>
              <div className="text-3xl font-extrabold tnum tracking-tight mt-1">
                {formatPaise(netWorth.net_worth_paise, { includeDecimals: false })}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 uppercase">Total Assets</span>
                <div className="text-base font-bold text-emerald-400 tnum">
                  +{formatPaise(netWorth.total_assets_paise, { includeDecimals: false })}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 uppercase">Total Liabilities</span>
                <div className="text-base font-bold text-red-400 tnum">
                  -{formatPaise(netWorth.total_liabilities_paise, { includeDecimals: false })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-card text-center space-y-2">
          <Layers className="w-8 h-8 mx-auto text-blue-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Consolidated Balance Sheet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Connect bank accounts, credit cards, or register investments to calculate your consolidated assets, liabilities, and true institutional net worth.
          </p>
        </div>
      )}

      {/* Real Cash Flow Inflow vs Outflow Histogram */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LineChart className="w-4 h-4 text-blue-600" />
              Cash Flow Telemetry (Last 6 Months)
            </h2>
            <p className="text-xs text-slate-500">Realized Monthly Inflow vs Outflow</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> Inflow
            </span>
            <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-sm" /> Outflow
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Calculating historical cash flow telemetry...
          </div>
        ) : !hasAnyCashFlow ? (
          <div className="py-12 text-center space-y-2">
            <LineChart className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No Cash Flow Telemetry Yet
            </div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Record salary credits, recurring bills, or daily living expenses to plot monthly inflow vs outflow trends and net savings velocity across trailing months.
            </p>
          </div>
        ) : (
          <div className="pt-4 grid grid-cols-6 gap-2 sm:gap-4 items-end h-48 border-b border-slate-200 dark:border-slate-800 pb-2">
            {cashFlow.map((cf) => {
              const incomeHeight = cf.incomePaise > 0 ? Math.max(4, (cf.incomePaise / maxFlow) * 100) : 0;
              const expenseHeight = cf.expensePaise > 0 ? Math.max(4, (cf.expensePaise / maxFlow) * 100) : 0;

              return (
                <div key={cf.monthYear} className="flex flex-col items-center h-full justify-end group">
                  <div className="flex items-end gap-1 sm:gap-2 w-full justify-center h-36">
                    {/* Inflow bar */}
                    <div
                      className="w-1/2 max-w-[20px] bg-emerald-500/90 hover:bg-emerald-600 rounded-t transition-all relative group-hover:opacity-100"
                      style={{ height: `${incomeHeight}%` }}
                      title={`Inflow: ${formatPaise(cf.incomePaise)}`}
                    />
                    {/* Outflow bar */}
                    <div
                      className="w-1/2 max-w-[20px] bg-red-500/90 hover:bg-red-600 rounded-t transition-all relative group-hover:opacity-100"
                      style={{ height: `${expenseHeight}%` }}
                      title={`Outflow: ${formatPaise(cf.expensePaise)}`}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 mt-2 truncate">
                    {cf.monthLabel}
                  </span>
                  <span className="text-[9px] text-slate-400 tnum hidden sm:block">
                    {formatPaise(cf.netSavingsPaise, { includeDecimals: false, compact: true })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Spending Breakdown */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-600" />
              Category Expenditure Distribution
            </h2>
            <p className="text-xs text-slate-500">Realized monthly spending classified by sector.</p>
          </div>
        </div>

        <div className="space-y-3">
          {categoryBreakdown.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <PieChart className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-700" />
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No Category Expenses This Month
              </div>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Categorized expenses (food, transit, utilities, etc.) will automatically generate your sector distribution profile here.
              </p>
            </div>
          ) : (
            categoryBreakdown.map((cat) => (
              <div key={cat.categoryId} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CategoryIcon
                      iconName={cat.iconName}
                      colorHex={cat.colorHex}
                      size="sm"
                    />
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {cat.categoryName}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      ({cat.transactionCount} transactions)
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white tnum mr-2">
                      {formatPaise(cat.totalPaise, { includeDecimals: false })}
                    </span>
                    <span className="text-slate-500 text-[11px] font-semibold tnum">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.colorHex || '#2563EB',
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
